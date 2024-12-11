const mysql = require('mysql2/promise');
require('dotenv').config();

class Database {
    async connect() {
        try {
            const connection = await mysql.createConnection({
                host: process.env.db_host,
                user: process.env.db_user,
                password: process.env.db_pass,
                database: process.env.db_name,
                port: process.env.db_port  // Using port 3306
            });

            console.log('Connected to the database.');
            return connection;
        } catch (err) {
            console.error('Database connection failed:', err.message);
            process.exit(1);  // Exit if connection fails
        }
    }

    async getQuery(sql, params = []) {
        const connection = await this.connect();
        const [rows] = await connection.execute(sql, params);
        return rows;
    }
}

module.exports = Database;