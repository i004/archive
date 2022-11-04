const {spawn} = require('child_process');

async function runner() {
    console.log('[RUNNER INFO] Executing `node index.js`');
    const proc = spawn('node', ['index.js']);
    proc.stdout.on('data', (data) => {
        console.log(`[STDOUT] ${data}`);
    });
    proc.stderr.on('data', (data) => {
        console.log(`[STDERR] ${data}`);
    });
    proc.on('error', (error) => {
        console.log(`[ERROR] ${error.message}`);
    });
    proc.on("close", code => {
        console.log(`[ERROR] Process exited with code ${code}`);
        console.log(`[RUNNER INFO] Restarting...`);
        setTimeout(runner, 1000);
        delete proc;
    });
}

runner();