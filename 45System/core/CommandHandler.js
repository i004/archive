const Discord = require('discord.js');

class CommandHandler {
    constructor(bot) {
        this.bot = bot;
        
        this.bot.on('message', this.processCommands);
        this.bot.addCommand = this.addCommand;
        this.bot.loadModule = this.loadModule;

        this.commands = new Discord.Collection();
        this.modules = new Discord.Collection();
    }

    addCommand = (object) => {
        this.commands.set(object.name, object);
        if (object.onLoad)
            object.onLoad(this.bot);
    }
    
    loadModule = (Module) => {
        this.modules.set(Module.name, new Module(this.bot));
        if (Module.onLoad)
            Module.onLoad();
    }

    getCommand = (name) => {
        return this.commands.find(x => x.name === name || (x.aliases && x.aliases.includes(name)));
    }

    processCommands = async (message) => {
        if (!message.guild || message.author.bot || !message.content)
            return;
        
        if (!message.content.trim().startsWith(this.bot.config.prefix))
            return;
        
        const rawArgs = message.content.trim().slice(this.bot.config.prefix.length).trim();
        const args = rawArgs.split(/ +/g);
        
        let command, _c, i, argI;

        for (i = 1; i <= args.length; i++) {
            _c = this.getCommand(args.slice(0, i).join(' '));
            if (_c) {
                command = _c;
                argI = i;
            }
        }

        if (!command)
            return;
        
        message.localeCode = 'ru';
        message.locale = this.bot.locale.getLocale(message.localeCode);
        message.i18n = (key, keys={}) => message.locale.format(key, keys);
        message.args = args.slice(argI);
        message.rawArgs = rawArgs.slice(command.name.length).trim();
        message.command = command;
        message.bot = this.bot;
        message.send = async (...options) => message.channel.send(...options);
        message.error = async (options) => message.channel.send(new Discord.MessageEmbed({title: message.i18n("error.error"), ...options})
                                                              .setThumbnail('https://cdn.discordapp.com/emojis/849325138033246299.png?v=1')
                                                              .setColor('#BC3E45'))
        
        try {
            await command.run(message);
        } catch (err) {
            this.bot.emit('commandError', message, err);
        }
    }
}

module.exports = {CommandHandler}