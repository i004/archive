const { Pool } = require('pg');
const { exec } = require('child_process');

class DatabaseConfig {
    constructor (raw) {
        this.$raw_data = raw;
    }
    getKey (key) {
        return this.$raw_data[key];
    }
}

class DatabaseConnector {
    constructor(config) {
        this.config = new DatabaseConfig(config);
        this.pool = new Pool({
            connectionString: this.config.getKey("connectionURI")
        });
    }

    async setup (script) {
        for (let line of script.toString().split("\n").filter(x => !!x && !x.startsWith('#')))
            await this.query(line);
    }

    dumpDatabase (file) {
        return new Promise((res, rej) => {
            exec(`pg_dump ${this.config.getKey("connectionURI")} > ${file}`, (error, stdout, stderr) => {
                if (error)
                    return rej(error);
                res({stdout, stderr});
            });
        })
    }

    async backupDatabase(bot) {
        const channel = await bot.channels.fetch('859771858751848448');
        await this.dumpDatabase("backup.psql");
        await channel.send(new Date().toString(), { files: ["./backup.psql"] });
    }

    createAutoBackupTask (bot) {
        this.backupDatabase(bot);
        setInterval(() => { this.backupDatabase(bot) }, 60*60*1000);
    }

    async query(query, options=[], outputType={}) {
        const res = await this.pool.query(query, options);
        if (outputType.raw)
            return res;
        if (outputType.array)
            return res.rows
        return res.rows.length < 2 ? res.rows[0] : res.rows;
    }
}

class Database {
    constructor (connector) {
        this.connector = connector;
        this.config = this.connector.config;
    }

    query(query, options=[], outputType={}) {
        return this.connector.query(query, options, outputType);
    }

    async fetchAllReminders() {
        return await this.query("SELECT * FROM reminders", [], {array: true});
    }

    async fetchReminders(user_id) {
        return await this.query("SELECT * FROM reminders WHERE user_id=$1", [user_id], {array: true});
    }
    
    async addReminder(user_id, channel_id, expires, text) {
        return await this.query("INSERT INTO reminders(user_id, channel_id, expires, text) VALUES ($1, $2, $3, $4)", [user_id, channel_id, expires, text]);
    }

    async fetchGuildLocale(guild_id) {
        return (await this.query("SELECT * FROM locales WHERE guild_id=$1", [guild_id]))?.locale ?? 'en';
    }
}

module.exports = { DatabaseConnector, DatabaseConfig, Database };