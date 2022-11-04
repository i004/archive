import config from '../config.json';
import { Pool } from 'pg';
import { readFile } from 'fs/promises';

class Database {
    private _onReady: ((value?: unknown) => void)[];
    public ready: boolean = false;
    public pool: Pool;

    constructor () {
        this.pool = new Pool(config.database);
        this._onReady = [];

        this.pool.connect().then(async () => {
            console.log(`Connected to database`);

            await this.pool.query((await readFile(config.database.setupScript)).toString());
            
            this.ready = true;
            this._onReady.forEach(x => x());
        });
    }

    async exec (query: string, params=[]): Promise<any[]> {
        if (!this.ready)
            await (new Promise(res => this._onReady.push(res)));

        try {
            return (await this.pool.query(query, params)).rows || [];
        } catch (err) {
            throw new Error(`${query.gray} :: ${err}`);
        }
    }

    async fetch (query: string, params=[]): Promise<any> {
        return (await this.exec(query, params))[0];
    }
}

export default new Database();