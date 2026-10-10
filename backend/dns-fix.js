
const dns = require("node:dns");

dns.setServers(["8.8.8.8", "8.8.4.4"]);

require("dotenv").config();

const mongoose = require("mongoose");

mongoose
    .connect(process.env.MONGODB_URI)
    .then(async () => {
        console.log("MongoDB connected successfully!");
        await mongoose.disconnect();
        console.log("Connection test completed.");
    })
    .catch((error) => {
        console.error("MongoDB connection failed:", error.message);
        process.exitCode = 1;
    });
