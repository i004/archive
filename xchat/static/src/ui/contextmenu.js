const contextMenus = [
    {
        predicate: (e) => e.parentElement.classList.contains('group') && !e.parentElement.classList.contains('add'),
        getElements: (e) => {
            const id = e.parentElement.getAttribute('data-group-id');
            const group = app.client.groups.get(id);

            const el = [
                { title: e.parentElement.getAttribute('data-group-name') },
                { text: 'Copy ID', id: 'copyId' },
            ];

            if (group.permissions?.get('me')?.SEND_MESSAGES || group.isOwner)
                el.push({ text: 'Rename', id: 'rename' });
            
            if (id != '0')
                el.push(group.isOwner ? { text: 'Delete', id: 'remove', color: '#e74c3c' } : { text: 'Leave', id: 'remove', color: '#e74c3c' });

            return el;
        },
        actions: {
            copyId: (e) => clipboard(e.parentElement.getAttribute('data-group-id')),
            remove: async (e) => {
                const id = e.parentElement.getAttribute('data-group-id');
                const isOwner = e.parentElement.getAttribute('data-is-owner') == 'true';
                
                await app.client.asend(3, { id }, isOwner ? 'GROUP_DELETE': 'GROUP_LEAVE');
                
                document.getElementById(`group-${id}`).remove();
                app.client.groups.remove(id);

                if (app.selectedGroup == id)
                    app.changeGroup('0');
            },
            rename: async (e) => {
                const id = e.parentElement.getAttribute('data-group-id');
                
                showModal('Rename Group', `<input id="689124" type="text" placeholder="New Name" minlength="2" maxlength="32">`, [
                    { label: 'Cancel', action () {
                        return true;
                    } },
                    { label: 'Rename', action () {
                        const name = document.getElementById('689124').value;

                        if (!name)
                            return 'Specify name, please';
                        
                        if (name.length < 2)
                            return `Too short!`;
                        
                        app.client.asend(3, { id, name }, 'GROUP_EDIT');
                        return true;
                    } },
                ])
            }
        }
    },
    {
        predicate: (e) => e.classList.contains('user'),
        getElements: (e) => {
            const id = e.getAttribute('data-user-id');
            const name = e.classList.contains('message-user-mention') ? e.innerHTML.slice(1) : e.innerHTML;

            return [
                { title: name, color: `#${id.slice(0, 6)}` },
                { text: 'Copy ID', id: 'copyId' },
                { text: 'Mention', id: 'mention' },
                ...(id != '0' && id != app.client.user.publicId
                    ? [{ text: app.blockedUsers.includes(id) ? 'Unblock User' : 'Block User', id: 'block', color: '#e74c3c' }]
                    : [])
            ];
        },
        actions: {
            copyId (e) {
                return clipboard(e.getAttribute('data-user-id'));
            },
            block (e) {
                const id = e.getAttribute('data-user-id');

                if (!app.blockedUsers.includes(id)) { 
                    app.blockedUsers.push(id);
                    app.createMessage({
                        ephemeral: true,
                        content: `Successfully blocked @${id}. You will no longer see any messages from them.`,
                        flags: [ 'system' ],
                        author: { username: 'XChat', publicId: '0' }
                    });
                } else {
                    app.blockedUsers.splice(app.blockedUsers.indexOf(id), 1);
                    app.createMessage({
                        ephemeral: true,
                        content: `Successfully unblocked @${id}.`,
                        flags: [ 'system' ],
                        author: { username: 'XChat', publicId: '0' }
                    });
                }

                Cookies.set('blocked-users', app.blockedUsers.join(','));
            },
            mention (e) {
                const input = document.getElementById('message-input-textarea');
                input.value += `@${e.getAttribute('data-user-id')} `;
                input.focus();
            },
        }
    },
    {
        predicate (e) {
            while (e.parentNode && e.parentNode.tagName != 'BODY') { // help
                if (e.classList.contains('message-content') || e.classList.contains('message-header')) {
                    this._target = e;
                    this.actions._target = e; // oh no, we are doing shitcode again!
                    return true;
                }

                e = e.parentNode;
            }
            return false;
        },
        getElements () {
            const authorId = this._target.parentElement.getAttribute('data-author-id');
            const id = this._target.id || this._target.parentElement.getAttribute('data-id');

            const el = [
                { text: 'Copy ID', id: 'copyId' },
                { text: 'Copy Content', id: 'copyContent' },
                { text: 'Reply', id: 'reply' },
            ];

            if (authorId == app.client.user.publicId && app.messages.get(id)?.content)
                el.push({ text: 'Edit Message', id: 'edit' });
            
            if (authorId == app.client.user.publicId || app.group.isOwner || app.group.permissions?.get('me')?.MANAGE_MESSAGES)
                el.push({ text: 'Delete Message', id: 'delete', color: '#e74c3c' });

            return el;
        },
        actions: {
            copyId () {
                return clipboard(this._target.id || this._target.parentElement.getAttribute('data-id'));
            },
            copyContent () {
                return clipboard(app.messages.get(this._target.id || this._target.parentElement.getAttribute('data-id')).content);
            },
            reply () {
                const input = document.getElementById('message-input-textarea');

                input.value = `/reply ${this._target.id || this._target.parentElement.getAttribute('data-id')} ${input.value}`;
                input.focus();
            },
            edit () {
                const input = document.getElementById('message-input-textarea');
                const id = this._target.id || this._target.parentElement.getAttribute('data-id');

                input.value = `/edit ${id} ${input.value || app.messages.get(id).content}`;
                input.focus();
            },
            delete () {
                app.client.send(3, {
                    id: this._target.id || this._target.parentElement.getAttribute('data-id'),
                    groupId: app.selectedGroup
                }, 'MESSAGE_DELETE');
            }
        }
    }
];

