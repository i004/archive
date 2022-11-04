const WS_URL = 'wss://chat.xaro.cc/gateway/v1';
const OP = {
    HEARTBEAT: 0,
    AUTHORIZATION: 1,
    EVENT: 2,
    REQUEST: 3,
    ERROR: 4,
    SUCCESS: 5,
    SYNC_MESSAGES: 6
};

class Client {
    constructor () {
        this.ws = new WebSocket(WS_URL);
        this.heartbeat = null;
        this._w = {};

        this.users = new Collection();
        this.groups = new Collection();

        this._initWsEvents();
        this._events = {};

        this.groups.set('0', new Group({ id: '0', isOwner: false, name: 'limbo' }, this));
    }

    _initWsEvents() {
        this.ws.addEventListener('open', () => this.emit('WS_READY'));

        this.ws.addEventListener('message', (ev) => {
            const o = parseJSON(ev.data);
            if (!o) return;
            
            const { op, t, d: data } = o;
            
            if (o.i && this._w[o.i]) {
                const promise = this._w[o.i];

                if (op == OP.ERROR && data.message == 'Ratelimited') {
                    setTimeout(() => {
                        this._w[o.i] = promise;
                        this.ws.send(JSON.stringify(promise.req));
                    }, data.retryAfter * 1000);
                } else if (op == OP.ERROR) promise.rej(data);
                  else promise.res(data);

                delete this._w[o.i];
            }

            if (op == OP.HEARTBEAT) {
                this.heartbeat = Math.abs(Date.now() - data.date);
                this.send(OP.HEARTBEAT, { date: Date.now() });
            }

            else if (op == OP.EVENT) {
                if (t == 'MESSAGE_CREATE' || t == 'MESSAGE_UPDATE') {
                    if (!this.users.has(data.author.publicId))
                        this.users.set(data.author.publicId, new User(data.author, this));
                }

                this.emit(t, data);
            }

            else if (op == OP.ERROR) {
                console.error(op.t || "Error", data);
                this.emit('error', { t, ...data });
            } 
        })
    }

    on(event, cb) {
        if (!this._events[event]) this._events[event] = [];
        return this._events[event].push(cb);
    }

    emit(event, data) {
        this._events[event]?.forEach(cb => cb(data));
    }

    waitUntilReady() {
        if (this.ws.readyState) return;
        return new Promise(res => {
            const i = this.on('WS_READY', () => {
                res();
                this._events['WS_READY'].splice(i, 1);
            })
        })
    }

    send(op, d={}, t=null) {
        this.ws.send(JSON.stringify({ op, t, d }));
        this.emit('WS_SEND', { op, t, d });
    }

    asend(op, d={}, t=null) { // send & wait for the response
        return new Promise((res, rej) => {
            const i = uuid.v4();

            this._w[i] = { res, rej, req: { op, t, i, d } };
            this.ws.send(JSON.stringify({ op, t, i, d }));
            this.emit('WS_SEND', { op, t, d });
        });
    }

    async authorize (username, key) {
        if (this.user)
            throw new Error(`Already authorized`);
        
        await this.waitUntilReady();

        const auth = await this.asend(OP.AUTHORIZATION, {
            username,
            key,
            properties: {
                bot: false,
                client: 'XChatClient-2.0'
            }
        });

        this.user = new User({ username, publicId: auth.publicId }, this);

        auth.groupList.forEach(group => this.groups.set(group.id, new Group(group, this)));
        this.users.set(this.user.publicId, this.user);
    }

    async joinGroup (id) {
        const group = await this.asend(3, { id }, 'GROUP_JOIN');

        this.groups.set(group.id, new Group(group, this));
    }
}