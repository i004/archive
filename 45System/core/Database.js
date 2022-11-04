const { Pool } = require('pg');
const { exec } = require('child_process');

class Database {
    constructor(connection_uri) {
        this.connection_uri = connection_uri
        this.pool = new Pool({
            connectionString: connection_uri
        });
    }

    async setup (script) {
        for (let line of script.toString().split("\n").filter(x => !!x && !x.startsWith('#')))
            await this.query(line);
    }

    dump_database (file) {
        return new Promise((res, rej) => {
            exec(`pg_dump ${this.connection_uri} > ${file}`, (error, stdout, stderr) => {
                if (error)
                    return rej(error);
                res({stdout, stderr});
            });
        })
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

module.exports = { Database };