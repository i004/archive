const express = require('express');
const expressSubdomain = require('express-subdomain');
const app = express();

require('express-ws')(app);

app.use(require('cookie-parser')('...'));
app.use(require('body-parser').urlencoded({ extended: true }));

app.use('/gateway', require('./api').router);
app.use('/proxy', require('./proxy'));
app.use('/static', express.static('static'));
app.set('view engine', 'ejs');

app.get('/', (req, res) => {
    res.redirect('/beta');
});

app.get('/beta', (req, res) => {
    if (!req.cookies?.authorization)
        return res.status(401).redirect('/authorize');

    res.render('pages/beta_app');
});

app.get('/app', (req, res) => {
    res.status(301).redirect('/beta');
})

app.get('/authorize', (req, res) => {
    const auth = req.cookies?.authorization ? Buffer.from(req.cookies.authorization, 'base64').toString('utf8').split('\x00') : ['', ''];

    res.render('pages/authorize', { auth });
});

app.post('/authorize', (req, res) => {
    if (!req.body?.username || !req.body?.key)
        return res.redirect('/authorize');

    res.cookie('authorization', Buffer.from(`${req.body.username.replace(/\x00/g, '\uFFFD')}\x00${req.body.key.replace(/\x00/g, '\uFFFD')}`, 'utf8').toString('base64')).redirect('/app');
})

process.on('unhandledRejection', (err) => console.error(err));
process.on('uncaughtException', (err) => console.error(err));

app.listen(6900);