const discord = require('discord.js');
const BaseCommand = require('../../core/BaseCommand');

module.exports = class Profile extends BaseCommand {
    constructor (client) {
        super({
            client,
            name: 'view',
            description: 'View your profile',
            descriptionLocalizations: {
                ru: 'Просмотреть свой профиль',
                uk: 'Переглянути свій профіль'
            },
            options: [
                {
                    name: 'user',
                    description: 'User',
                    descriptionLocalizations: { ru: 'Пользователь', uk: 'Користувач' },
                    type: 'USER'
                }
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
        const member = i.options.getMember('user', false) ?? i.member;
        const user = member.user;
        const profile = await this.client.db.fetch('select * from profile where uid=$1', [user.id]);

        if (!profile)
            if (user.id == i.user.id)
                return i.reply({ content: `У вас нет профиля.`, ephemeral: true, components: [
                    new discord.MessageActionRow()
                        .addComponents(
                            new discord.MessageButton({
                                label: 'Создать',
                                style: 'PRIMARY',
                                customId: 'createProfile::$'
                            })
                        )
                ] })
            else 
                return i.reply({ content: `У **${user.tag}** нет профиля.`, ephemeral: true })

        await user.fetch();
        await i.reply(await this.client.command('profile').profileMessage(user, profile));
    }
}