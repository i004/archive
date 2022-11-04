const discord = require('discord.js');
const unidecode = require('unidecode');
const config = require('../config.json');
const {$} = require('../index');

module.exports = class Karma {
    /**
     * 
     * @param {import('../core/Client')} client 
     */
    constructor (client) {
        this.client = client;

        this.client.on('messageCreate', async (message) => {
            if (!message.guild || message.author.bot) return;

            await this.client.db.exec("insert into stats values ($1, 1, $2, $3) on conflict (uid) do update set messages=stats.messages+1, thread_messages=stats.thread_messages+excluded.thread_messages, file_messages=stats.file_messages+excluded.file_messages", [
                message.author.id,
                ~~(message.channel.isThread()),
                ~~(message.attachments.size > 0)
            ]);
        })

        this.rlock = {};

        this.client.on('raw', async (packet) => {
            if (packet.t == 'MESSAGE_REACTION_ADD') {
                if (packet.d.guild_id != config.guildId) return;
                await this.client.db.exec("update stats set reactions=reactions+1 where uid=$1", [packet.d.user_id]);

                const user = await this.client.users.fetch(packet.d.user_id);

                if (!user.bot && packet.d.emoji.name == '⭐') {
                    const msg = await $.fetchMessage(packet.d.channel_id, packet.d.message_id);
                    if (msg.author.id != packet.d.user_id) {
                        await this.client.db.exec("update stats set stars=stars+1 where uid=$1", [msg.author.id]);
                        await $.changeKarma(msg.author.id, 'reputation', 0.45, 'STAR_ADDED');
                    }
                }
            } else if (packet.t == 'MESSAGE_REACTION_REMOVE' && packet.d.emoji.name == '⭐' && packet.d.guild_id == config.guildId) {
                const user = await this.client.users.fetch(packet.d.user_id);
                if (user.bot) return;

                const msg = await $.fetchMessage(packet.d.channel_id, packet.d.message_id);
                
                if (msg.author.id != packet.d.user_id) {
                    await this.client.db.exec("update stats set stars=stars-1 where uid=$1", [msg.author.id]);
                    await $.changeKarma(msg.author.id, 'reputation', -0.45, 'STAR_REMOVED');
                }
            }
        })

        this.repeats = {};

        this.client.on('messageCreate', async (message) => {
            if (message.author.bot || !message.content || !message.guild) return;
            if (message.channel.isThread()) {
                const ditter = await this.client.db.fetch("SELECT * FROM ditters WHERE cid=$1", [message.channel.parentId]);
                if (!ditter || message.author.id == ditter.uid) return;
                
                const karma = this.getMessageKarma(message);

                if (karma) {
                    await $.changeKarma(message.author.id, 'message', karma * 1.25, 'POSTED_COMMENT', message.id);
                    await $.changeKarma(ditter.uid, 'message', karma, 'RECEIVED_COMMENT', message.id);
                }
            } else {
                const ditter = await this.client.db.fetch("SELECT * FROM ditters WHERE cid=$1", [message.channelId]);
                if (message.channelId != '968549637894054000' && (!ditter || message.author.id != ditter.uid || !ditter.karma_allowed)) return;
                
                const karma = this.getMessageKarma(message) * 1.5;

                if (karma) 
                    await $.changeKarma(message.author.id, 'message', karma, 'SENT_MESSAGE', message.id);
            }
        });

        this.client.on('messageDelete', async (message) => {
            if (message.author.bot || !message.guild) return;
            
            const change = await this.client.db.fetch("select * from karma_change where rid=$1", [message.id]);
            if (!change) return;

            await $.changeKarma(message.author, change.type, -change.change, 'MESSAGE_DELETED', message.id, false);
            await this.client.db.exec("delete from karma_change where rid=$1", [message.id]);
        });
    }

    getMessageKarma (message) {
        const cleanContent = unidecode(message.cleanContent)
            .replace(/`{3}.+?`{3}/gs, '')
            .replace(/https?:\/\/(www\.)?[-a-zA-Z0-9@:%._\+~#=]{1,256}\.[a-zA-Z0-9()]{1,6}\b([-a-zA-Z0-9()@:%_\+.~#?&//=]*)/g, '')
            .replace(/[^a-zA-Z0-9]/g, '');
        
        const ln = Array.from(cleanContent).filter((x,i,a) => a[i-1] != x).length;

        if (!cleanContent) return;
        if (ln > 20 && new Set(Array.from(cleanContent)).size < 5) return 0.0;

        let karma = 0.00075 * ln;
        if (message.channel.id != '968549637894054000' && message.attachments.size > 0) karma += 0.1;

        if (!this.repeats[message.author.id]) this.repeats[message.author.id] = [0, 1];

        if (this.repeats[message.author.id][0] == karma) karma /= (this.repeats[message.author.id][1]++)/2;
        else this.repeats[message.author.id] = [karma, 1];

        return Math.min(karma, 2);
    }
}