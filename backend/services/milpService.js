const { spawn } = require('child_process');
const path = require('path');

/**
 * Executes the Python MILP Solver (solver.py) using PuLP.
 * Feeds emergency demand JSON into stdin and parses optimal redistribution manifest from stdout.
 * 
 * @param {Object} emergencyDemand - { required_units: Number, supply_nodes: { [node_id]: { available_inventory, distance_km } } }
 * @returns {Promise<Object>} - Solver result manifest
 */
async function runMILPSolver(emergencyDemand) {
    return new Promise((resolve, reject) => {
        const scriptPath = path.join(__dirname, '../optimizer/solver.py');
        const pythonCmd = process.env.PYTHON_CMD || (process.platform === 'win32' ? 'py' : 'python3');

        const pythonProcess = spawn(pythonCmd, [scriptPath]);

        let outputData = '';
        let errorData = '';

        pythonProcess.stdout.on('data', (data) => {
            outputData += data.toString();
        });

        pythonProcess.stderr.on('data', (data) => {
            errorData += data.toString();
        });

        pythonProcess.on('error', (err) => {
            // If primary command failed, attempt fallback to 'python'
            if (pythonCmd === 'py') {
                const fallbackProcess = spawn('python', [scriptPath]);
                let fbOutput = '';
                let fbError = '';
                fallbackProcess.stdout.on('data', (d) => { fbOutput += d.toString(); });
                fallbackProcess.stderr.on('data', (d) => { fbError += d.toString(); });
                fallbackProcess.on('close', (code) => {
                    if (code !== 0) return reject(new Error(`Fallback python failed: ${fbError}`));
                    try { resolve(JSON.parse(fbOutput.trim())); } catch (e) { reject(new Error('Failed to parse Python output')); }
                });
                fallbackProcess.on('error', () => reject(new Error(`Cannot spawn Python solver: ${err.message}`)));
                fallbackProcess.stdin.write(JSON.stringify(emergencyDemand));
                fallbackProcess.stdin.end();
                return;
            }
            reject(new Error(`Failed to start Python solver process: ${err.message}`));
        });

        pythonProcess.on('close', (code) => {
            if (code !== 0) {
                // If the python script exited with error, check if stdout has error JSON
                try {
                    const parsed = JSON.parse(outputData.trim());
                    return resolve(parsed);
                } catch {
                    return reject(new Error(`Python script exited with code ${code}: ${errorData || outputData}`));
                }
            }

            try {
                const trimmed = outputData.trim();
                const result = JSON.parse(trimmed);
                resolve(result);
            } catch (err) {
                console.error("Solver output parse error. Raw stdout:", outputData, "stderr:", errorData);
                reject(new Error(`Failed to parse Python solver output: ${err.message}`));
            }
        });

        // Send the JSON payload to Python standard input
        try {
            pythonProcess.stdin.write(JSON.stringify(emergencyDemand));
            pythonProcess.stdin.end();
        } catch (writeErr) {
            reject(new Error(`Failed to write payload to Python stdin: ${writeErr.message}`));
        }
    });
}

module.exports = { runMILPSolver };