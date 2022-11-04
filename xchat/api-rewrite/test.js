import needle from 'needle';
import util from 'util';

const URL_BASE = `https://chat.xaro.cc/api/v2`;

function log (o) {
    console.log(util.inspect(o, { depth: 10, colors: true, compact: false }));
}

async function authorize (username, password) {
    const req = await needle('post', `${URL_BASE}/authorize`, { username, password });
    
    console.log(`sessionId`, req.body.sessionId);
    console.log(`user     `,      JSON.stringify(req.body.user));

    return {
        sessionId: req.body.sessionId,
        user: req.body.user,
        async get (path) {
            const req = await needle('get', `${URL_BASE}${path}`, { headers: { 'x-session-id': this.sessionId, 'content-type': 'application/json' } });
            
            return req.body;
        },
        async delete (path) {
            const req = await needle('delete', `${URL_BASE}${path}`, null, { headers: { 'x-session-id': this.sessionId, 'content-type': 'application/json' } });
            
            return req.body;
        },
        async post (path, data={}) {
            const req = await needle('post', `${URL_BASE}${path}`, data, { headers: { 'x-session-id': this.sessionId } });
            
            return req.body;
        },
    }
}

async function app () {
    const user = await authorize('test', '321');
    
    log(await user.post('/groups', { name: 'a' }));
}

app();