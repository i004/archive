import db from '../database';
import { ulid } from '../util';
import User from './User';

const DEFAULT_PERMISSIONS = { SEND_MESSAGES: true, VIEW_OLDER_MESSAGES: true, MANAGE_MESSAGES: false, EDIT_PERMISSIONS: false, EDIT_GROUP: false };
const ALL_PERMISSIONS = { SEND_MESSAGES: true, VIEW_OLDER_MESSAGES: true, MANAGE_MESSAGES: true, EDIT_PERMISSIONS: true, EDIT_GROUP: true };
type PermissionKey = keyof typeof ALL_PERMISSIONS;

const Groups = new Map<string, Group>();

db.exec(`select * from groups.list`)
  .then(groups => {
    groups.forEach(group => {
        Groups.set(group.id, new Group(group));
    });
  });

export default class Group {
    public readonly id: string;
    public readonly createdAt: number;
    public readonly messages: GroupMessageManager;
    public readonly members: GroupMemberManager;

    public name: string;
    public ownerId: string;
    public globalPermissions: Record<PermissionKey, boolean>;

    constructor ({ id, name, data }) {
        this.id = id;
        this.name = name;
        this.createdAt = data.createdAt;
        this.ownerId = data.ownerId;
        this.globalPermissions = { ...DEFAULT_PERMISSIONS, ...data.globalPermissions };
        
        this.members = new GroupMemberManager(this);
        this.messages = new GroupMessageManager(this);
    }

    async save () {
        await db.exec(`update groups.list set name=$1, data=$2 where id=$3`, [
            this.name,
            { ownerId: this.ownerId,
              createdAt: this.createdAt,
              globalPermissions: this.globalPermissions },
            this.id
        ]);
    }

    async delete () {
        Groups.delete(this.id);

        await db.exec(`delete from groups.list where id=$1`, [this.id]);
        await db.exec(`delete from groups.members where group_id=$1`, [this.id]);
    }

    static async create (name: string, ownerId: string) {
        const data = await db.fetch(`insert into groups.list values ($1, $2, $3) returning *`, [
            ulid(),
            name,
            { ownerId,
              createdAt: Date.now(),
              globalPermissions: { ...DEFAULT_PERMISSIONS } }
        ])

        const group = new Group(data);
        Groups.set(group.id, group);

        return group;
    }

    static async fetch (id: string) {
        const data = await db.fetch(`select * from groups.list where id=$1`, [id]);

        if (!data)
            return null;
        
        Groups.set(id, new Group(data));
        return Groups.get(id);
    }

    static resolve (id: string) {
        return Groups.get(id);
    }

    toJSON () {
        return {
            id: this.id,
            name: this.name,
            createdAt: this.createdAt,
            ownerId: this.ownerId
        };
    }
}

export class GroupMemberManager {
    public readonly group: Group;

    constructor (group: Group) {
        this.group = group;
    }

    async create (id: string) {
        const data = await db.fetch(`insert into groups.members values ($1, $2, $3) returning *`, [
            id,
            this.group.id,
            { since: Date.now(),
              permissions: {} }
        ]);

        return new GroupMember(this.group, data, User.resolve(id));
    }

    async delete (id: string) {
        await db.exec(`delete from groups.members where group_id=$1 and id=$2`, [this.group.id, id]);
    }

    async list () {
        const members = await db.exec(`select * from groups.members where group_id=$1`, [this.group.id]);
            return members.map(member => new GroupMember(
            this.group,
            member,
            User.resolve(member.id)
        ));

        return members.map(member => new GroupMember(this.group, member, User.resolve(member.id)));
    }

    async fetch (id: string) {
        const member = await db.fetch(`select * from groups.members where group_id=$1 and id=$2`, [this.group.id, id]);
        
        if (!member)
            return null;

        return new GroupMember(this.group, member, User.resolve(member.id));
    }
}

export class GroupMember {
    public readonly group: Group;
    public readonly user: User;
    public readonly id: string;
    public readonly since: number;
    public _perms: Record<PermissionKey, boolean>;

    constructor (group: Group, { id, data }, user: User) {
        this.group = group;
     
        this.id = id;
        this.user = user;
        this.since = data.since;
        this._perms = data.permissions;
    }

    async save () {
        await db.exec(`update groups.members set data=$1 where id=$2 and group_id=$3`, [ {
            since: this.since,
            permissions: this.permissions
        }, this.id, this.group.id ]);
    }

    async leave () {
        await db.exec(`delete from groups.members where group_id=$1 and id=$2`, [this.group.id, this.id]);
    }

    async send (content: string, flags: string[] = []) {
        return await this.group.messages.create(this.user.id, content, flags);
    }

    get permissions () {
        if (this.group.ownerId == this.id)
            return ALL_PERMISSIONS;

        return { ...this.group.globalPermissions, ...this._perms };
    }

    toJSON () { 
        return {
            user: this.user.toJSON(),
            since: this.since,
            permissions: this.permissions
        };
    }
}

export class GroupMessageManager {
    public readonly group: Group;

    constructor (group: Group) {
        this.group = group;
    }

    async list (limit: number = 50, before: string = undefined, after: string = undefined) {
        const query = before && after
            ? [`select * from groups.messages where group_id=$1 and id < $2 and id > $3 order by id desc limit $4`, [this.group.id, before, after, limit]]
            : before ? [`select * from groups.messages where group_id=$1 and id < $2 order by id desc limit $3`, [this.group.id, before, limit]]
              : after ? [`select * from groups.messages where group_id=$1 and id > $2 order by id asc limit $3`, [this.group.id, after, limit]]
                : [`select * from groups.messages where group_id=$1 order by id desc limit $2`, [this.group.id, limit]];

        const list = await db.exec(query[0] as string, query[1] as any[]);
        
        return list.map(x => new GroupMessage(this, x));
    }

    async fetch (id: string) {
        const data = await db.fetch(`select * from groups.messages where id=$1 and group_id=$2`, [id, this.group.id]);

        if (!data)
            return null;

        return new GroupMessage(this.group, data);
    }

    async delete (id: string) {
        await db.exec(`delete from groups.mesages where id=$1 and group_id=$2`, [id, this.group.id]);
    }

    async create (authorId: string, content: string, flags: string [] = []) {
        const data = await db.fetch(`insert into groups.messages values ($1, $2, $3) returning *`, [
            ulid(),
            this.group.id,
            { createdAt: Date.now(),
              editedAt: null,
              authorId,
              content,
              flags }
        ]);

        return new GroupMessage(this.group, data);
    }
}

export class GroupMessage {
    public readonly group: Group;
    public readonly author: User;
    public readonly id: string;
    public readonly createdAt: number;
    public flags: string[];
    public content: string;
    public editedAt: number;

    constructor (group, { id, data }) {
        this.group = group;
        this.id = id;
        this.flags = data.flags;
        this.content = data.content;
        this.createdAt = data.createdAt;
        this.editedAt = data.editedAt;
        this.author = User.resolve(data.authorId);
    }

    async delete () {
        await db.exec(`delete from groups.messages where id=$1 and group_id=$2`, [
            this.id,
            this.group.id
        ]);
    }

    async save () {
        await db.exec(`update groups.messages set data=$1 where id=$2 and group_id=$3`, [ {
            content: this.content,
            editedAt: this.editedAt,
            flags: this.flags
        }, this.id, this.group.id ]);
    }

    toJSON () {
        return {
            id: this.id,
            groupId: this.group.id,
            createdAt: this.createdAt,
            editedAt: this.editedAt,
            author: this.author.toJSON(),
            content: this.content,
            flags: this.flags
        };
    }
}