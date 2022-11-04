import express from 'express';

import root from './routes/root';
import websocket from './routes/websocket';
import group from './routes/group';
import { errorHandler } from './middleware';

const router = express.Router();

router.use(errorHandler);

router.use('/', root);
router.use('/ws', websocket);
router.use('/groups', group);

export default router;