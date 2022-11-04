const { Intents } = require('discord.js');
const Client = require('./core/Client');
const config = require('./config.json');
require('colors');

const client = new Client({
    intents: [ Intents.FLAGS.GUILDS, Intents.FLAGS.GUILD_MEMBERS, Intents.FLAGS.GUILD_INVITES, Intents.FLAGS.GUILD_MESSAGES,
               Intents.FLAGS.GUILD_MESSAGE_REACTIONS, Intents.FLAGS.GUILD_VOICE_STATES, Intents.FLAGS.GUILD_MESSAGE_TYPING,
               Intents.FLAGS.GUILD_PRESENCES ],
    restTimeOffset: 0,
    allowedMentions: { parse: [] }
});

module.exports = client;

client.loadModules('./modules/*')
      .registerGuildCommands(config.guildId, './commands/*')
      .login(config.tokens.bot);