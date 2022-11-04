const discord = require('discord.js');
const BaseCommand = require('../core/BaseCommand');

module.exports = class Feedback extends BaseCommand {
    constructor (client) {
        super({
            client,
            name: 'feedback',
            description: 'Feedback',
            descriptionLocalizations: { ru: 'Отзывы', uk: 'Відгуки' },
            subcommands: [ 'commands/feedback/*.js' ]
        });
    }
}