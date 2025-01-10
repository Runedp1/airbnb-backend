const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
const Database = require('./classes/db');
const bcrypt = require('bcrypt');
require('dotenv').config();

const app = express();
const db = new Database();

app.use(cors());
app.use(bodyParser.json());

// REGISTER USER
app.post('/api/users', async (req, res) => {
  const { username, email, password, phone_number, first_name, last_name, date_of_birth, role } = req.body;

  if (!username || !email || !password || !phone_number || !first_name || !last_name || !date_of_birth) {
    return res.status(400).json({ error: 'Please provide all required fields' });
  }

  try {
    const hashedPassword = bcrypt.hashSync(password, 10);
    const query = `
      INSERT INTO users (username, email, password, phone_number, first_name, last_name, date_of_birth, role)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `;
    await db.getQuery(query, [username, email, hashedPassword, phone_number, first_name, last_name, date_of_birth, role]);
    res.status(201).json({ message: 'User registered successfully' });
  } catch (error) {
    console.error('Error registering user:', error);
    res.status(500).json({ error: 'Error registering user', details: error.message });
  }
});

// LOGIN USER
app.post('/api/users/login', async (req, res) => {
  const { email, password } = req.body;

  try {
    const query = 'SELECT * FROM users WHERE email = ? AND role = "user"';
    const [user] = await db.getQuery(query, [email]);

    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(400).json({ error: 'Invalid user credentials' });
    }

    res.json({ user: { id: user.id, username: user.username, role: user.role, email: user.email } });
  } catch (error) {
    console.error('User login error:', error);
    res.status(500).json({ error: 'Error during user login' });
  }
});

// LOGIN OWNER
app.post('/api/owners/login', async (req, res) => {
  const { email, password } = req.body;

  try {
    const query = 'SELECT * FROM users WHERE email = ? AND role = "owner"';
    const [owner] = await db.getQuery(query, [email]);

    if (!owner) {
      return res.status(404).json({ error: 'Owner not found' });
    }

    const isMatch = await bcrypt.compare(password, owner.password);
    if (!isMatch) {
      return res.status(400).json({ error: 'Invalid owner credentials' });
    }

    res.json({ owner: { id: owner.id, username: owner.username, role: owner.role, email: owner.email } });
  } catch (error) {
    console.error('Owner login error:', error);
    res.status(500).json({ error: 'Error during owner login' });
  }
});

app.post('/api/owners', async (req, res) => {
  const { username, email, password, phone_number, first_name, last_name, date_of_birth } = req.body;

  if (!username || !email || !password || !phone_number || !first_name || !last_name || !date_of_birth) {
    return res.status(400).json({ error: 'Please provide all required fields' });
  }

  try {
    const hashedPassword = bcrypt.hashSync(password, 10);
    const query = `
      INSERT INTO users (username, email, password, phone_number, first_name, last_name, date_of_birth, role)
      VALUES (?, ?, ?, ?, ?, ?, ?, 'owner')
    `;
    await db.getQuery(query, [username, email, hashedPassword, phone_number, first_name, last_name, date_of_birth]);
    res.status(201).json({ message: 'Owner registered successfully' });
  } catch (error) {
    console.error('Error registering owner:', error);
    res.status(500).json({ error: 'Error registering owner', details: error.message });
  }
});



// FETCH ALL CAMPING SPOTS
app.get('/api/campingspots', async (req, res) => {
  const query = `
    SELECT campingspots.*, users.first_name AS owner_name, users.email AS owner_email
    FROM campingspots
    LEFT JOIN users ON campingspots.owner_id = users.id;
  `;
  try {
    const result = await db.getQuery(query);
    res.json(result);
  } catch (error) {
    res.status(500).json({ error: 'Error fetching camping spots', details: error.message });
  }
});

// FETCH CAMPING SPOT BY ID
app.get('/api/campingspots/:spotId', async (req, res) => {
  const { spotId } = req.params;
  try {
    const query = `
      SELECT campingspots.*, users.first_name AS owner_name, users.email AS owner_email
      FROM campingspots
      LEFT JOIN users ON campingspots.owner_id = users.id
      WHERE campingspots.id = ?;
    `;
    const result = await db.getQuery(query, [spotId]);
    if (result.length === 0) return res.status(404).json({ error: 'Camping spot not found' });
    res.json(result[0]);
  } catch (error) {
    res.status(500).json({ error: 'Error fetching camping spot', details: error.message });
  }
});

// FETCH BOOKED DATES
// Ensure dates are valid in backend before sending
app.get('/api/booked-dates/:spotId', async (req, res) => {
    const spotId = req.params.spotId;
    try {
      const query = `SELECT start_date, end_date FROM bookings WHERE camping_spot_id = ?`;
      const bookedDates = await db.getQuery(query, [spotId]);
  
      // Validate and format dates
      const validDates = bookedDates
        .filter(booking => booking.start_date && booking.end_date) // Ensure both dates exist
        .map(booking => ({
          start: new Date(booking.start_date).toISOString().split("T")[0],
          end: new Date(booking.end_date).toISOString().split("T")[0],
        }));
  
      res.status(200).json(validDates);
    } catch (error) {
      console.error("Error fetching booked dates:", error);
      res.status(500).json({ error: "Failed to fetch booked dates", details: error.message });
    }
  });

