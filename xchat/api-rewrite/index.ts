import express from 'express';
import bodyParser from 'body-parser';
import 'colors';

import config from './config.json';
import v2 from './v2/index';

const app = express();

app.use(bodyParser.urlencoded({ extended: true }));
app.use('/v2', v2);

app.get('/', (_, res) => res.json({ status: 'OPERATIONAL' }));

app.listen(config.port, () => {
    console.log(`API server listening on :${config.port}`);
});