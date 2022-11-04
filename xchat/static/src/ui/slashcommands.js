const commands = [
    {
        name: 'help',
        exec () {
            return [
                `Commands\n`,
                `| Name     | Arguments                  | Description                      |`,
                `|----------|----------------------------|----------------------------------|`,
                `| /help    |                            | This message                     |`,
                `| /debug   |                            | Debug information                |`,
                `| /edit    | \`<ID>\` \`[new content]\` | Edit a message                   |`,
                `| /reply   | \`<ID>\` \`<content>\`     | Reply to message                 |`,
                `| /hide    | \`(groups\\|members)\`     | Hides group list or member list  |`,
                `| /show    | \`(groups\\|members)\`     | The opposite of \`/hide\`        |`,
                `| /group   |                            | Group management                 |`,
                `**tip:** press arrow up to quickly edit your last message\n`
            ].join('\n')
        }
    },
    {
        name: 'debug',
        exec () {
            return [
                `Debug Information\n`,
                `| Key          | Value |`,
                `|--------------|-------|`,
                `| Heartbeat    | ${app.client.heartbeat || "?"}ms |`,
                `| Public ID    | ${app.client.user.publicId} |`,
                `| Groups       | ${app.client.groups.size} |`,
                `| Cached Users | ${app.client.users.size} |`,
            ].join('\n')
        }
    },
    {
        name: 'edit',
        exec (args) {
            if (!args[0])
                return `Usage: \`/edit <message ID> [new content]\``;

            if (!app.messages.has(args[0]))
                return `Unknown message`;

            const message = app.messages.get(args[0]);
            if (message.author.publicId != app.client.user.publicId)
                return `You can't edit messages from other users`;

            if (!args[1])
                return app.client.send(3, {
                    id: message.id,
                    groupId: app.selectedGroup
                }, 'MESSAGE_DELETE');

            app.client.send(3, {
                id: message.id,
                groupId: app.selectedGroup,
                content: args.slice(1).join(' ')
            }, 'MESSAGE_UPDATE');
        }
    },
    {
        name: 'reply',
        exec (args) {
            if (!args[0] || !args[1])
                return `Usage: \`/reply <message ID> <content>\``;

            if (!app.messages.has(args[0]))
                return `Unknown message`;

            const message = app.messages.get(args[0]);
            
            app.client.send(3, {
                groupId: app.selectedGroup,
                content: args.slice(1).join(' '),
                flags: [`replying to ${message.author.username}`],
            }, 'MESSAGE_CREATE');
        }
    },
    {
        name: 'hide',
        exec (a) {
            if (a[0] == 'groups')
                document.getElementById('groups').parentElement.style = 'display: none';
            else if (a[0] == 'members')
                document.getElementById('members').parentElement.style = 'display: none';
            else return `Usage: \`/hide (groups|members)\``;

            return `Hide ${a[0]}`;
        }
    },
    {
        name: 'show',
        exec (a) {
            if (a[0] == 'groups')
                document.getElementById('groups').parentElement.style = '';
            else if (a[0] == 'members')
                document.getElementById('members').parentElement.style = '';
            else return `Usage: \`/show (groups|members)\``;

            return `Show ${a[0]}`;
        }
    },
    {
        name: 'group',
        async exec (a) {
            if (!a[0]) {
                return [
                    `You are currently in group \`${app.group.name}\` (\`${app.group.id}\`)\n`,
                    `Sub-commands`,
                    `| Name | Arguments | Description |`,
                    `|----------------|-------------------|----------------------------------|`,
                    `| /group list    |                   | List of your groups you are in   |`,
                    `| /group join    | \`<ID>\`          | Join a group                     |`,
                    `| /group leave   | \`[ID or index]\` | Leave the group                  |`,
                    `| /group select  | \`<ID or index>\` | Select group                     |`,
                    `| /group create  | \`<name>\`        | Create group                     |`,
                    `| /group members |                   | List of members in current group |`,
                    ``,
                    `(you can also use index from \`/group list\` instead of ID)`
                ].join('\n')
            } else if (a[0] == 'list')
                return `Groups\n| Index | ID | Name |\n|---|---|---|\n${app.client.groups.values().map((x, i) => `| ${i} | ${x.id} | ${x.name.replace(/\|/g, '\\|')} |`).join('\n')}`;
            else if (a[0] == 'join') {
                if (!a[1])
                    return `Usage: \`/group join <ID>\``;

                try {
                    const group = await app.client.asend(3, { id: a[1] }, 'GROUP_JOIN');
                    app.client.groups.set(group.id, new Group(group, app.client));
    
                    app.updateGroupList();
                    app.changeGroup(group.id);
                } catch (err) {
                    return `Could not join this group`;
                }
            } else if (a[0] == 'leave') {
                const group = a[1] ? app.client.groups.values()[a[1]] || app.client.groups.get(a[1]) : app.group;

                if (!group || group.id == '0' || group.isOwner)
                    return `Cannot leave this group`;

                await app.client.asend(3, { id: group.id }, 'GROUP_LEAVE');
                document.getElementById(`group-${group.id}`).remove();
                app.client.groups.remove(group.id);

                if (app.selectedGroup == group.id)
                    app.changeGroup('0');
            } else if (a[0] == 'select') {
                if (!a[1])
                    return `Usage: \`/group select <ID or index>\``;

                const group = app.client.groups.values()[a[1]] || app.client.groups.get(a[1]);

                if (!group || group.id == app.selectedGroup)
                    return `Unknown group`;
                
                app.changeGroup(group.id)
            } else if (a[0] == 'create') {
                if (!a[1])
                    return `Usage: \`/group create <name>\``;
                
                if (a[1].length < 2 || a[1].length > 32)
                    return `Name should be between 2 and 32 characters`;

                const group = await app.client.asend(3, { name: a[1] }, 'GROUP_CREATE');
                app.groups.set(group.id, new Group(group, app.client));

                app.updateGroupList();
                app.changeGroup(group.id);
            } else if (a[0] == 'members')
                return `Members (${app.group.members.size}):\n${app.group.members.keys().slice(0, 50).map((x, i) => `@${x}${i>1&&i%10==0?"\n":""}`).join(' ')}`;
        }
    }
]

async function execCommand(input) {
    if (!input?.startsWith('/'))
        return false;

    const args = input.slice(1).split(/ +/g);
    const command = commands.find(x => x.name == args[0]);

    if (!command)
        return false;

    const output = await command.exec(args.slice(1));

    if (output) {
        const message = {
            id: uuid.v4(),
            createdAt: Date.now(),
            content: output,
            ephemeral: true,
            flags: ['command'],
            author: {
                username: `/${command.name}`,
                publicId: `0`
            }
        };

        document.getElementById('messages').innerHTML += messageToHTML(message);
        app.messages.set(message.id, message);
    }

    return true;
}