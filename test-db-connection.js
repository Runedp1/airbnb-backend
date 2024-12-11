const Database = require('./classes/db');  // Import Database class

const db = new Database();  // Create a Database instance

async function testConnection() {
    try {
        const rows = await db.getQuery('SELECT 1 + 1 AS solution'); // Simple test query
        console.log('Test query result:', rows);  // Should return [{solution: 2}]
    } catch (error) {
        console.error('Error connecting to the database:', error.message);
    }
}

testConnection();