import express from 'express';
import expressWs, { Application } from 'express-ws';

const router = express.Router();

expressWs(router as Application);

router.ws('/', (ws, res) => {
    
})

export default router;