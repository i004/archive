const Discord = require('discord.js');
const { removeInvites } = require('./API');

class Context {
    /**
     * 
     * @param {Discord.Message} msg 
     */
    constructor(msg, command, args, localeCode) {
        this.msg = msg;
        this.commandName = command.name;
        this.localeCode = localeCode;
        this.locale = this.msg.client.locales[this.localeCode]
        this._args = args;
        this._replyMsg = null;
    }

    get client() { return this.msg.client }
    get user() { return this.msg.author }
    get guild() { return this.msg.guild }
    get guildID() { return this.msg.guild.id }
    get channel() { return this.msg.channel }
    get channelID() { return this.msg.channel.id }
    get createdAt() { return this.msg.createdAt }
    get createdTimestamp() { return this.msg.createdTimestamp }
    get member() { return this.msg.member }

    i18n (k, v={}) {
        return this.locale.format(k, v);
    }

    async defer() {
        this._replyMsg = await this({content: `<a:loading:858981210855833601> ${this.msg.client.user.username} is thinking...`});
        return this._replyMsg;
    }
    deferUpdate() { }

    async send(data) {
        this._replyMsg = await this.msg.channel.send(removeInvites(data));
        return this._replyMsg;
    }
    async sendDelete(data) {
        let options;
        
        if (typeof data == 'string') options = {content: data};
        else options = data;

        if (!options.components) options.components = [new Discord.MessageActionRow];
        options.components[options.components.length-1].addComponents(
            new Discord.MessageButton({
                label: '\u200b',
                emoji: {
                    name: 'delete',
                    id: '859832771698622465'
                },
                style: 'DANGER',
                customID: 'deleteOutput'
            })
        );
        await this.send(options);
        const msg = await this.fetchReply();
        const collector = msg.createMessageComponentInteractionCollector((btn) => btn.user.id == this.user.id, {time:60*1000});
        collector.on('collect', async (btn) => {
            if (btn.user.id == this.user.id && btn.customID == 'deleteOutput') {
                this.deleteReply().catch(() => {});
                btn.deferUpdate().catch(() => {});
            }
        });
    }
    deleteReply() { return this._replyMsg.delete() }
    editReply(data) { return this._replyMsg.edit(data) }
    fetchReply() { return this._replyMsg }
}

module.exports = { Context };