const discord = require('discord.js');
const BaseCommand = require('../../core/BaseCommand');

module.exports = class Ditter extends BaseCommand {
    constructor (client) {
        super({
            client,
            name: 'leave',
            description: 'Leave someone\'s ditter',
            descriptionLocalizations: { ru: 'Выйти из чьего-то диттера', uk: 'Вийти з чийогось диттера' },
            options: [
                {
                    name: 'channel',
                    type: 'STRING',
                    description: 'Ditter you want to leave',
                    descriptionLocalizations: { ru: 'Диттер из которого вы хотите выйти', uk: 'Диттер з якого ви хочете вийти' },
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

        const ditters = await this.client.db.all('select * from ditters');

        await i.respond(
            ditters
              .filter(x => x.name.startsWith(focused.value.replace(/^dt-/, '')) && x.uid != i.user.id)
              .map(x => ({ channel: this.client.channels.cache.get(x.cid), ...x }))
              .filter(x => x.channel.permissionsFor(i.member).has('VIEW_CHANNEL'))
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

        if (!ditter || !channel || ditter.uid == i.user.id || !channel.permissionsFor(i.user.id).has('VIEW_CHANNEL')) return;

        await channel.permissionOverwrites.edit(i.user.id, { VIEW_CHANNEL: false });
        await this.client.db.exec("insert into ditter_left values ($1, $2)", [cid, i.user.id]);

        await i.reply({ ephemeral: true, content: 'Вы успешно вышли из этого диттера.' })
    }
}