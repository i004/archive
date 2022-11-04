import crypto from 'crypto';
import db from '../database';

const Sessions = new Map<string, Session>();

db.exec(`select * from users.sessions`)
    .then(sessions => {
        sessions.forEach(session => {
            Sessions.set(session.id, new Session(session));
        });
    });

export default class Session {
    public readonly id: string;
    public readonly privateId: string;
    public readonly hashedIp: string;
    public readonly useragent: string;
    public readonly createdAt: number;

    constructor ({ id, private_id, hashed_ip, useragent, created_at }) {
        this.id = id;
        this.privateId = private_id;
        this.hashedIp = hashed_ip;
        this.useragent = useragent;
        this.createdAt = created_at
    }

    async delete () {
        await db.exec(`delete from users.sessions where id=$1`, [this.id]);
        Sessions.delete(this.id);
    }

    static async create (privateId: string, ip: string, useragent: string) {
        const hashedIp = crypto.createHash('sha256').update(ip).digest('base64');
        const userSessions = [...Sessions.values()].filter(x => x.privateId == privateId);
        const sameSession = userSessions.find(x => x.privateId == privateId && x.useragent == useragent && x.hashedIp == hashedIp);
        
        if (sameSession)
            return sameSession;

        const sessionId = crypto.randomBytes(32).toString('base64');
        
        const data = await db.fetch(`insert into users.sessions values ($1, $2, $3, $4, $5) returning *`, [ sessionId, privateId, hashedIp, useragent, Date.now() ]);

        if (userSessions.length > 9)
            userSessions
                .sort((a, b) => a.createdAt - b.createdAt)
                .slice(0, userSessions.length-9)
                .map(s => s.delete());

        const session = new Session(data);
        Sessions.set(session.id, session);

        return session;
    }

    static async fetch (id: string) {
        const data = await db.fetch(`select * from users.sessions where id=$1`, [id]);

        if (!data)
            return null;
        
        const session = new Session(data);
        Sessions.set(session.id, session);

        return session;
    }

    static resolve (id: string) {
        return Sessions.get(id);
    }
} 