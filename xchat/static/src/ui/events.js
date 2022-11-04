window.addEventListener('load', () => {
    document.addEventListener('click', async (e) => {
        const parentElement = e.target.parentElement;

        if (e.target.classList.contains('user')) {
            if (e.shiftKey) {
                const input = document.getElementById('message-input-textarea');
                
                input.value += `@${e.target.getAttribute('data-user-id')} `;
                input.focus();
            } else {
                const rect = e.target.getBoundingClientRect();
                
                showContextMenu(contextMenus[1], { target: e.target, clientX: rect.x, clientY: rect.y + e.target.offsetHeight + 5 }, true);
                e.preventDefault();
                e.stopPropagation();
            }
        }
        
        if (parentElement?.classList?.contains('group')) {
            if (parentElement.classList.contains('add')) {
                return showModal('Add Group', null, [
                    { label: 'Join Group', async action () {
                        showModal('Join Group', '<input id="689124" type="text" placeholder="Enter group ID" maxlength="24">', [
                            { label: 'Join', async action() {
                                const id = document.getElementById('689124').value;

                                if (!id || !id.match(/^-?[0-9a-f]+$/))
                                    return `Invalid ID!`;
        
                                if (id == app.client.user.publicId)
                                    return `Eeh?.. You can't join yourself.<br>How sad :(`;
        
                                if (app.client.groups.has(id))
                                    return true;
        
                                try {
                                    const group = await app.client.asend(3, { id }, 'GROUP_JOIN');
                                    app.client.groups.set(group.id, new Group(group, app.client));
        
                                    app.updateGroupList();
                                    app.changeGroup(id);
                                } catch (err) {
                                    return 'Could not join this group';
                                }
        
                                return true;
                            } }
                        ]);
                    } },
                    { label: 'Create Group', async action () {
                        let eee = false;
                        showModal('Create Group', `
                            <input id="689124" type="text" placeholder="Enter group name" maxlength="32"><br><br>
                            <label for="967401" class="radio">
                                <input type="radio" name="type" id="967401" checked>
                                <span data-detailed-desc="Group ID is required to join">Public Group</span>
                            </label><br>
                            <label for="237395" class="radio">
                                <input type="radio" name="type" id="237395">
                                <span data-detailed-desc="Temporary invite is required to join">Private Group</span>
                            </label><br>
                        `, [
                            { label: 'Create', async action() {
                                const name = document.getElementById('689124').value;
                                const isPrivate = document.getElementById('237395').checked;

                                if (isPrivate)
                                    return 'Not implemented yet, sorry!';

                                if (!name && (eee = true)) return 'Specify name, please';
                                if (name == 'name, please' && eee) return 'Not literally...';
                                
                                if (name.length < 2)
                                    return `Too short!`;
                                
                                try {
                                    const group = await app.client.asend(3, { name, type: isPrivate ? 'PRIVATE_GROUP' : 'PUBLIC_GROUP' }, 'GROUP_CREATE');
                                    app.client.groups.set(group.id, new Group(group, app.client));

                                    app.updateGroupList();
                                    app.changeGroup(group.id);
                                } catch (err) {
                                    return 'Could not create the group';
                                }

                                return true;
                            } }
                        ]);
                    } },
                ], 'center');
            }

            if (parentElement.classList.contains('current'))
                return;

            app.changeGroup(parentElement.getAttribute('data-group-id'));
        }
    });

    const input = document.getElementById('message-input-textarea');
    const list = document.getElementById('messages');

    let hstrI = 0;
    input.addEventListener('keydown', async (ev) => {
        input.style.height = `${Math.min(input.value.split('\n').length, 8) * 1.5}rem`;

        if (ev.ctrlKey) {
            if (ev.key == 'ArrowUp') {
                ev.preventDefault();
    
                const msg = app.messages.values()[app.messages.size- ++hstrI];
                if (hstrI >= app.messages.size) hstrI = app.messages.size;
                if (!msg?.content)
                    return;
    
                document.getElementById('message-input-textarea').value = msg.content;
            } else if (ev.key == 'ArrowDown') {
                ev.preventDefault();
    
                const msg = app.messages.values()[app.messages.size- --hstrI];
                
                if (hstrI < 1) hstrI = 1;
                if (!msg?.content)
                    return;
    
                document.getElementById('message-input-textarea').value = msg.content;
            }
        } else if (!input.value && !ev.altKey && ev.key == 'ArrowUp') {
            const lastMessage = app.messages.values().reverse().find(x => x.author.publicId == app.client.user.publicId);

            if (lastMessage) {
                ev.preventDefault();
                input.value = `/edit ${lastMessage.id} ${lastMessage.content}`;
            }
        } else if (!ev.shiftKey && ev.key == 'Enter') {
            ev.preventDefault();
            await app.submitMessage();

            list.scrollTop = list.scrollHeight;
            app.autoScroll = true;
            input.style.height = `1.5rem`;
        }
    });

    list.addEventListener('scroll', async () => {
        app.autoScroll = list.scrollHeight - list.scrollTop == list.clientHeight;

        if (list.scrollTop == 0 && app.selectedGroup != '0' && (app.group.isOwner || app.group.permissions.get('me').VIEW_OLDER_MESSAGES)) {
            const before = app.messages.keys().sort()[0];
            
            if (before == app.group.$fmsgid)
                return;

            const messages = (await app.group.fetchMessages(50, before)).reverse();

            if (messages.length == 0) {
                app.group.$fmsgid = before;
                return;
            }
            
            messages.forEach(x => app.messages.set(x.id, x));
            list.innerHTML = messages.map(x => messageToHTML(x)).join('') + list.innerHTML;

            const offset = document.getElementById(before)?.parentElement?.parentElement?.offsetTop - 10;
            list.scrollTop = offset;
        }
    })

    document.addEventListener('keyup', async (ev) => {
        if (ev.altKey)
        if (ev.key == 'ArrowDown') {
            ev.preventDefault();
            
            const groups = app.client.groups.keys();
            const current = groups.indexOf(app.selectedGroup);

            if (current < groups.length - 1)
                app.changeGroup(groups[current + 1]);
        } else if (ev.key == 'ArrowUp') {
            ev.preventDefault();
            
            const groups = app.client.groups.keys();
            const current = groups.indexOf(app.selectedGroup);

            if (current > 0)
                app.changeGroup(groups[current - 1]);
        }
    })
})