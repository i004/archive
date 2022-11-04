const express = require('express');
const { Snowflake } = require('nodejs-snowflake');
const router = express.Router();
const md5 = require('md5');
const fs = require('fs');
const pg = require('pg');

const FORBIDDEN_CHARACTERS = /[\u0000-\u0008\u0010-\u001F\u007F-\u009F\u200B-\u200D\u00AD\uFEFF]/g;
const FORBIDDEN_WHITESPACES = /(?=\s)[^ \n\t\u200d]/g;

const snowflake = new Snowflake({ custom_epoch: 1640995200 });
const websockets = [];
const ratelimits = {
    actions: {
        CONNECT: {
            t: 'ip',
            retryAfter: 5000,
            expires: 10000,
            max: 5
        },
        MESSAGE: {
            t: 'pid',
            retryAfter: 2000,
            expires: 1000,
            max: 10,
        },
        GROUP_CREATE: {
            t: 'pid',
            retryAfter: 2000,
            expires: 10000,
            max: 3,
        },
        GROUP_EDIT: {
            t: 'pid',
            retryAfter: 2000,
            expires: 10000,
            max: 3,
        },
        GROUP: {
            t: 'pid',
            retryAfter: 2000,
            expires: 1000,
            max: 3,
        },
    }
};

const db = new pg.Pool({ user: 'deez', password: 'nuts', database: 'deeznuts' });

async function exec(query, param=[]) {
    return (await db.query(query, param))?.rows || [];
}

async function fetch(query, param=[]) {
    return (await exec(query, param))?.[0];
}

exec(fs.readFileSync('setup.psql').toString())

function _ratelimit (ws, id, ip) {
    return function wrapper(actionName) {
        const action = ratelimits.actions[actionName];
        const t = { id, ip, pid: ws.$publicId }[action.t];
        
        if (!ratelimits[t]) ratelimits[t] = {};
        if (!ratelimits[t][action]) ratelimits[t][action] = { count: 0, last: 0, ratelimitedUntil: 0, ri: 0 };
    
        const ratelimit = ratelimits[t][action];
        
        if (ratelimit.count > action.max || ratelimit.ratelimitedUntil > Date.now()) {
            if (ratelimit.count > action.max) {
                ratelimit.count = 0;
                ratelimit.last = 0;
                ratelimit.ri++;
    
                ratelimit.ratelimitedUntil = Date.now() + action.retryAfter * ratelimit.ri;
                setTimeout(() => ratelimit.ri--, 3600 * 1000);
            }

            ws.send(JSON.stringify({ t: actionName, op: 4, d: { message: 'Ratelimited', retryAfter: (~~((ratelimit.ratelimitedUntil - Date.now())/1000*10))/10 } }));
            return true;
        }

        if (ratelimit.last + action.expires < Date.now())
            ratelimit.count = 0;

        ratelimit.count++;
        ratelimit.last = Date.now();

        return false;
    }
}

function uid() {
    return snowflake.getUniqueID().toString(16);
}

function normalizeString(str) {
    return str
        .replace(FORBIDDEN_CHARACTERS, '\uFFFD')
        .replace(FORBIDDEN_WHITESPACES, ' ')
        .trim();
}

function createMessage(content, authorName, authorId, groupId='1', flags=[]) {
    return {
        id: uid(),
        groupId,
        createdAt: Date.now(),
        content,
        author: {
            username: authorName,
            publicId: authorId || md5(authorName)
        },
        flags
    };
}

function dbmessage(x) {
    return {
        id: x.id,
        groupId: x.group_id,
        createdAt: parseInt(x.created_at),
        editedAt: parseInt(x.edited_at) || undefined,
        content: x.content,
        author: {
            publicId: x.author_pid,
            username: x.author_name
        },
        flags: x.data.f || [],
    }
}

