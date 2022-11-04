const discord = require('discord.js');
const BaseCommand = require('../core/BaseCommand');
const {$} = require('../index');

module.exports = class DisrepSlash extends BaseCommand {
    constructor (client) {
        super({
            client,
            name: 'disrep',
            description: 'Lower Reputation',
            descriptionLocalizations: {
                ru: 'Уменьшить репутацию',
                uk: 'Зменшити репутацію'
            },
            options: [
                {
                    name: 'user',
                    type: 'USER',
                    description: 'User',
                    descriptionLocalizations: {
                        ru: 'Пользователь',
                        uk: 'Користувач',
                    },
                    required: true
                },
                {
                    name: 'anonymous',
                    type: 'BOOLEAN',
                    description: 'Hide the message?',
                    descriptionLocalizations: {
                        ru: 'Скрыть сообщение?',
                        uk: 'Сховати повідомлення?',
                    },
                    required: true
                },
            ]
        });
    }

    /**
     * 
     * @param {discord.CommandInteraction} i 
     */
    async run (i) {
        /**
         * @type {discord.GuildMember}
         */
        const member = i.options.getMember('user');
        const user = member.user;

        if (user.bot || user.id == i.user.id)
            return await i.reply({ content: 'Вы не можете изменять репутацию этому пользователю.', ephemeral: true });
        
        if (await $.cooldown(`rep-${i.user.id}-${user.id}`).active())
            return await i.reply({ content: `Вы уже изменяли этому пользователю репутацию в последние 24 часа. Повторите позже <t:${await $.cooldown(`rep-${i.user.id}-${user.id}`).duration()}:R>.`, ephemeral: true });
        
        if (await $.cooldown(`rep-${i.user.id}`).active())
            return await i.reply({ content: `Вы уже изменяли кому-то репутацию в последний час. Повторите позже <t:${await $.cooldown(`rep-${i.user.id}`).duration()}:R>.`, ephemeral: true });

        await $.cooldown(`rep-${i.user.id}-${user.id}`).set(12 * 3600 * 1000);
        await $.cooldown(`rep-${i.user.id}`).set(1800 * 1000);

        await $.changeKarma(user, 'reputation', -1, 'REP', i.user.id);
        await i.reply({ content: `<:ic_downvote:973214298354634772> Репутация **${user.tag}** была понижена.`, ephemeral: i.options.getBoolean('anonymous', false) });
    }
}