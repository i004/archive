const Discord = require('discord.js');
const config = require('./config.json');
const { Bot } = require('./modules/BotCore');
const { glob } = require('glob');
const { postHastebin } = require('./modules/API');

const bot = new Bot({
    restTimeOffset: 0,
    intents: new Discord.Intents(['GUILD_MESSAGES', 'GUILDS']),
    allowedMentions: { parse: [] },
    config
});

glob('commands/**/*.js', (err, files) => {
    if (err) console.error(err);
    else {
        files.forEach((file) => {
            try {
                bot.addCommand(require(`./${file}`), file);
            } catch (err) {
                console.error(`Error in ${file}\n${err.stack}`);
            }
        })
    }
});

process.on('uncaughtException', async (err) => {
    console.error(err);
    try {
        const channel = await bot.channels.fetch('858640364050055218');
        await channel.send(`Uncaught exception\n${err.stack.length > 1950 ? `https://hastebin.com/${await postHastebin(err.stack)}` : `\`\`\`js\n${err.stack}\n\`\`\``}`)
    } catch (e) {}
});

bot.login(config.token);