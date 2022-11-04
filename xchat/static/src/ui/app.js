class Application {
    constructor (auth) {
        this.auth = auth;
        this.autoScroll = true;
        this.selectedGroup = '0';
        this.messages = new Collection();
        this.blockedUsers = Cookies.get('blocked-users')?.split(',') || [];
    }
    
    get group() {
        return this.client.groups.get(this.selectedGroup);
    }

    async connect () {
        this.client = new Client();

        this.client.ws.addEventListener('close', (ev) => {
            console.error(`Websocket disconnected: ${ev.code} (${ev.reason})`);
            console.warn(`Reconnecting in 1000ms`);
            delete this.client;
            setTimeout(() => this.connect(), 1000);
        });

        this.client.on('MESSAGE_CREATE', (msg) => {
            if (msg.groupId != this.selectedGroup || this.blockedUsers.includes(msg.author.publicId))
                return;

            msg = new Message(msg, this.client);

            const list = document.getElementById('messages');
            const lastMessage = this.messages.values().reverse()[0];
            
            if (lastMessage.author.publicId == msg.author.publicId
                && lastMessage.createdAt.getTime() + 300 * 1000 > Date.now()
                && msg.flags[0] == lastMessage.flags[0]
                && document.getElementById(lastMessage.id).parentElement.childElementCount < 6) {
                document.getElementById(lastMessage.id).outerHTML += messageContent(msg);
            } else list.innerHTML += messageToHTML(msg);

            this.messages.set(msg.id, msg);

            if (this.autoScroll) {
                list.scrollTop = list.scrollHeight;
                if (this.messages.size > 50) {
                    this.messages
                        .keys().sort()
                        .slice(0, this.messages.size-50)
                        .map(k => {
                            this.messages.remove(k);
                            document.getElementById(k)?.parentElement?.parentElement?.remove();
                        });
                }
            }
        });

        this.client.on('MESSAGE_DELETE', (msg) => {
            if (msg.groupId != this.selectedGroup)
                return;

            const message = document.getElementById(msg.id);

            if (message)
            if (message.parentElement.childElementCount == 2)
                message.parentElement.parentElement.remove();
            else
                message.remove();

            this.messages.remove(msg.id);
        })

        this.client.on('MESSAGE_UPDATE', (msg) => {
            if (msg.groupId != this.selectedGroup || this.blockedUsers.includes(msg.author.publicId))
                return;

            this.messages.set(msg.id, new Message(msg, this.client));

            const message = document.getElementById(msg.id);

            if (message)
            if (message.parentElement.childElementCount == 2)
                message.parentElement.parentElement.outerHTML = messageToHTML(msg);
            else
                message.outerHTML = messageContent(msg);
        })

        this.client.on('GROUP_REMOVE', (group) => {
            this.client.groups.remove(group.id);
            document.getElementById(`group-${group.id}`)?.remove();

            if (group.id == this.selectedGroup)
                this.changeGroup('0');
        })

        this.client.on('GROUP_UPDATE', (data) => {
            this.client.groups.get(data.id).update(data);
            this.updateGroupList();
        })

        this.client.on('GROUP_MEMBER_ADD', (member) => {
            this.client.groups.get(member.groupId).members.set(member.publicId, new User(member, this.client));

            if (member.groupId == this.selectedGroup)
                this.updateMemberList();
        })

        this.client.on('GROUP_MEMBER_REMOVE', (member) => {
            this.client.groups.get(member.groupId).members.remove(member.publicId);

            if (member.groupId == this.selectedGroup)
                this.updateMemberList();
        })

        if (this.debugMode) {
            this.client.ws.addEventListener('message', (e) => {
                const data = parseJSON(e.data);
                if (!data) return;
                console.debug(`%cRECV %c${data.op} (${data.t})`, 'color: #2ecc71', '', data.d);
            });
            this.client.on('WS_SEND', (data) => {
                console.debug(`%cSEND %c${data.op} (${data.t})`, 'color: #3498db', '', data.d);
            })
        }

        await this.client.authorize(this.auth.username, this.auth.key);
        
        document.getElementById('message-input-textarea').placeholder = `Message ${this.group.name}`;
        
        this.updateGroupList();
        this.updateMemberList();
        this.updateMessageList();
    }

    updateGroupList () {
        document.getElementById('message-input-textarea').placeholder = `Message ${this.group.name}`;
        document.getElementById('groups').innerHTML = `
            <li class="group home" data-group-name="Home" data-group-id="0" id="group-0"><span class="material-symbols-outlined">home</span></li>
            ${this.client.groups
                .values()
                .filter(x => x.id != '0')
                .map(group => groupToHTML(group))
                .join('')
            }
            <li class="group sb add" data-group-name="Add Group"><span class="material-symbols-outlined">add_circle</span></li>
            <li class="group sb settings" data-group-name="Settings"><span class="material-symbols-outlined">settings</span></li>
        `;
        document.getElementById(`group-${this.selectedGroup}`).classList.add('current');
    }

    updateMemberList () {
        const list = document.getElementById('members');

        if (!list)
            return;

        document.getElementById('member-text').innerHTML = `Members — ${this.group.members.size}`;

        list.innerHTML = this.group.members
            .values()
            .sort((a, b) => a.username.localeCompare(b.username))
            .map(x => `<li class="member user" data-user-id="${x.publicId}" style="--user-color: #${x.publicId.slice(0, 6)}">${x.username}</li>`)
            .join('');
    }

    createMessage (data) {
        if (!data.id)
            data.id = uuid.v4();

        const list = document.getElementById('messages');

        list.innerHTML += messageToHTML(data);
        this.messages.set(data.id, data);

        if (this.autoScroll) list.scrollTop = list.scrollHeight;
    }

    async updateMessageList () {
        const list = document.getElementById('messages');
        list.style = 'opacity: 0';
        
        const messages = (await this.group.fetchMessages(50)).reverse()
            .filter(x => !this.blockedUsers.includes(x.author.publicId));
        
        this.messages.clear();
        messages.forEach(message => this.messages.set(message.id, message));

        list.innerHTML = '';
        
        let groupingI = 0;
        messages.map((x, i, a) => {
            if (a[i-1]?.author?.publicId == x.author.publicId
                && groupingI++ < 5
                && !a[i-1].flags[0]) {
                return document.getElementById(a[i-1].id).outerHTML += messageContent(x);
            }

            groupingI = 0;
            
            list.innerHTML += messageToHTML(x);
        }).join('');

        list.scrollTop = list.scrollHeight;
        list.style = '';
    }

    async submitMessage () {
        const list = document.getElementById('messages');
        const el = document.getElementById('message-input-textarea');
        const input = el.value?.slice(0, 2000);

        if (!input?.trim())
            return;

        el.value = '';

        if (input.startsWith('/') && await execCommand(input));
        else if (this.selectedGroup == '0')
            this.createMessage({
                flags: [],
                content: input,
                createdAt: Date.now(),
                author: { username: this.client.user.username, publicId: this.client.user.publicId }
            })
        else if (input.includes('@someone') && this.group.members.size > 1) {
            const members = app.group.members.keys();
            await this.group.send(input.replace(/@someone/g, () => `@${choice(members)}`), { flags: ['@someone'] })
        } else await this.group.send(input);
        
        if (this.autoScroll)
            list.scrollTop = list.scrollHeight;
    }

    async changeGroup (id) {
        const group = this.client.groups.get(id);

        document.querySelector('.group.current')?.classList?.remove('current');
        document.getElementById(`group-${id}`)?.classList?.add('current');
        
        this.selectedGroup = group.id;
        if (!group.fetched)
            await group.fetch();
        
        const canSendMessages = group.id == '0' || group.isOwner || group.permissions.get('me').SEND_MESSAGES;
        const input = document.getElementById('message-input-textarea');

        input.placeholder = canSendMessages ? `Message ${group.name}` : `You can't send messages to this group`;
        input.disabled = !canSendMessages;
        input.focus();
        
        this.updateMessageList();
        this.updateMemberList();
    }
}

const raw = atob(Cookies.get('authorization') || "")?.split('\x00');
if (!raw) location.href = '/authorize';

const app = new Application({ username: raw[0], key: raw[1] });

window.addEventListener('load', () => {
    app.debugMode = ['1', 'true'].includes(new URLSearchParams(location.search).get('debug'));
    app.connect();

    setTimeout(()=>{
        console.log('%cDear programmer:', 'font-size:24px');
        console.log('%cWhen I wrote this code, only god and I knew how it worked.\nNow, only god knows it!\n\nTherefore, if you are trying to understand anything here,\ngood luck.', 'font-size:16px');
        console.log('%ctotal_hours_wasted_here %c= %c69420%c;', 'font-size:18px;color:#3e54a3', 'font-size:18px', 'font-size:18px;color:#31a09e', 'font-size:18px');

        if (app.debugMode) console.log('debug mode enabled, cool! :)');
    },100);
});