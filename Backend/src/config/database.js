const mongoose = require("mongoose")
require("dotenv").config()


async function connectToDB() {

    try {
        await mongoose.connect(process.env.MONGO_URI)

        console.log("Connected to Database")
    }
    catch (err) {
        console.error("Database connection failed:", err)
        throw err
    }
}

module.exports = connectToDB