async function sendMessage(object, update=false, store=true, receivers=null) {
    websockets
        .filter(x => x.ws.$groups?.includes(object.groupId) && (receivers?.length > 0 ? receivers.includes(x.ws.$publicId) : true))
        .forEach(x => x.ws.send(JSON.stringify({ t: update ? 'MESSAGE_UPDATE' : 'MESSAGE_CREATE', op: 2, d: object })));

    if (store && !receivers)
    if (update)
        await exec(`update groups.messages set content=$1, data=$2, edited_at=$3 where id=$4 and group_id=$5`, [ object.content, { f: object.flags, c: 0 }, object.editedAt || null, object.id, object.groupId ]);
    else
        await exec(`insert into groups.messages (id, group_id, created_at, content, author_pid, author_name, data) values ($1, $2, $3, $4, $5, $6, $7)`, [
            object.id,
            object.groupId,
            object.createdAt,
            object.content,
            object.author.publicId,
            object.author.username,
            { f: object.flags, c: 0 }
        ]); 
}

async function fetchPermissions(groupId, userId) {
    if (!userId) {
        const all = await exec('select * from groups.permissions where group_id=$1', [groupId]);
        const defaultPerms = { SEND_MESSAGES: true, VIEW_OLDER_MESSAGES: true, MANAGE_MESSAGES: false, EDIT_GROUP: false };
        const aperms = { '*': { ...defaultPerms } };

        for (const p of all) {
            aperms[p.user_id] = { ...defaultPerms };
            for (const k in p.permissions)
                aperms[p.user_id][k] = p.permissions[k];
        }

        return aperms;
    }

    const gperm = await fetch(`select * from groups.permissions where group_id=$1 and user_id='*'`, [groupId]);
    const uperm = await fetch(`select * from groups.permissions where group_id=$1 and user_id=$2`, [groupId, userId]);
    const perms = { SEND_MESSAGES: true, VIEW_OLDER_MESSAGES: true, MANAGE_MESSAGES: false, EDIT_GROUP: false };
    const k = Object.keys(perms);
    
    if (gperm?.permissions)
    for (const key in gperm.permissions)
        if (k.includes(key))
            perms[key] = gperm.permissions[key];

    if (uperm?.permissions)
    for (const key in uperm.permissions)
        if (k.includes(key))
            perms[key] = uperm.permissions[key];

    return perms;
}

async function hasPermission(groupId, userId, key) {
    const group = await fetch(`select * from groups.list where id=$1`, [groupId]);
    if (group.owner_pid == userId)
        return true;

    const permissions = await fetchPermissions(groupId, userId);

    return !!permissions[key];
}

