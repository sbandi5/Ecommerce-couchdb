const mysql = require('mysql2');
const user = require('./user');
const dotenv = require('dotenv');
dotenv.config();
class MysqlDatabase {
    static #instance = null;

    constructor() {
        if (MysqlDatabase.#instance) {
            throw new Error('Use Database.getInstance() instead of new.');
        }
        this.databaseDetails = null; // Initialize without a connection
    }

    static getInstance() {
        if (!MysqlDatabase.#instance) {
            MysqlDatabase.#instance = new MysqlDatabase();
        }
        return MysqlDatabase.#instance;
    }
    connect() {
        this.databaseDetails = mysql.createConnection({
            host: process.env.MysqlDB_Host,
            user: process.env.MysqlDB_user,
            password: process.env.MysqlDB_password,
            database: process.env.MysqlDB_database,
        });

        this.databaseDetails.connect(err => {
            if (err) {
                console.error('Database connection failed:', err);
                throw err;
            } else {
                console.log('Database connected');
            }
        });
    }

    // Method to disconnect from the database
    disconnect() {
        if (this.databaseDetails) {
            this.databaseDetails.end(err => {
                if (err) {
                    console.error('Error disconnecting from the database:', err);
                } else {
                    console.log('Database disconnected');
                }
            });
            this.databaseDetails = null;
        }
    }

    async updateNewUser(user) {
        const query = `
            INSERT INTO users (fname, lname,email, username, password, phone, aptAddress, street, city, state, areaCode, role)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?,  'user')
        `;

        const values = [
            user.Fname,
            user.Lname,
            user.Email,
            user.Username,
            user.Password,
            user.Phone,
            user.AptAddress,
            user.Street,
            user.City,
            user.State,
            user.AreaCode
        ];

        return new Promise((resolve, reject) => {
            this.databaseDetails.query(query, values, (err, results) => {
                if (err) {
                    console.error('Error updating user:', err);
                    reject(err); // Properly handle errors in async functions
                } else {
                    console.log('User updated');
                    resolve(results); // Return results on success
                }
            });
        });
    }

    async updateUser(user, username) {

        const query = `
            UPDATE users
            SET
                fname = ?,
                lname = ?,
                email = ?,
                password = ?,
                phone = ?,
                aptAddress = ?,
                street = ?,
                city = ?,
                state = ?,
                areaCode = ?
            WHERE username = ?
        `;

        const values = [
            user.Fname,
            user.Lname,
            user.Email,
            user.Password, // Ensure the password is hashed before calling this function
            user.Phone,
            user.AptAddress,
            user.Street,
            user.City,
            user.State,
            user.AreaCode,
            username // `username` is used in the `WHERE` clause
        ];

        return new Promise((resolve, reject) => {
            this.databaseDetails.query(query, values, (err, results) => {
                if (err) {
                    console.error('Error updating user:', err);
                    reject(err); // Reject with the error
                } else {
                    console.log('User updated successfully:', results);
                    resolve(results); // Resolve with the results
                }
            });
        });
    }


    async getuserDetails(email) {
        return new Promise((resolve, reject) => {
            const query = `SELECT * FROM users WHERE email = ?`;
            this.databaseDetails.query(query, [email], (err, results) => {
                if (err) {
                    reject(err);
                } else {
                    resolve(results); // `results` is an array
                }
            });
        });
    }
    async getuserDetailsbyUsername(username) {
        return new Promise((resolve, reject) => {
            const query = `SELECT fname,lname,email,username, phone, aptAddress, street, city, state, areaCode FROM users WHERE username = ?`;
            this.databaseDetails.query(query, [username], (err, results) => {
                if (err) {
                    reject(err);
                } else {
                    resolve(results); // `results` is an array
                }
            });
        });
    }
}

module.exports = MysqlDatabase;
