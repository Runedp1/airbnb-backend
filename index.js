const express = require('express');
const db = require('./config/db'); // Import database configuration

require('dotenv').config(); // Load environment variables

const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json()); // Middleware to parse JSON requests

// Basic route to test the server and database
app.get('/', (req, res) => {
    db.query('SELECT 1 + 1 AS solution', (err, results) => {
        if (err) {
            res.status(500).send('Database connection failed');
        } else {
            res.send(`Database connected! Solution: ${results[0].solution}`);
        }
    });
});

// Start the server
app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
});