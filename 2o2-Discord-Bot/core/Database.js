const pg = require('pg');
const fs = require('fs');
const child_process = require('child_process');
const config = require('../config.json');

module.exports = class Database {
    constructor () {
        this.pool = new pg.Pool(config.database)
        this.pool.once('connect', async () => {
            console.info('Connected to database');
        })
    }

    dump(file) {
        return child_process.execSync(`pg_dump postgresql://${config.database.user}:${config.database.password}@${config.database.host}:${config.database.port}/${config.database.database} > ${file}`, { stdio: 'ignore' });
    }

    async setup() {
        for (let line of fs.readFileSync(config.dbSetupFile).toString().split('\n')) {
            try {
                await this.exec(line);
            } catch (err) {
                return console.error(`${line}\n>>> ${err}`)
            }
        }
    }

    async exec(query, values=[]) {
        return await this.pool.query(query, values);
    }

    /**
     * 
     * @returns {Promise<any>}
     */
    async fetch(query, values=[]) {
        return (await this.exec(query, values)).rows[0];
    }

    /**
     * 
     * @returns {Promise<any[]>}
     */
    async all(query, values=[]) {
        return (await this.exec(query, values)).rows;
    }

    /**
     * 
     * @returns {Promise<number>}
     */
    async count(query, values=[]) {
        return (await this.exec(query, values)).rowCount;
    }

    /**
     * 
     * @returns {Promise<boolean>}
     */
    async any(query, values=[]) {
        return (await this.exec(query, values)).rowCount > 0;
    }
}