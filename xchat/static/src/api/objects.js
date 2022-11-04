function parseJSON (str) {
    try {
        return JSON.parse(str);
    } catch (err) {
        return null;
    }
}

class User {
    constructor (data, client) {
        this.client = client;
        this.username = data.username;
        this.publicId = data.publicId;
    }
}

class Message {
    constructor (data, client) {
        this.client = client;
        this.id = data.id || uuid.v4();
        this.content = data.content;
        this.createdAt = new Date(data.createdAt || Date.now());
        this.editedAt = data.editedAt ? new Date(data.editedAt) : null;
        this.author = new User(data.author, client);
        this.groupId = data.groupId;
        this.flags = data.flags;
    }

    toHTML () {
        return messageToHTML(this);
    }
}

class Group {
    constructor (data, client) {
        this.client = client;
        this.name = data.name;
        this.id = data.id;
        this.isOwner = data.isOwner;
        this.fetched = false;
        this.permissions = new Collection();
        this.members = new Collection();
    }

    update (data) {
        this.name = data.name;
        this.permissions.clear();
        for (const id in data.permissions)
            this.permissions.set(id, data.permissions[id]);
        
        this.permissions.set('me', this.permissions.get(this.client.user.id) || this.permissions.get('*'));
    }

    async fetch () {
        if (this.fetched)
            return false;

        const data = await this.client.asend(3, { id: this.id }, 'GROUP_FETCH');
        
        this.update(data);
        this.members.clear();
        
        for (const m of data.members) {
            const user = new User(m, this.client);
    
            if (!this.client.users.has(m.publicId))
                this.client.users.set(m.publicId, user)
    
            this.members.set(m.publicId, user);
        }

        return this.fetched = true;
    }

    async fetchMessages (limit=50, before=undefined) {
        if (limit < 1 || limit > 100)
            throw new Error('limit should be in range [1, 100]');
        
        const { list } = await this.client.asend(6, { limit, groupId: this.id, before });
        const messages = list.map(x => new Message(x, this));
        
        messages.forEach(x => {
            if (!this.client.users.has(x.author.publicId))
                this.client.users.set(x.author.publicId, new User(x.author));
        });

        return messages;
    }

    async leave () {
        await this.client.asend(3, { id: this.id }, 'GROUP_LEAVE');
        this.client.groups.remove(this.id);
    }

    async send (content, data={}) {
        return await this.client.asend(3, {
            groupId: this.id,
            content,
            ...data
        }, 'MESSAGE_CREATE');
    }
}

class Collection {
    #values; 

    constructor () {
        this.#values = new Map();
    }

    get size () { return this.#values.size }
    get (key) { return this.#values.get(key) }
    set (key, value) { this.#values.set(key, value) }
    has (key) { return this.#values.has(key) }
    remove (key) { this.#values.delete(key) }
    clear () { this.#values.clear() }
    keys () { return [...this.#values.keys()] }
    values () { return [...this.#values.values()] }
}