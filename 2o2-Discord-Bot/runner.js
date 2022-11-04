const { spawn } = require('child_process');
const discord = require('discord.js');
const webhook = new discord.WebhookClient({ url: 'https://discord.com/api/webhooks/968715589246455848/n3V3Rg0NnAG1v3Y0uuPnEVeRg0nnal3ty0udOwNneV3Rg0NNarUnAR0un' })
require('colors');

function process (...cmd) {
    const proc = spawn(...cmd);
    let last_stderr;

    proc.stdout.on('data', (data) => {
        console.log(data.toString().trim());
    });

    proc.stderr.on('data', (data) => {
        console.log(data.toString().trim());
        last_stderr = data.toString();
    });

    proc.on('close', (code) => {
        webhook.send({
            content: `Process closed with exit code \`${code}\`\n${code ? "Restarting" : ""}`,
            files: [{
                attachment: Buffer.from(last_stderr || "[no stderr]"),
                name: 'last_stderr.ansi'
            }]
        });

        const time = (t => `${t.getHours().toString().padStart(2, '0')}:${t.getMinutes().toString().padStart(2, '0')}`)(new Date());
        
        if (code) { // != 0
            console.warn(`${`${time} WARN  `.yellow} Process closed with exit code ${code}, restarting...`);
            process(...cmd);
        } else console.info(`${`${time} INFO  `.blue} Process closed with exit code 0`);
    })
}

process('node', ['index']);