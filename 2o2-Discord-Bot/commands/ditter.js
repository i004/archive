const discord = require('discord.js');
const BaseCommand = require('../core/BaseCommand');

module.exports = class Ditter extends BaseCommand {
    constructor (client) {
        super({
            client,
            name: 'ditter',
            description: 'Ditter',
            subcommands: [ 'commands/ditter/*' ]
        });
    }
}