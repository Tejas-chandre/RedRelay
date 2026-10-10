const dns = require('node:dns');
dns.setServers(['8.8.8.8', '8.8.4.4']);
const path = require('node:path');
require('dotenv').config({ path: path.join(__dirname, '.env') });
const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const mongoose = require('mongoose');
const cors = require('cors');

const { runMILPSolver } = require('./services/milpService');
const { getLiveNetworkSnapshot } = require('./services/inventoryService');
const authRoutes = require('./routes/authRoutes');
const requestRoutes = require('./routes/requestRoutes');
const inventoryRoutes = require('./routes/inventoryRoutes');

const app = express();
app.use(cors());
app.use(express.json());
app.get('/api/health', (req, res) => {
    const databaseReady = mongoose.connection.readyState === 1;
    return res.status(databaseReady ? 200 : 503).json({
        success: databaseReady,
        status: databaseReady ? 'ready' : 'not_ready',
        database: databaseReady ? 'connected' : 'disconnected'
    });
});
app.use('/api/auth', authRoutes);
app.use('/api/requests', requestRoutes);
app.use('/api/inventory', inventoryRoutes);

const server = http.createServer(app);
const io = new Server(server, { cors: { origin: "*" } });

io.on('connection', (socket) => {
    console.log(`Node connected to telemetry stream: ${socket.id}`);

    // Listen for the simulated disaster event
    socket.on('TRAUMA_SURGE', async (surgeData) => {
        console.log(`\n[ALERT] Trauma surge detected at Node ${surgeData.hospitalId}! Requires ${surgeData.required_units} units of ${surgeData.bloodGroup} ${surgeData.componentType}.`);

        try {
            // 1. Fetch live inventory and distance matrix from MongoDB
            console.log('Fetching live network snapshot...');
            const snapshot = await getLiveNetworkSnapshot(
                surgeData.hospitalId,
                surgeData.bloodGroup,
                surgeData.componentType
            );
            const liveSupplyNodes = snapshot.supplyNodes || {};

            if (Object.keys(liveSupplyNodes).length === 0) {
                console.log('CRITICAL FAILURE: No viable supply nodes found in the network.');
                return io.emit('MANIFEST_FAILED', { error: 'Network depleted.' });
            }

            const milpPayload = {
                required_units: surgeData.required_units,
                supply_nodes: liveSupplyNodes
            };

            // 2. Trigger the Python MILP Solver
            console.log('Calculating optimal redistribution mesh...');
            const optimalManifest = await runMILPSolver(milpPayload);

            // 3. Format the Automated Transfer Manifest
            const finalManifest = {
                manifest_id: `MFT-${Date.now()}`,
                timestamp: new Date().toISOString(),
                emergency_node: surgeData.hospitalId,
                blood_group: surgeData.bloodGroup,
                component_type: surgeData.componentType,
                solver_status: optimalManifest.status,
                total_routing_cost: optimalManifest.total_cost,
                routes: optimalManifest.transfers
            };

            console.log('\n[SUCCESS] Manifest Generated:', finalManifest);

            // 4. Broadcast the manifest back to the network
            io.emit('MANIFEST_GENERATED', finalManifest);

        } catch (error) {
            console.error("Failed to generate redistribution manifest:", error.message);
        }
    });

    socket.on('disconnect', () => {
        console.log(`Node disconnected: ${socket.id}`);
    });
});

async function startServer() {
    if (!process.env.MONGODB_URI) {
        throw new Error('MONGODB_URI is required');
    }
    if (!process.env.JWT_SECRET) {
        throw new Error('JWT_SECRET is required');
    }

    const port = Number(process.env.PORT || 5000);
    if (!Number.isInteger(port) || port < 1 || port > 65535) {
        throw new Error('PORT must be a valid TCP port number');
    }

    await new Promise((resolve, reject) => {
        const onError = (error) => {
            server.off('listening', onListening);
            reject(error);
        };
        const onListening = () => {
            server.off('error', onError);
            resolve();
        };

        server.once('error', onError);
        server.once('listening', onListening);
        server.listen(port, () => {
            console.log(`BloodMesh Server running with Telemetry Stream on port ${port}`);
        });
    });

    const mongoOptions = process.env.MONGODB_DB ? { dbName: process.env.MONGODB_DB } : {};
    try {
        await mongoose.connect(process.env.MONGODB_URI, mongoOptions);
        console.log('MongoDB Connected');
    } catch (error) {
        console.error('MongoDB connection failed:', {
            name: error.name,
            message: String(error.message)
                .replace(/(mongodb(?:\+srv)?:\/\/)[^@\s]+@/gi, "$1[REDACTED]@")
        });
    }
}

startServer().catch(async (error) => {
    console.error('Backend startup failed:', {
        name: error.name,
        message: String(error.message)
            .replace(/(mongodb(?:\+srv)?:\/\/)[^@\s]+@/gi, "$1[REDACTED]@")
    });
    try {
        await mongoose.disconnect();
    } catch (disconnectError) {
        console.error('MongoDB disconnect after startup failure:', {
            name: disconnectError.name,
            message: disconnectError.message
        });
    }
    process.exitCode = 1;
});