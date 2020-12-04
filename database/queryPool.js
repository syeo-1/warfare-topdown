// This file opens a connection pool to the database (one-time) and exports it 
// as a variable that can be called as a callback function from other files
// cant have more than 30 connections with heroku -> be careful!!
require('dotenv').config()
const Pool = require('pg').Pool
const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: process.env.REQUIRE_SSL.toLowerCase() == "true"
})

module.exports = async (text, values, cb) => {
    const client = await pool.connect()

    await client.query(text, values, (err, result) => {
        client.release()
        return cb(err, result)
    })
}