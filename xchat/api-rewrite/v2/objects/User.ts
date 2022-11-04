import db from '../database';
import { generatePrivateID, randomUserColor, ulid } from '../util';
import Group, { GroupMember } from './Group';

const Users = new Map<string, User>();

db.exec(`select * from users.list`)
  .then(users => {
    users.forEach(user => {
        Users.set(user.id, new User(user));
    });
  });

export default class User {
    public readonly id: string;
    public readonly createdAt: number;
    public readonly groups: UserGroupManager;

    public privateId: string;
    public username: string;
    public color: string;
    public bot: boolean;
    public history: string[];
    
    constructor ({ id, private_id, data }) {
        this.id = id;
        this.createdAt = data.createdAt;
        this.groups = new UserGroupManager(this);
        this.privateId = private_id;
        this.username = data.username;
        this.color = data.color;
        this.bot = data.bot;
        this.history = data.history || [];
    }

    async save () {
        await db.exec(`update users.list set data=$1, private_id=$2 where id=$3`, [
            { username: this.username,
              createdAt: this.createdAt,
              color: this.color,
              bot: this.bot },
            this.privateId,
            this.id
        ]);
    }

    async delete () {
        await db.exec(`delete from users.list where id=$1`, [this.id]);
        await db.exec(`delete from groups.members where id=$1`, [this.id]);

        Users.delete(this.id);
        this.username = 'Deleted User';
    }

    static async create (username: string, password: string, bot=false) {
        const data = await db.fetch(`insert into users.list values ($1, $2, $3) returning *`, [
            ulid(),
            generatePrivateID(username, password),
            { username,
              bot,
              createdAt: Date.now(),
              color: randomUserColor(),
              history: [] }
        ])

        const user = new User(data);
        Users.set(user.id, user);

        return user;
    }

    static async fetch (id: string) {
        const data = await db.fetch(`select * from users.list where id=$1 or private_id=$1`, [id]);

        if (!data)
            return null;
        
        const user = new User(data);
        Users.set(user.id, user);
        
        return user;
    }

    static resolve (id: string) {
        return Users.get(id) || [...Users.values()].find(x => x.privateId == id);
    }

    toJSON () {
        return {
            id: this.id,
            username: this.username,
            createdAt: this.createdAt,
            color: this.color
        };
    }
}

export class UserGroupManager {
    public readonly user: User;

    constructor (user: User) {
        this.user = user;
    }

    async add (id: string) {
        if (!Group.resolve(id))
            return null;

        return await Group.resolve(id).members.create(this.user.id);
    }

    async delete (id: string) {
        if (!Group.resolve(id))
            return null;

        await Group.resolve(id).members.delete(this.user.id);

        return true;
    }

    async fetch (id: string) {
        if (!Group.resolve(id))
            return null;

        return await Group.resolve(id).members.fetch(this.user.id);
    }

    async list () {
        const groups = await db.exec(`select * from groups.members where id=$1`, [this.user.id]);

        return groups.map(x => new GroupMember(Group.resolve(x.group_id), x, this.user));
    }
}