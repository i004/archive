const Bot = require('./core/Bot');
const config = require('./config.json');

const bot = new Bot({
    config: config
});

for (let module of config.modules) {
    bot.loadModule(require(module));
}

process.on('uncaughtException', function (err) {
    console.error(err);
    try { bot.channels.cache.get('810648561434755082').send(`uncaught exception\n\`\`\`js\n${err}\n\n${err.stack.slice(0, 1990)}\`\`\``) } catch(err) {}
});

bot.login(config.token);