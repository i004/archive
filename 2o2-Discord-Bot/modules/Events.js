const discord = require('discord.js');
const emoji = require('node-emoji');
const config = require('../config.json');
const {$} = require('../index');

module.exports = class Events {
    /**
     * 
     * @param {import('../core/Client')} client 
     */
    constructor (client) {
        this.client = client;
        
        this.client.on('ready', async () => {
            console.log('Ready');
        });

        this.client.on('guildMemberUpdate', async (before, after) => {
            if (before.user.bot || before.guild.id != config.guildId) return;
            if (!after.pending && !after.roles.cache.has('958723582660325417'))
                await after.roles.add('958723582660325417');
        })

        this.client.on('interactionCreate', async (i) => {
            if (i.isButton() && i.customId == 'привет-всем-кто-это-читает-напишите-69420-в-лс-тдеву')
                await i.reply({ ephemeral: true, content: 'Кнопка.' });
        })

        this.client.on('channelDelete', async (channel) => {
            await this.client.db.exec("DELETE FROM ditters WHERE cid=$1", [channel.id]);
            await this.client.db.exec("DELETE FROM chatrooms WHERE cid=$1", [channel.id]);
        })

        this.client.on('messageUpdate', async (before, after) => {
            if (after.author.bot || after.guildId != config.guildId) return;

            if (before.content != after.content)
            this.client.channels.cache.get('973648900097462322').send({
                content: `[${after.id}] edited\n${after.attachments.map(x => x.url)}`,
                embeds: [{ description: after.cleanContent || '[empty]' }]
            })
        });

        this.client.on('messageDelete', async (message) => {
            if (message.guildId != config.guildId) return;

            if (!message.author.bot)
            this.client.channels.cache.get('973648900097462322').send({ content: `[${message.id}] deleted` })

            if (message.channelId == '960933085220843540' && message.thread)
                message.thread.delete().catch(() => {});
        })

        this.client.on('messageCreate', async (message) => {
            if (!message.guild || message.author.bot || message.guildId != config.guildId) return;
            
            this.client.channels.cache.get('973648900097462322').send({
                content: `[${message.id}] \`${message.author.tag}\` (\`${message.author.id}\`) in \`${message.channel.name}\` (\`${message.channelId}\`)\n${message.attachments.map(x => x.url)}`,
                embeds: [{ description: message.cleanContent || '[empty]' }]
            })
            this.client.db.exec('insert into meta values ($1, null, null, $2) on conflict (uid) do update set last_message_at=excluded.last_message_at', [message.author.id, Date.now()]);

            if (message.content && message.content.toLowerCase().replace(/\s+/g, ' ').replace(/[^a-zа-я0-9 ]/g, '').match(/([dд]+\s?[оаoa0]+\s?[рp]+\s?[иu]+\s?[аa]+?\s?[nhнй]+)|([dд]+\s?[oо0]+\s?[rpр]+\s?[iи]+\s?[аa]+\s?[nhнй]+)|([дd]+\s?[аоao0]+\s?[pр]+\s?[иu]+\s?[kк]+)/g)) {
                this.client.channels.cache.get('959122558836437063').send(`TRIGGERED ON\n\`\`\`${message.content.slice(0, 1900)}\`\`\`\nby ${message.author.id} in ${message.channel.id}`)
                return await message.delete();
            }

            if (message.content && message.content.includes('960595355303559248')) {
                const em = emoji.unemojify(message.cleanContent).match(/\:[a-z]+\:/g).map(x => emoji.get(x));
                em.forEach(x => x ? message.react(x).catch(() => {}) : 0)
            }
        
            const ditter = await this.client.db.fetch("select * from ditters where cid=$1", [message.channelId]);

            if (message.attachments.size > 0 && !['957650553817661460', '960933085220843540'].includes(message.channelId)) {
                message.react('⭐');
                if (ditter) {
                    const copt = await $.ditterOptions(ditter.cid);
                    if (copt.repost_from) message.react('<:repost:960980365441372180>');
                } else message.react('<:repost:960980365441372180>');
            }

            if (ditter)
                await this.client.db.exec("update ditters set last_message_at=$1 where cid=$2", [~~(Date.now()/1000), message.channelId]);
        })

        this.client.on('raw', async (packet) => {
            if (packet.t == 'MESSAGE_REACTION_ADD' && ['🧵', 'threadchannel'].includes(packet.d.emoji.name)) {
                const ditter = await this.client.db.fetch("SELECT * FROM ditters WHERE cid=$1", [packet.d.channel_id]);
                if (!ditter) return;

                const message = await $.fetchMessage(packet.d.channel_id, packet.d.message_id);
                if (message.hasThread) return;

                const threads = $.counter(`threads::${packet.d.channel_id}`);

                await threads.add(1);

                const thread = await message.startThread({
                    name: `Обсуждение (${await threads.get()})`
                });

                await thread.members.add(packet.d.user_id);
                
                await message.channel.fetch();
                if (message.channel.lastMessage?.system) await message.channel.lastMessage.delete();
            }

            if (packet.t == 'MESSAGE_REACTION_ADD' && ['repost', '↩', '↪️'].includes(packet.d.emoji.name)) {
                const ditter = await this.client.db.fetch("SELECT * FROM ditters WHERE cid=$1", [packet.d.channel_id]);
                const copt = await $.ditterOptions(ditter?.cid);
                if (ditter && !copt.repost_from) return;
                
                const tditters = await this.client.db.all("SELECT * FROM ditters WHERE uid=$1 ORDER BY last_message_at DESC", [packet.d.user_id]);
                const target_ditter = (
                    await Promise.all(tditters.map(async (x) => ({ ...x, repost_to: (await $.ditterOptions(x.cid)).repost_to })))
                ).find(x => x.repost_to);

                if (!target_ditter) return;

                /**
                 * @type {discord.TextChannel}
                 */
                const channel = this.client.channels.cache.get(target_ditter.cid);
                const webhooks = await channel.fetchWebhooks();
                const webhook = webhooks.size > 0 ? webhooks.first() : await channel.createWebhook('Ditter');
                
                const message = await $.fetchMessage(packet.d.channel_id, packet.d.message_id);
                const content = message.content.split('\n').map(x => '> ' + (x.startsWith('> ') ? `|| ||   ${x.replace(/^> /, '')}` : x)).filter(x => x.trim().length > 1).join('\n');

                await this.client.module('ImageUtils').registerAvatarEmoji(message.author);

                await webhook.send({
                    username: `re:${ditter?.name ?? message.channel.name}`,
                    avatarURL: 'https://cdn.discordapp.com/attachments/939532062153637940/960975037098229840/610162a08147d9e3c3198c32c9deada9.png',
                    content: `> ${this.client.module('ImageUtils').resolveAvatarEmoji(message.author)} **[${message.author.username}](<${message.url}>)**\n${content.slice(0, 1000)}${content.length > 1000 ? "..." : ""}\n${message.embeds.length > 0 ? "<:attachment:934760572455620608> Прикрепление\n" : ""}${message.attachments.size > 0 ? `${message.attachments.map(x => `[${x.name}](${x.url})`).join(" ")}` : ""}`,
                    allowedMentions: { parse: [] }
                })
            }
        });

        this.client.on('raw', async (packet) => {
            if (['MESSAGE_REACTION_ADD', 'MESSAGE_REACTION_REMOVE'].includes(packet.t)) {
                if (packet.d.emoji.name != '⭐' || packet.d.guild_id != config.guildId) return;
                
                const user = await this.client.users.fetch(packet.d.user_id);
                if (user.bot) return;

                const message = await $.fetchMessage(packet.d.channel_id, packet.d.message_id);
                
                if (packet.d.user_id != message.author.id) {
                    if (!message.reactions.resolve('⭐')) return;
                    const users = await message.reactions.resolve('⭐').users.fetch();
                    const count = users.filter(x => x.id != message.author.id && !x.bot).size;
                    const dsmsg = await this.client.db.fetch("SELECT * FROM starboard WHERE mid=$1", [message.id]);
                    if (count >= 4 && !dsmsg) {
                        const embed = new discord.MessageEmbed()
                            .setFooter({ text: message.author.tag, iconURL: message.author.avatarURL()})
                            .setDescription(`${message.content.slice(0, 4000)}`)
                            .setTimestamp();
                        if (message.attachments.size > 0) embed.setImage(message.attachments.first().url);
                        const webhook = (await this.client.channels.cache.get('959394384464474162').fetchWebhooks()).first();
                        const nmessage = await webhook.send({
                            content: `:star: [**${count}**](<${message.url}>)`,
                            embeds: [embed],
                        })
                        await this.client.db.exec("INSERT INTO starboard VALUES ($1, $2, $3, $4)", [message.id, message.channel.id, nmessage.id, message.author.id]);
                    } else if (dsmsg) {
                        const webhook = (await this.client.channels.cache.get('959394384464474162').fetchWebhooks()).first();
                        webhook.editMessage(dsmsg.sid, { content: `**[:star: ${count}](<${message.url}>)**` }).catch(() => {});
                    }
                }
            }
        })
        
        this.client.on('channelUpdate',
        /**
         * 
         * @param {discord.TextChannel} before 
         * @param {discord.TextChannel} after 
         */
        async (before, after) => {
            if (!after.isText()) return;

            const ditter = await this.client.db.fetch("SELECT * FROM ditters WHERE cid=$1", [after.id]);
            if (!ditter) return;

            const left = await this.client.db.all("select * from ditter_left where cid=$1", [ditter.cid]);
            
            let change = false;
            for (let x of after.permissionOverwrites.cache.values()) {
                if (!x.deny.has('MANAGE_WEBHOOKS') || !x.deny.has('MENTION_EVERYONE') || !x.deny.has('MANAGE_CHANNELS')) {
                    x.allow = x.allow.remove('MANAGE_WEBHOOKS').remove('MENTION_EVERYONE').remove('MANAGE_CHANNELS')
                    x.deny = x.deny.add('MANAGE_WEBHOOKS').add('MENTION_EVERYONE').add('MANAGE_CHANNELS');
                    change = true;
                }
                
                if (x.id == '959030110458110022' && !x.deny.has('VIEW_CHANNEL')) {
                    x.allow = x.allow.remove('VIEW_CHANNEL');
                    x.deny = x.deny.add('VIEW_CHANNEL');
                    change = true;
                } else if (x.id == after.guild.roles.everyone.id && x.allow.has('VIEW_CHANNEL')) {
                    x.allow = x.allow.remove('VIEW_CHANNEL');
                    change = true;
                } else if (left.find(y => y.uid == x.id) && !x.deny.has('VIEW_CHANNEL')) {
                    x.allow = x.allow.remove('VIEW_CHANNEL');
                    x.deny = x.deny.add('VIEW_CHANNEL');
                    change = true;
                } else if (x.type == 'role' && !x.deny.has('SEND_MESSAGES')) {
                    x.allow = x.allow.remove('SEND_MESSAGES');
                    x.deny = x.deny.add('SEND_MESSAGES');
                    change = true;
                }
            }

            if (!after.permissionOverwrites.cache.has('959030110458110022')) {
                change = true;
                after.permissionOverwrites.cache.set('959030110458110022', { id: '959030110458110022', type: 'role', deny: 537003024n })
            }

            if (left.find(x => !after.permissionOverwrites.cache.find(y => y.id == x.uid))) {
                change = true;

                left
                  .filter(x => !after.permissionOverwrites.cache.find(y => y.id == x.uid))
                  .forEach(x => after.permissionOverwrites.cache.set(x.id, { id: x.uid, type: 'member', deny: 537003024n }));
            }

            if (!after.permissionOverwrites.cache.has(ditter.uid)) {
                await after.permissionOverwrites.edit(await this.client.users.fetch(ditter.uid), { VIEW_CHANNEL: true, MANAGE_CHANNELS: false, MANAGE_ROLES: true, MANAGE_WEBHOOKS: false, CREATE_INSTANT_INVITE: true, SEND_MESSAGES: true, SEND_MESSAGES_IN_THREADS: true, SEND_TTS_MESSAGES: true, CREATE_PUBLIC_THREADS: true, CREATE_PRIVATE_THREADS: true, EMBED_LINKS: true, ATTACH_FILES: true, ADD_REACTIONS: true, USE_EXTERNAL_EMOJIS: true, USE_EXTERNAL_STICKERS: true, MENTION_EVERYONE: false, MANAGE_MESSAGES: true, MANAGE_THREADS: true, READ_MESSAGE_HISTORY: true, USE_APPLICATION_COMMANDS: true });
            }
            
            if (!change) return;
            after.permissionOverwrites.set(Array.from(after.permissionOverwrites.cache.values()))
            await after.fetch(true);
        })

        this.client.on('presenceUpdate', async (before, after) => {
            if (after.guild.id != config.guildId || after.user.bot) return;
            if ((before?.status != 'offline' && (after?.status == 'offline') || !after?.status)
                || ((!before?.status || before.status == 'offline') && after?.status && after?.status != 'offline'))
                await this.client.db.exec('insert into meta values ($1, null, $2) on conflict (uid) do update set last_online_at=excluded.last_online_at', [after.user.id, Date.now()]);
        });

        $.namespaceComponentCollector('system', async (x, i, a) => {
            if (x == 'delete' && i.user.id == a[0])
                return await i.message.delete();
        })
    }
}