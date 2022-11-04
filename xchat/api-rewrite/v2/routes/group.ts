import express from 'express';
import Group from '../objects/Group';
import { AuthorizedRequest, requireAuth } from '../middleware';
import { normalizeString, validateUsername } from '../util';
import { extractParams } from './util';
import { APIError } from '../objects/Error';

const router = express.Router();

router.get('/', requireAuth, async (req: AuthorizedRequest, res) => { // fetch groups
    const groups = await req.user.groups.list();
    
    res.json(groups.map(x => ({
        ...x.group.toJSON(),
        since: x.since,
        permissions: x.permissions
    })));
});

router.post('/', requireAuth, async (req: AuthorizedRequest, res) => { // create group
    const { name } = extractParams(req, res, {
        name: {
            from: 'body',
            type: 'string',
            required: true,
            format: (value) => normalizeString(value).replace(/[\n\t]/g, ''),
            keys: {
                length: {
                    range: [2, 32]
                }
            }
        }
    });

    const group = await Group.create(name, req.user.id);
    await req.user.groups.add(group.id);

    res.json(group.toJSON());
});

router.get('/:id', requireAuth, async (req: AuthorizedRequest, res) => { // fetch group
    const member = await req.user.groups.fetch(req.params.id);
    
    if (!member)
        throw new APIError('Unknown group', 404);

    const group = member.group;

    const members = await group.members.list();
    const perm = member.permissions.EDIT_PERMISSIONS;
    
    res.json({
        ...group.toJSON(),
        members: members.map(x => ({
            ...x.toJSON(),
            permissions: perm ? x.permissions : {}
        })),
        permissions: perm ? group.globalPermissions : {}
    });
});

router.post('/:id', requireAuth, async (req: AuthorizedRequest, res) => { // join group
    const group = Group.resolve(req.params.id);
    
    if (!group)
        throw new APIError('Unknown group', 404);

    if (await req.user.groups.fetch(req.params.id))
        return res.status(400).json({ error: true, message: 'You are already a member of this group' });
    
    await req.user.groups.add(group.id);

    res.json(group.toJSON());
});

router.patch('/:id', requireAuth, async (req: AuthorizedRequest, res) => { // update group
    if (!req.body.name)
        throw new APIError('Missing required body field `name`', 400);
    
    const member = await req.user.groups.fetch(req.params.id);
    
    if (!member)
        throw new APIError('Unknown group', 404);

    if (!member.permissions.EDIT_GROUP)
        throw new APIError('Missing permissions', 403);

    if (req.body.name) {
        const name = normalizeString(req.body.name).replace(/[\n\t]/g, '');

        if (name.length < 2 || name.length > 32)
            throw new APIError('Name should be between 2 and 32 characters in length', 400);

        member.group.name = req.body.name;
    }

    await member.group.save();

    res.json({});
});

router.delete('/:id', requireAuth, async (req: AuthorizedRequest, res) => { // delete group
    const member = await req.user.groups.fetch(req.params.id);

    if (!member)
        return res.status(404).json({ error: true, message: 'Unknown group' });
    
    if (member.group.ownerId == req.user.id)
        await member.group.delete();
    
    await member.leave();

    res.json({});
});

router.post('/:id/permissions/:pid', requireAuth, async (req: AuthorizedRequest, res) => { /* create permission override */ });
router.patch('/:id/permissions/:pid', requireAuth, async (req: AuthorizedRequest, res) => { /* update permission override */ });
router.delete('/:id/permissions/:pid', requireAuth, async (req: AuthorizedRequest, res) => { /* delete permission override */ });

router.get('/:id/messages', requireAuth, async (req: AuthorizedRequest, res) => { /* fetch messages */ });
router.post('/:id/messages', requireAuth, async (req: AuthorizedRequest, res) => {
    const member = await req.user.groups.fetch(req.params.id);
    
    if (!member)
        throw new APIError('Unknown group', 404);
    
    if (!member.permissions.SEND_MESSAGES)
        throw new APIError('Missing permissions', 403);

    if (!req.body.content)
        throw new APIError('Cannot send empty message', 400);

    const message = await member.send(req.body.content, req.body.flags || []);

    res.json(message.toJSON());
});

router.patch('/:id/messages/:mid', requireAuth, async (req: AuthorizedRequest, res) => { /* update message */ });
router.delete('/:id/messages/:mid', requireAuth, async (req: AuthorizedRequest, res) => { /* delete message */ });

export default router;