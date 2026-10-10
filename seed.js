const dns = require("node:dns");
dns.setServers(["8.8.8.8", "8.8.4.4"]); // DNS workaround

// CRITICAL FIX: Force the script to use the backend's Mongoose instance
const mongoose = require('./backend/node_modules/mongoose');
require('dotenv').config({ path: './backend/.env' });

const User = require('./backend/models/User');
const Inventory = require('./backend/models/Inventory');

async function seedDatabase() {
    try {
        if (!process.env.MONGODB_URI) {
            throw new Error("MONGODB_URI is undefined. Check if backend/.env exists.");
        }

        await mongoose.connect(process.env.MONGODB_URI, { dbName: process.env.MONGODB_DB || "bloodmesh" });
        console.log("Connected to MongoDB. Clearing old test data...");

        await User.deleteMany({});
        await Inventory.deleteMany({});

        // 1. Create 3 Hospitals with real coordinates in Nashik
        const h1 = await User.create({
            name: "Nashik Trauma Center",
            email: "trauma@nashik.com",
            password: "password123",
            role: "hospital",
            facility: "Hospital",
            location: { type: "Point", coordinates: [73.7898, 20.0059] }
        });

        const h2 = await User.create({
            name: "Panchavati Blood Bank",
            email: "panchavati@bloodbank.com",
            password: "password123",
            role: "blood_bank",
            facility: "Blood Bank",
            location: { type: "Point", coordinates: [73.8000, 20.0200] }
        });

        const h3 = await User.create({
            name: "Ozar Medical Hub",
            email: "ozar@medical.com",
            password: "password123",
            role: "hospital",
            facility: "Hospital",
            location: { type: "Point", coordinates: [73.9300, 20.1000] }
        });

        console.log("Hospitals created!");

        // 2. Create Inventory (5-day Platelets)
        const today = new Date();
        const expiringTomorrow = new Date(today);
        expiringTomorrow.setDate(today.getDate() + 1);

        const expiringNextWeek = new Date(today);
        expiringNextWeek.setDate(today.getDate() + 7);

        await Inventory.create([
            {
                hospitalId: h2._id.toString(),
                facilityName: h2.name,
                facilityType: "bloodbank",
                bloodGroup: "O-",
                units: 20,
                componentType: "Platelets",
                expiryDate: expiringTomorrow
            },
            {
                hospitalId: h3._id.toString(),
                facilityName: h3.name,
                facilityType: "hospital",
                bloodGroup: "O-",
                units: 50,
                componentType: "Platelets",
                expiryDate: expiringNextWeek
            }
        ]);

        console.log("Inventory seeded successfully!");
        console.log(`\nIMPORTANT: Copy this ID into your simulator.js file: ${h1._id.toString()}\n`);

        process.exit(0);
    } catch (err) {
        console.error(err);
        process.exit(1);
    }
}

seedDatabase();