// CREATE BOOKING
app.post('/api/bookings', async (req, res) => {
  const { user_id, camping_spot_id, start_date, end_date, status } = req.body;
  try {
    const checkQuery = `
      SELECT * FROM bookings WHERE camping_spot_id = ? 
      AND ((start_date BETWEEN ? AND ?) OR (end_date BETWEEN ? AND ?))
    `;
    const conflicts = await db.getQuery(checkQuery, [camping_spot_id, start_date, end_date, start_date, end_date]);
    if (conflicts.length > 0) return res.status(400).json({ error: 'Selected dates are already booked' });

    const insertQuery = `INSERT INTO bookings (user_id, camping_spot_id, start_date, end_date, status) VALUES (?, ?, ?, ?, ?)`;
    await db.getQuery(insertQuery, [user_id, camping_spot_id, start_date, end_date, status]);
    res.status(201).json({ message: 'Booking created successfully' });
  } catch (error) {
    res.status(500).json({ error: 'Error creating booking', details: error.message });
  }
});
// FETCH ALL BOOKINGS FOR A SPECIFIC USER
app.get('/api/bookings/:userId', async (req, res) => {
    const { userId } = req.params;
  
    try {
      const query = `
        SELECT bookings.id, campingspots.name AS spot_name, campingspots.location, 
               bookings.start_date, bookings.end_date, bookings.status
        FROM bookings
        INNER JOIN campingspots ON bookings.camping_spot_id = campingspots.id
        WHERE bookings.user_id = ?
        ORDER BY bookings.start_date DESC
      `;
      const userBookings = await db.getQuery(query, [userId]);
      res.json(userBookings);
    } catch (error) {
      console.error("Error fetching user bookings:", error);
      res.status(500).json({ error: "Failed to fetch user bookings" });
    }
  });
  app.get('/api/my-bookings/:userId', async (req, res) => {
    const { userId } = req.params;
  
    try {
      const query = `
        SELECT bookings.id, bookings.start_date, bookings.end_date, bookings.status,
               campingspots.name, campingspots.location
        FROM bookings
        INNER JOIN campingspots ON bookings.camping_spot_id = campingspots.id
        WHERE bookings.user_id = ?;
      `;
      const userBookings = await db.getQuery(query, [userId]);
      res.status(200).json(userBookings);
    } catch (error) {
      console.error("Error fetching user bookings:", error);
      res.status(500).json({ error: "Failed to fetch bookings", details: error.message });
    }
  });
  app.get('/api/user-info/:userId', async (req, res) => {
    const { userId } = req.params;
  
    try {
      const query = `
        SELECT id, username, first_name, last_name, email, phone_number 
        FROM users 
        WHERE id = ?
      `;
      const [user] = await db.getQuery(query, [userId]);
  
      if (!user) {
        return res.status(404).json({ error: 'User not found' });
      }
  
      res.status(200).json(user);
    } catch (error) {
      console.error('Error fetching user info:', error);
      res.status(500).json({ error: 'Error fetching user info' });
    }
  });
  app.put('/api/user-info/:userId', async (req, res) => {
    const { userId } = req.params;
    const { username, first_name, last_name, email, phone_number } = req.body;
  
    if (!username || !first_name || !last_name || !email || !phone_number) {
      return res.status(400).json({ error: 'Vul alle velden in.' });
    }
  
    try {
      const query = `
        UPDATE users 
        SET username = ?, first_name = ?, last_name = ?, email = ?, phone_number = ?
        WHERE id = ?
      `;
      const result = await db.getQuery(query, [username, first_name, last_name, email, phone_number, userId]);
  
      if (result.affectedRows === 0) {
        return res.status(404).json({ error: 'Gebruiker niet gevonden.' });
      }
  
      res.status(200).json({ message: 'Gegevens succesvol bijgewerkt.' });
    } catch (error) {
      console.error('Error updating user info:', error);
      res.status(500).json({ error: 'Kon de gegevens niet bijwerken.', details: error.message });
    }
  });
  app.get('/api/owner/campingspots/:ownerId', async (req, res) => {
    const { ownerId } = req.params;
  
    try {
      const query = `SELECT * FROM campingspots WHERE owner_id = ?`;
      const spots = await db.getQuery(query, [ownerId]);
  
      res.status(200).json(spots);
    } catch (error) {
      console.error("Error fetching owner's campingspots:", error);
      res.status(500).json({ error: 'Failed to fetch camping spots' });
    }
  });
  
  // CREATE NEW CAMPING SPOT
  app.post('/api/owner/campingspots', async (req, res) => {
    const { owner_id, name, description, location, price_per_night, facilities, type, province } = req.body;
  
    if (!owner_id || !name || !location || !price_per_night || !type || !province) {
      return res.status(400).json({ error: 'Missing required fields' });
    }
  
    try {
      const query = `
        INSERT INTO campingspots (owner_id, name, description, location, price_per_night, facilities, type, province)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?)
      `;
      await db.getQuery(query, [owner_id, name, description, location, price_per_night, facilities, type, province]);
      res.status(201).json({ message: 'Camping spot created successfully' });
    } catch (error) {
      console.error('Error creating camping spot:', error);
      res.status(500).json({ error: 'Failed to create camping spot', details: error.message });
    }
  });
  app.get('/api/owner/campingspots/:ownerId', async (req, res) => {
    const { ownerId } = req.params;
  
    try {
      const query = `
        SELECT * FROM campingspots
        WHERE owner_id = ?;
      `;
      const result = await db.getQuery(query, [ownerId]);
  
      res.status(200).json(result);
    } catch (error) {
      console.error('Error fetching owner campingspots:', error);
      res.status(500).json({ error: 'Error fetching campingspots', details: error.message });
    }
  });

  
  
// START SERVER
const PORT = process.env.PORT || 3002;
app.listen(PORT, () => {
  console.log(`Backend running on http://localhost:${PORT}`);
});