router.ws("/v1", async (ws, req) => {
    const ip = req.headers['cf-connecting-ip'] || req.headers['x-real-ip'] || req.ip.replace(/^::ffff:/, '');
    const id = uid();
    let tmp_i = undefined;
    
    const error = (t, message) => {
        ws.send(JSON.stringify({ op: 4, t, i: tmp_i, d: { message } }));
        tmp_i = undefined;
    }
    const send = (t, code, data) => {
        ws.send(JSON.stringify({ op: code, t, i: tmp_i, d: data }));
        tmp_i = undefined;
    }
    
    const ratelimit = _ratelimit(ws, id, ip);
    const connectionsByIp = websockets.filter(x => x.ip == ip);

    if (connectionsByIp.length >= 3) {
        error('CONNECT', 'Maximum number of connections reached for this IP');
        return ws.close(1001, 'MAXIMUM_NUMBER_OF_CONNECTIONS_REACHED');
    }

    websockets.push({
        id,
        ip: req.ip,
        ws
    });
    
    const auth = {
        username: null,
        publicId: null,
        key: null,
    };
    
    const D = {
        heartbeatSentAt: null,
        heartbeatTimeout: 0,
        heartbeat: null,
        groups: [],
    };

    D.heartbeatInterval = setInterval(() => {
        if (!auth.username || !auth.publicId || !auth.key) {
            error('AUTHORIZATION', 'Authorization timeout (15000ms)')
            return ws.close(1001, 'AUTHORIZATION_TIMEOUT');
        }
        
        if (D.heartbeatSentAt && ++D.heartbeatTimeout > 2) {
            error('AUTHORIZATION', 'Heartbeat timeout (15000ms)')
            return ws.close(1001, 'HEARTBEAT_TIMEOUT');
        }

        D.heartbeatSentAt = Date.now();
        send(null, 0, { date: Date.now() });
    }, 15000);

    ws.on('message', async (msg) => {
        const data = JSON.parse(msg.toString());
        tmp_i = data?.i?.toString().slice(0, 100) || undefined;
    
        if (!auth.publicId && data.op != 1)
            return error(data.t || `OPCODE_${data.op}`, 'Authorization required for this action');
        
        if (data.op == 0) { // heartbeat
            D.heartbeatSentAt = null;
            D.heartbeatTimeout = 0;
            D.heartbeat = Math.abs(Date.now() - data.d.date);
        }

        else if (data.op == 1) { // authorize
            if (!data.d.username || !data.d.key)
                return error('AUTHORIZATION', 'Missing username or key');

            if (auth.publicId)
                return error('AUTHORIZATION', 'Already authorized');

            data.d.username = normalizeString(data.d.username).replace(/\n/g, '');

            if (!data.d.username.match(/^[\u0020-\u007E\u00A1-\uFFEE\uFFFD]{2,32}$/i))
                if (data.d.username.length < 2 || data.d.username.length > 32)
                    return error('AUTHORIZATION', `Username length should be in range [2, 32]`);
                else
                    return error('AUTHORIZATION', `Invalid username`);

            auth.username = data.d.username;
            auth.key = data.d.key;
            auth.publicId = md5(JSON.stringify(auth));

            const groups = (await exec(`select * from groups.list where owner_pid=$1`, [auth.publicId]))
                .map(x => ({ ...x, isOwner: true }))
                .concat(
                    (await exec(`select * from groups.members where id=$1`, [auth.publicId]))
                        .map(x => ({ id: x.group_id, name: x.group_name, isOwner: false }))
                )
                .concat([ { id: '0', name: 'limbo', isOwner: false } ]);

            D.groups = ws.$groups = [...new Set(groups.map(x => x.id))];
            ws.$D = D;
            
            send(null, 1, {
                publicId: auth.publicId,
                sessionId: id,
                groupList:
                    D.groups
                        .map(x => groups.find(y => y.id == x))
                        .map(x => ({ id: x.id, name: x.name, isOwner: x.isOwner }))
            });
        }

        else if (data.op == 3) { // request
            if (data.t == 'MESSAGE_CREATE') {
                if (!data.d.groupId)
                    return error('MESSAGE_CREATE', 'Missing required param `groupId`');

                if (data.d.groupId == '0')
                    return error('MESSAGE_CREATE', 'Cannot send messages to limbo');

                if (!D.groups.includes(data.d.groupId))
                    return error('MESSAGE_CREATE', 'Cannot send messages to this group');

                if (!data.d.content?.trim())
                    return error('MESSAGE_CREATE', '`content` should be a non-empty string');
                
                data.d.content = normalizeString(data.d.content);
    
                if (data.d.content.length < 1 || data.d.content.length > 2000)
                    return error('MESSAGE_CREATE', 'Content length should be in range [1, 2000]');
    
                if (ratelimit('MESSAGE'))
                    return;
                
                if (!await hasPermission(data.d.groupId, auth.publicId, 'SEND_MESSAGES'))
                    return error('MESSAGE_CREATE', 'Cannot send messages to this group');
    
                const msg = createMessage(data.d.content, auth.username, auth.publicId, data.d.groupId);

                msg.flags = (data.d.flags || []).map(x => normalizeString(x).replace(/\n/g, ' ').slice(0, 32)).slice(0, 4);

                if (data.d.receivers) {
                    msg.receivers = data.d.receivers;
                    sendMessage(msg, false, false, msg.receivers);
                    return send(data.t, 5, msg);
                }

                sendMessage(msg, false, true);
                return send(data.t, 5, msg);
            }

            else if (data.t == 'GROUP_CREATE') {
                if (!data.d.name)
                    return error('GROUP_CREATE', `Name required`);

                data.d.name = normalizeString(data.d.name).replace(/\n/g, '').trim();

                if (!data.d.name.match(/^[\u0020-\u007E\u00A1-\uFFEE\uFFFD]{2,32}$/i))
                    if (data.d.name.length < 2 || data.d.name.length > 32)
                        return error('GROUP_CREATE', `Name length should be in range [2, 32]`);
                    else
                        return error('GROUP_CREATE', `Invalid name`);
                        
                if (ratelimit('GROUP_CREATE'))
                    return;
                        
                const id = uid();

                await exec(`insert into groups.list values ($1, $2, $3, $4)`, [id, data.d.name, auth.publicId, Date.now()]);
                await exec(`insert into groups.members values ($1, $2, $3, $4)`, [id, auth.publicId, data.d.name, auth.username]);

                await exec(`insert into groups.messages values ($1, $2, $3, $4, $5, $6, $7)`, [
                    uid(),
                    id,
                    Date.now(),
                    '',
                    `${id}::system`,
                    `Welcome to ${data.d.name}!`,
                    { c: 0, f: ['system'] }
                ])

                D.groups.push(id);
                ws.$groups.push(id);

                return send('GROUP_CREATE', 5, {
                    id: id,
                    name: data.d.name,
                    isOwner: true
                });
            }

            else if (data.t == 'GROUP_JOIN') {
                if (!data.d.id)
                    return error('GROUP_JOIN', 'Invalid ID');

                if (ratelimit('GROUP'))
                    return;

                const group = await fetch(`select * from groups.list where id=$1`, [data.d.id]);

                if (!group || group.owner_pid == auth.publicId)
                    return error('GROUP_JOIN', 'Unknown group');

                if (D.groups.includes(data.d.id) || await fetch(`select * from groups.members where group_id=$1 and id=$2`, [data.d.id, auth.publicId]))
                    return error('GROUP_JOIN', 'You are already in this group');

                await exec(`insert into groups.members values ($1, $2, $3, $4) on conflict do nothing`, [data.d.id, auth.publicId, group.name, auth.username]);
                
                const members = await exec(`select * from groups.members where group_id=$1`, [data.d.id]);

                D.groups.push(group.id);
                ws.$groups.push(group.id);

                if (await hasPermission(group.id, auth.publicId, 'SEND_MESSAGES'))
                sendMessage({
                    groupId: group.id,
                    id: uid(),
                    createdAt: Date.now(),
                    author: {
                        username: auth.username,
                        publicId: auth.publicId
                    },
                    content: '',
                    flags: ['joined the group']
                }, false, true);

                if (!['0', '1', '2'].includes(group.id))
                websockets
                    .filter(x => x.ws.$groups?.includes(group.id))
                    .forEach(x => x.ws.send(JSON.stringify({
                        op: 2,
                        t: 'GROUP_MEMBER_ADD',
                        d: {
                            groupId: group.id,
                            publicId: auth.publicId,
                            username: auth.username
                        }
                    })));

                return send('GROUP_JOIN', 5, {
                    id: group.id,
                    name: group.name,
                    isOwner: false
                });
            }

            else if (data.t == 'GROUP_LEAVE') {
                if (!data.d.id)
                    return error('GROUP_LEAVE', 'Invalid ID');

                const group = await fetch(`select * from groups.members where group_id=$1 and id=$2`, [data.d.id, auth.publicId]);

                if (!group)
                    return error('GROUP_LEAVE', 'You are not a member of this group');
                
                const { owner_pid } = await fetch(`select owner_pid from groups.list where id=$1`, [data.d.id]);
                
                if (owner_pid == auth.publicId)
                    return error('GROUP_LEAVE', 'Can\'t leave from this group');

                if (ratelimit('GROUP'))
                    return;

                await exec(`delete from groups.members where group_id=$1 and id=$2`, [data.d.id, auth.publicId]);
                await exec(`delete from groups.permissions where group_id=$1 and user_id=$2`, [data.d.id, auth.publicId]);
                
                if (await hasPermission(data.d.id, auth.publicId, 'SEND_MESSAGES'))
                await sendMessage({
                    groupId: data.d.id,
                    id: uid(),
                    createdAt: Date.now(),
                    author: {
                        username: auth.username,
                        publicId: auth.publicId
                    },
                    content: '',
                    flags: ['left the group']
                }, false, true);

                D.groups.splice(D.groups.indexOf(group.id), 1);
                ws.$groups.splice(ws.$groups.indexOf(group.id), 1);

                if (!['0', '1', '2'].includes(group.id))
                websockets
                    .filter(x => x.ws.$groups?.includes(data.d.id))
                    .forEach(x => x.ws.send(JSON.stringify({
                        op: 2,
                        t: 'GROUP_MEMBER_REMOVE',
                        d: {
                            groupId: data.d.id,
                            publicId: auth.publicId,
                            username: auth.username
                        }
                    })));
                
                return send('GROUP_LEAVE', 5, { id: group.id });
            }

            else if (data.t == 'GROUP_DELETE') {
                if (!data.d.id)
                    return error('GROUP_DELETE', 'Invalid ID');

                const group = await fetch(`select * from groups.list where id=$1 and owner_pid=$2`, [data.d.id, auth.publicId]);

                if (!group)
                    return error('GROUP_DELETE', 'Cannot delete this group');
                
                await exec(`delete from groups.list where id=$1`, [data.d.id]);
                await exec(`delete from groups.permissions where group_id=$1`, [data.d.id]);
                await exec(`delete from groups.members where group_id=$1`, [data.d.id]);
                
                D.groups.splice(D.groups.indexOf(group.id), 1);
                ws.$groups.splice(ws.$groups.indexOf(group.id), 1);

                websockets
                    .filter(x => x.ws.$groups.includes(group.id))
                    .forEach(x => {
                        x.ws.$groups.splice(x.ws.$groups.indexOf(group.id), 1);
                        x.ws.$D.groups.splice(x.ws.$D.groups.indexOf(group.id), 1);
                        x.ws.send(JSON.stringify({
                            op: 2,
                            t: 'GROUP_REMOVE',
                            d: {
                                id: group.id
                            }
                        }));
                    })
                
                return send('GROUP_DELETE', 5, { id: group.id });
            }

            else if (data.t == 'GROUP_EDIT') {
                if (!data.d.id)
                    return error('GROUP_EDIT', 'Invalid ID');

                const group = await fetch(`select * from groups.list where id=$1`, [data.d.id]);
                
                if (!group || !await hasPermission(group.id, auth.publicId, 'EDIT_GROUP'))
                    return error('GROUP_EDIT', 'Can\'t edit this group');

                if (typeof data.d.name !== 'undefined') {
                    data.d.name = normalizeString(data.d.name.toString()).replace(/\n/g, '').trim();
    
                    if (!data.d.name.match(/^[\u0020-\u007E\u00A1-\uFFEE\uFFFD]{2,32}$/i))
                        if (data.d.name.length < 2 || data.d.name.length > 32)
                            return error('GROUP_EDIT', `Name length should be in range [2, 32]`);
                        else
                            return error('GROUP_EDIT', `Invalid name`);
                }

                if (typeof data.d.permissions !== 'undefined') {
                    if (typeof data.d.permissions != 'object')
                        return error('GROUP_EDIT', '`permissions` should be an object');
                    
                    const validPermissions = ['SEND_MESSAGES', 'VIEW_OLDER_MESSAGES', 'MANAGE_MESSAGES', 'EDIT_GROUP'];
                    for (const k in data.d.permissions) {
                        if (k != '*' && !k?.match(/^[0-9a-f]{16,32}$/))
                            return error('GROUP_EDIT', `Invalid ID`);

                        if (k == auth.publicId)
                            return error('GROUP_EDIT', "Selfishness is good, but unfortunately you can't edit permissions for yourself");
                        
                        for (const perm in data.d.permissions[k]) {
                            if (perm == 'SEX')
                                return error('GROUP_EDIT', `sry no sex for ${k} :(`);

                            if (!validPermissions.includes(perm))
                                return error('GROUP_EDIT', `Invalid permission name`);
                            
                            if (typeof data.d.permissions[k][perm] != 'boolean')
                                return error('GROUP_EDIT', `Boolean expected`);
                        }
                    }
                }
                
                if (ratelimit('GROUP_EDIT'))
                    return;
                
                if ((!data.d.name || data.d.name == group.name) && !data.d.permissions)
                    return send('GROUP_EDIT', 5);

                if (data.d.name && data.d.name != group.name) {
                    await exec(`update groups.list set name=$1 where id=$2 and owner_pid=$3`, [data.d.name, data.d.id, auth.publicId]);
                    await exec(`update groups.members set group_name=$1 where group_id=$2`, [data.d.name, data.d.id]);
                }

                if (data.d.permissions) {
                    for (const id in data.d.permissions)
                        await exec(`insert into groups.permissions values ($1, $2, $3) on conflict (group_id, user_id) do update set permissions=excluded.permissions`, [group.id, id, data.d.permissions[id]]);
                }
                
                websockets
                    .filter(x => x.ws.$groups?.includes(group.id))
                    .forEach(async x => {
                        const perms = await fetchPermissions(group.id);
                        const me = perms[x.ws.$publicId] || perms['*'];

                        x.ws.send(JSON.stringify({
                            op: 2,
                            t: 'GROUP_UPDATE',
                            d: {
                                id: group.id,
                                name: data.d.name,
                                permissions: me.EDIT_GROUP ? perms : { '*': perms['*'], [x.ws.$publicId]: me },
                                isOwner: group.owner_pid == x.ws.$publicId
                            }
                        }))
                    });
                
                return send('GROUP_EDIT', 5);
            }

            else if (data.t == 'GROUP_FETCH') {
                if (!data.d.id || !D.groups.includes(data.d.id))
                    return error('GROUP_FETCH', 'Cannot fetch this group')
                
                const group = await fetch('select * from groups.list where id=$1', [data.d.id]);
                const members = ['-1', '0', '1', '2'].includes(group.id) ? [] : await exec(`select * from groups.members where group_id=$1`, [group.id]);
                const permissions = await fetchPermissions(group.id);

                return send('GROUP_FETCH', 5, {
                    id: group.id,
                    name: group.name,
                    isOwner: group.owner_pid == auth.publicId,
                    permissions: permissions['*']?.EDIT_GROUP || permissions[auth.publicId]?.EDIT_GROUP ? permissions : {
                        '*': permissions['*'],
                        [auth.publicId]: permissions[auth.publicId] || permissions['*']
                    },
                    members: members.map(x => ({ publicId: x.id, username: x.username }))
                });
            }

            else if (data.t == 'MESSAGE_DELETE') {
                if (!data.d.id)
                    return error(data.t, 'Missing required argument `id`');
                
                if (!data.d.groupId)
                    return error(data.t, 'Missing required argument `groupId`');
                
                if (!D.groups.includes(data.d.groupId))
                    return error(data.t, 'Cannot delete messages from this group');

                const message = await fetch(`select * from groups.messages where id=$1 and group_id=$2`, [data.d.id, data.d.groupId]);

                if (!message)
                    return error(data.t, 'Unknown message');

                if (message.author_pid != auth.publicId && !await hasPermission(data.d.groupId, auth.publicId, 'MANAGE_MESSAGES'))
                    return error(data.t, 'Cannot delete this message');

                if (ratelimit('MESSAGE'))
                    return;
                
                await exec(`delete from groups.messages where id=$1 and group_id=$2`, [data.d.id, data.d.groupId]);
                
                websockets
                    .filter(x => x.ws.$groups.includes(data.d.groupId))
                    .forEach(x => x.ws.send(JSON.stringify({
                        op: 2,
                        t: 'MESSAGE_DELETE',
                        d: {
                            id: data.d.id,
                            groupId: data.d.groupId
                        }
                    })));
            }

            else if (data.t == 'MESSAGE_UPDATE') {
                if (!data.d.id)
                    return error(data.t, 'Missing required argument `id`');
                
                if (!data.d.groupId)
                    return error(data.t, 'Missing required argument `groupId`');
                
                if (!D.groups.includes(data.d.groupId))
                    return error(data.t, 'Cannot edit messages from this group');
                
                if (!data.d.content?.trim())
                    return error('MESSAGE_UPDATE', '`content` should be a non-empty string');
                
                data.d.content = normalizeString(data.d.content);
    
                if (data.d.content.length < 1 || data.d.content.length > 2000)
                    return error('MESSAGE_UPDATE', 'Content length should be in range [1, 2000]');

                const message = await fetch(`select * from groups.messages where id=$1 and group_id=$2`, [data.d.id, data.d.groupId]);

                if (!message)
                    return error(data.t, 'Unknown message');

                if (message.author_pid != auth.publicId || !message.content)
                    return error(data.t, 'Can\'t edit this message');

                if (ratelimit('MESSAGE'))
                    return;
                
                const now = Date.now();
                await exec(`update groups.messages set content=$1, edited_at=$2 where id=$3 and group_id=$4`, [data.d.content, now, data.d.id, data.d.groupId]);
                
                websockets
                    .filter(x => x.ws.$groups.includes(data.d.groupId))
                    .forEach(x => x.ws.send(JSON.stringify({
                        op: 2,
                        t: 'MESSAGE_UPDATE',
                        d: dbmessage({ ...message, content: data.d.content, edited_at: now })
                    })));
            }

            send(data.t, 5);
        }

        else if (data.op == 6) { // sync messages
            if (!data.d.groupId) data.d.groupId = '1';

            if (data.d.groupId == '0')
                return send(null, 6, {
                    list: [ createMessage([
                            '**Welcome to XChat Beta!**',
                            'You are currently in group `limbo`. Anything you send here is not stored anywhere and only you can see this.\n',
                            
                            'You can join a group or create it using the green button in the sidebar.',
                            'Public group ID: \`1\` (!! not moderated)'
                    ].join('\n'), `XChat`, '0', '0', ['system']) ],
                    groupId: '0'
                })

            if (!D.groups.includes(data.d.groupId))
                return error('SYNC_MESSAGES', 'Cannot sync messages with this group');
            
            if (data.d.before && !await hasPermission(data.d.groupId, auth.publicId, 'VIEW_OLDER_MESSAGES'))
                return error('SYNC_MESSAGES', 'Can\'t view older messages in this group');

            const limit = data.d?.limit || 50;

            if (limit > 100 || limit < 1)
                return error('SYNC_MESSAGES', '`limit` should be in range [1, 100]');
            
            const { id: oldest } = await exec(`select id from groups.messages where group_id=$1 order by created_at asc limit 1`, [data.d.groupId]);
            if (data.d.before && oldest > data.d.before)
                return send(null, 6, { list: [], groupId: data.d.groupId });

            const query = data.d.before
                ? [`select * from groups.messages where group_id=$1 and id<$2 order by created_at desc limit 100`, [ data.d.groupId, data.d.before.toString() ]]
                : [`select * from groups.messages where group_id=$1 order by created_at desc limit 100`, [ data.d.groupId ]]

            const messages = await exec(...query);

            send(null, 6, {
                list: messages
                    .slice(0, limit)
                    .map(x => dbmessage(x)),
                groupId: data.d.groupId
            });
        }

        else return error(`OPCODE_${data.op}`, 'Invalid opcode');
    })

    ws.on('close', (code, reason) => {
        websockets.splice(websockets.findIndex(w => w.id == id), 1);
        clearInterval(D.heartbeatInterval);
    })
})

module.exports = { router, db: { pool: db, exec, fetch } };