let __ctx = null;

function showContextMenu (ctx, e, cl=false) {
    __ctx = ctx;
    __ctx.target = e.target;
    __ctx.elements = ctx.getElements(e.target);
    __ctx.cl = cl;
    
    const el = document.getElementById('contextmenu');
    
    el.innerHTML = ctx.elements
        .map((x) => `<div class="ctxitem${x.title ? " title" : ""}" data-id="${x.id}"${x.color ? ` style="color:${x.color}"` : ""}>${escapeHTML(x.text || x.title)}</div>`)
        .join('');

    el.style = 'display: block';
    el.classList.add('visible');

    if (el.clientWidth + e.clientX > window.innerWidth)
        el.style.right = `${window.innerWidth - e.clientX - 5}px`;
    else el.style.left = `${e.clientX - 5}px`;
    
    if (el.clientHeight + e.clientY > window.innerHeight)
        el.style.bottom = `${window.innerHeight - e.clientY - 5}px`;
    else el.style.top = `${e.clientY - 5}px`;
}

function hideContextMenu () {
    if (!__ctx) return;

    const el = document.getElementById('contextmenu');
    __ctx = null;

    el.classList.remove('visible');
    el.innerHTML = '';
    el.style = '';
}

window.addEventListener('load', () => {
    const el = document.getElementById('contextmenu');

    document.querySelector('body').addEventListener('contextmenu', (e) => {
        if (e.target.tagName == 'TEXTAREA' || e.target.tagName == 'INPUT')
            return;

        e.preventDefault();
        const ctx = contextMenus.find(x => x.predicate(e.target));
        
        if (!ctx)
            return hideContextMenu();

        showContextMenu(ctx, e);
    });

    document.addEventListener('click', (e) => {
        if (__ctx)
        if (e.target.classList.contains('ctxitem')) {
            __ctx.actions[e.target.getAttribute('data-id')]?.(__ctx.target);
            hideContextMenu();
        } else if (e.target.offsetParent != el) {
            if (__ctx.cl) // shitty bugfix because e.stopPropagation() doesn't work for some reason
                return __ctx.cl = false;
            hideContextMenu();
        }
    });

    document.addEventListener('keydown', (e) => {
        if (e.key == 'Escape' && __ctx) {
            hideContextMenu();
        }
    })
});