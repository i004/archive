const discord = require('discord.js');
const BaseCommand = require('../core/BaseCommand');

module.exports = class Karma extends BaseCommand {
    constructor (client) {
        super({
            client,
            name: 'User Karma',
            nameLocalizations: {
                ru: 'Карма пользователя',
                uk: 'Карма користувача'
            },
            type: 'USER'
        });
    }

    /**
     * 
     * @param {discord.CommandInteraction} i 
     */
     async run (i) {
        const member = i.options.getMember('user', false) ?? i.member;

        if (member.user.bot) return i.reply({
            content: 'Beep boop. 01010100011010000110100101110011001000000110100101110011001000000110000100100000011000100110111101110100. Boop beep!',
            ephemeral: true
        })

        await i.reply({
            ephemeral: true,
            ...(await this.client.command('karma').generateMessage(member))
        })
    }
}