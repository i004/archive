import express from 'express';
import Session from '../objects/Session.js';
import User from '../objects/User.js';
import { generatePrivateID, normalizeString, validateUsername } from '../util.js';

const router = express.Router();

router.get('/', (_, res) => res.json({ version: 2 }));

router.post('/authorize', async (req, res) => {
    if (!req.body.username)
        return res.status(400).json({ error: true, message: 'Missing required body field `username`' });
    
    if (!req.body.password)
        return res.status(400).json({ error: true, message: 'Missing required body field `password`' });

    const username = normalizeString(req.body.username).replace(/[\n\t]/g, '');

    if (username.length < 2 || username.length > 32)
        return res.status(400).json({ error: true, message: 'Username should be between 2 and 32 characters in length' });

    if (!validateUsername(username))
        return res.status(400).json({ error: true, message: 'Username contains invalid characters' });

    const pid = generatePrivateID(username, req.body.password);
    
    const user = User.resolve(pid) || await User.create(username, req.body.password);
    const session = await Session.create(user.privateId, (req.headers['cf-connecting-ip'] || req.ip).toString(), req.headers['user-agent'] || 'unknown');
    
    res.json({
        sessionId: session.id,
        user: user.toJSON(),
    });
})

export default router;