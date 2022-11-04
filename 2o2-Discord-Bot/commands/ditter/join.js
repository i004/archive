const discord = require('discord.js');
const BaseCommand = require('../../core/BaseCommand');

module.exports = class Ditter extends BaseCommand {
    constructor (client) {
        super({
            client,
            name: 'join',
            description: 'Return to the ditter you left',
            descriptionLocalizations: { ru: 'Вернутся в диттер из которого вы вышли', uk: 'Повернутся до дитеру з якого ви вийшли' },
            options: [
                {
                    name: 'channel',
                    type: 'STRING',
                    description: 'Ditter you want to join',
                    descriptionLocalizations: { ru: 'Диттер, в который вы хотите зайти', uk: 'Дітер, в який ви хочете зайти' },
                    autocomplete: true,
                    required: true
                }
            ]
        });
    }

    /**
     * 
     * @param {discord.AutocompleteInteraction} i 
     */
    async component (i) {
        if (!i.isAutocomplete()) return;

        const focused = i.options.getFocused(true);
        if (focused.name != 'channel') return;

        const ditters = await this.client.db.all("select * from ditters");
        const left = await this.client.db.all('select * from ditter_left where uid=$1', [i.user.id]);

        await i.respond(
            ditters
              .filter(x => left.find(y => y.cid == x.cid) && x.name.startsWith(focused.value.replace(/^dt-/, '')) && x.uid != i.user.id)
              .map(x => ({ channel: this.client.channels.cache.get(x.cid), ...x }))
              .slice(0, 25)
              .map(x => ({ name: x.channel.name, value: x.channel.id }))
        )
    }

    /**
     * 
     * @param {discord.CommandInteraction} i 
     */
    async run (i) {
        const cid = i.options.getString('channel');
        const ditter = await this.client.db.fetch("select * from ditters where cid=$1", [cid]);

        /**
         * @type {discord.TextChannel}
         */
        const channel = this.client.channels.cache.get(cid);

        if (!ditter || !channel || ditter.uid == i.user.id) return;

        await this.client.db.exec("delete from ditter_left where cid=$1 and uid=$2", [cid, i.user.id]);
        await channel.permissionOverwrites.delete(i.user.id);

        await i.reply({ ephemeral: true, content: 'Вы успешно вернулись в этот диттер.' })
    }
}