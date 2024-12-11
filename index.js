const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
const Database = require('./classes/db');
const bcrypt = require('bcrypt'); // Import bcrypt for password hashing


const app = express();
const PORT = process.env.PORT || 3002; 

app.use(cors());
app.use(bodyParser.json());

// Test endpoint to check database connection
app.get('/api/test-db', async (req, res) => {
    try {
        const db = new Database();
        const results = await db.getQuery('SELECT 1 + 1 AS solution');
        res.status(200).json({ message: 'Database connected!', result: results[0].solution });
    } catch (error) {
        console.error('Database connection error:', error.message);
        res.status(500).json({ error: 'Failed to connect to the database' });
    }
});
app.get('/api/campingspots', async (req, res) => {
    try {
        const db = new Database();
        const campingspots = await db.getQuery('SELECT * FROM campingspots');
        res.status(200).json(campingspots);
    } catch (error) {
        console.error('Error fetching camping spots:', error.message);
        res.status(500).json({ error: 'Failed to fetch camping spots' });
    }
});
app.get('/api/campingspots/filter', async (req, res) => {
    const { location, maxPrice, facilities } = req.query;
    let query = 'SELECT * FROM campingspots WHERE 1=1';
    const params = [];

    if (location) {
        query += ' AND location = ?';
        params.push(location);
    }
    if (maxPrice) {
        query += ' AND price_per_night <= ?';
        params.push(maxPrice);
    }
    if (facilities) {
        query += ' AND facilities LIKE ?';
        params.push(`%${facilities}%`);
    }

    try {
        const db = new Database();
        const results = await db.getQuery(query, params);
        res.status(200).json(results);
    } catch (error) {
        console.error('Error filtering camping spots:', error.message);
        res.status(500).json({ error: 'Failed to filter camping spots' });
    }
});
app.post('/api/users', async (req, res) => {
    const { username, email, password, phone_number, first_name, last_name, date_of_birth, role } = req.body;
    
    // Add validation if needed
    if (!username || !email || !password || !phone_number || !first_name || !last_name || !date_of_birth) {
      return res.status(400).json({ error: 'Please provide all fields' });
    }
  
    try {
      // Create the user
      const hashedPassword = bcrypt.hashSync(password, 10);
      const query = `
        INSERT INTO users (username, email, password, phone_number, first_name, last_name, date_of_birth, role)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?)
      `;
      await db.getQuery(query, [username, email, hashedPassword, phone_number, first_name, last_name, date_of_birth, role]);
      res.status(201).json({ message: 'User registered successfully' });
    } catch (error) {
      console.error(error);
      res.status(500).json({ error: 'Error registering user' });
    }
  });
// Default root route
app.get('/', (req, res) => {
    res.send('Hello from AirBnB for Campers Backend!');
});

app.listen(PORT, () => {
    console.log(`Server running on http://localhost:${PORT}`);
});


