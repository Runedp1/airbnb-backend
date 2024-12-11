const express = require('express');
const router = express.Router();
const db = require('../classes/db');  // Import database connection

// Get all users
router.get('/', (req, res) => {
    db.query('SELECT id, username, email, role, created_at FROM Users', (err, results) => {
        if (err) {
            return res.status(500).json({ error: 'Failed to fetch users' });
        }
        res.json(results);
    });
});

// Create a new user
router.post('/', (req, res) => {
    const { username, email, password, role } = req.body;
    db.query(
        'INSERT INTO Users (username, email, password, role) VALUES (?, ?, ?, ?)',
        [username, email, password, role || 'user'],
        (err, results) => {
            if (err) {
                return res.status(500).json({ error: 'Failed to create user' });
            }
            res.status(201).json({ message: 'User created', userId: results.insertId });
        }
    );
});
