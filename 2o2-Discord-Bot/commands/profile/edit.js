const discord = require('discord.js');
const BaseCommand = require('../../core/BaseCommand');

module.exports = class Profile extends BaseCommand {
    constructor (client) {
        super({
            client,
            name: 'edit',
            description: 'Edit Profile',
            descriptionLocalizations: { ru: 'Изменить профиль', uk: 'Змінити профіль' }
        });
    }

    /**
     * 
     * @param {discord.CommandInteraction} i 
     */
    async run (i) {
        const profile = await this.client.db.fetch('select * from profile where uid=$1', [i.user.id]);

        if (!profile)
            return i.reply({ content: `У вас нет профиля.`, ephemeral: true })

        await i.user.fetch();

        i.user.$profileCreate = {
            ...profile,
            colorSource: 'BANNER',
            bannerSource: 'BANNER',
            fields: JSON.parse(profile.fields),
            options: JSON.parse(profile.options),
            mode: 'EDITING'
        };

        await i.reply(await this.client.command('profile').subcommands.get('create').generateMessage(i, 'EDITING'));
    }
}