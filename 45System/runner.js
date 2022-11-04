const { spawn } = require('child_process');
const { readFileSync, writeFileSync } = require('fs');

writeFileSync(".lock", "1");

async function run () {
    console.log("[RUNNER] Starting...");

    const proc = spawn('node', ['index.js']);

    proc.stdout.on('data', data => console.log(`[STDOUT] ${data}`));
    proc.stderr.on('data', data => console.error(`[STDERR] ${data}`));
    proc.on('close', (code) => {
        console.log(`[RUNNER] Process closed with code ${code}`);
        if (readFileSync(".lock").toString() == "1")
            return console.log("[RUNNER] Logging out...");
        console.log("[RUNNER] Restarting...");
        run();
    })
}

run();