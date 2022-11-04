const discord = require('discord.js');
const glob = require('glob');
const BaseCommand = require('./BaseCommand');

module.exports = class Internal {
    /**
     * 
     * @param {import('./Client')} client 
     */
    constructor (client) {
        this.client = client;
        this.init();
    }

    init () {
        this.overrideConsole();

        process.on('uncaughtException', (e) => this.logError(e));
        process.on('unhandledRejection', (e) => this.logError(e));
    }

    /**
     * 
     * @param {string} path 
     * @returns {import('./BaseCommand')}
     */
     importCommand(path, nocache=true) {
        path = require('path').join('../', path);
        
        if (nocache && require.cache[require.resolve(path)])
            delete require.cache[require.resolve(path)];
        
        const m = require(path);
        if (!m instanceof BaseCommand) return false;
        return new m(this.client);
    }

    /**
     * 
     * @param {string} path 
     * @returns {Promise<import('./BaseCommand')[]>}
     */
    loadCommands(path) {
        return new Promise((res, rej) => {
            glob(path + (path.endsWith('.js')?'':'.js'), (err, m) => {
                if (err) return rej(err);
                const commands = [];
                
                for (let f of m) {
                    const command = this.importCommand(f);
                    if (!command || command.disabled) continue;
    
                    this.client.commands.set(`${command.name}:${command.type}`, command);
                    commands.push(command);
                }
                
                res(commands);
            })
        });
    }

    logError (err) {
        if (this.client?.channels?.cache && this.client.channels.cache.get('959122558836437063')) 
            this.client.channels.cache.get('959122558836437063').send({ content: `error`, files: [{ attachment: Buffer.from(err.stack || err || ''), name: 'error.js' }] }).catch(() => {});
        console.error(err.stack || err);
    }

    overrideConsole () {
        const f = (b, r) => ((...d) => b(r.replace('{}', (t => `${t.getHours().toString().padStart(2, '0')}:${t.getMinutes().toString().padStart(2, '0')}`)(new Date())), ...d));

        console.log = f(console.log, `{} LOG   `.gray);
        console.info = f(console.info, `{} INFO  `.cyan);
        console.warn = f(console.warn, `{} WARN  `.yellow);
        console.error = f(console.error, `{} ERROR `.red);
        console.debug = f(console.debug, `{} DEBUG `.blue);
    }
}