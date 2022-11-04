const Discord = require('discord.js');
const { Context } = require('./Context');
const { postHastebin, removeInvites } = require('./API');
const { Database, DatabaseConnector } = require('./Database');
const { Locale } = require('./LocaleManager');
const { readFileSync } = require('fs');
const moment = require('moment');
const { INVITE_PATTERN } = require('../assets/regex');

class Bot extends Discord.Client {
    /**
     * 
     * @param {Discord.ClientOptions} options 
     */
    constructor (options) {
        super(options);
        
        this.config = options.config;
        this.commands = new Discord.Collection();

        this.db_connector = new DatabaseConnector(this.config.database);
        this.db = new Database(this.db_connector);

        this.locales = {
            en: new Locale('en', readFileSync("assets/locales/en.json")),
            ru: new Locale('ru', readFileSync("assets/locales/ru.json")),
        };

        this.on('ready', async () => {
            console.debug(`Setting up database...`);
            this.db_connector.setup(readFileSync("assets/setup.psql"));
            this.db_connector.createAutoBackupTask(this);
            console.debug(`OK`);

            console.debug(`Loading reminders...`);
            for (let reminder of await this.db.fetchAllReminders())
                this.addReminder(reminder);
            console.debug(`OK`);

            this.config.prefixes.push(`<@${this.user.id}> `);
            this.config.prefixes.push(`<@!${this.user.id}> `);
            console.log(`Logged in as ${this.user.username}#${this.user.discriminator}`);
            
            const test_guild = await this.guilds.fetch(this.config.test_guild);

            console.debug(`Deleting unexisting commands...`);
            for (let command of await this.application.commands.fetch())
                if (!this.commands.has(command[1].name)) {
                    await this.application.commands.delete(command[1].id);
                    await test_guild.commands.delete(command[1].id);
                }
            
            console.debug(`Creating commands...`);

            for (let command of this.commands)
                if (!command[1].noslash) {
                    this.application.commands.create(command[1]);
                    test_guild.commands.create(command[1]);
                }

            console.debug(`Initialization complete.`);

            if (this.config.activity)
                await this.user.setActivity(this.config.activity);
        });

        this.on('message', async (msg) => {
            await this.processCommand(msg);
        });

        this.on('guildCreate', async (guild) => {
            const channel = await this.channels.fetch(this.config.channels.server_log);
            await channel.send(new Discord.MessageEmbed()
                .setTitle(`[+] ${guild.name} (${guild.id})`)
                .setThumbnail(guild.iconURL() || "")
                .setColor('#40a65f')
                .addField(`Member count`, guild.memberCount)
                .addField(`Created at`, guild.createdAt.toString())
                .setFooter(`this bot is now in ${this.guilds.cache.size} guilds`));
        });

        this.on('guildDelete', async (guild) => {
            const channel = await this.channels.fetch(this.config.channels.server_log);
            await channel.send(new Discord.MessageEmbed()
                .setTitle(`[-] ${guild.name} (${guild.id})`)
                .setThumbnail(guild.iconURL() || "")
                .setColor(`#e94545`)
                .addField(`Member count`, guild.memberCount)
                .addField(`Created at`, guild.createdAt.toString())
                .setFooter(`this bot is now in ${this.guilds.cache.size} guilds`));
        });

        this.on('interaction',
        /**
         * 
         * @param {Discord.CommandInteraction} i 
         */
        async (i) => {
            if (i.type == 'APPLICATION_COMMAND') {
                if (this.commands.has(i.commandName))
                    try {
                        i.localeCode = await this.db.fetchGuildLocale(i.guildID);
                        i.locale = this.locales[i.localeCode];
                        i.i18n = (k, v={}) => i.locale.format(k, v);
                        i.send = async (options) => {
                            return await i.reply(removeInvites(options));
                        };
                        i.sendDelete = async (data) => {
                            let options;
                            if (typeof data == 'string') options = {content: data};
                            else options = data;
                            if (!options.components) options.components = [new Discord.MessageActionRow];
                            options.components[options.components.length-1].addComponents(
                                new Discord.MessageButton({
                                    label: '\u200b',
                                    emoji: {
                                        name: 'delete',
                                        id: '859832771698622465'
                                    },
                                    style: 'DANGER',
                                    customID: 'deleteOutput'
                                })
                            );
                            await i.send(options);
                            const msg = await i.fetchReply();
                            const collector = msg.createMessageComponentInteractionCollector((btn) => btn.user.id == i.user.id, {time:60*1000});
                            collector.on('collect', async (btn) => {
                                if (btn.user.id == i.user.id && btn.customID == 'deleteOutput') {
                                    i.deleteReply().catch(() => {});
                                    btn.deferUpdate().catch(() => {});
                                }
                            });
                        }
                        await this.commands.get(i.commandName).run(i);
                    } catch (err) {
                        if (err.stack.length > 1990)
                            await this.sendLogMessage('error', `Error in slash command \`${i.commandName}\`\nhttps://hastebin.com/${await postHastebin(err.stack)}.js`);
                        else
                            await this.sendLogMessage('error', `Error in slash command \`${i.commandName}\`\n\`\`\`js\n${err.stack.slice(0, 1990)}\`\`\``);
                        i.reply({content: i?.i18n("errors.unknownError") ?? `An error occurred while executing the command.`, ephemeral: true}).catch(() => {});
                    }
            }
        })
    }
    
    reminderTimeout (data) {
        if (data.expires > Date.now())
            setTimeout(() => this.reminderTimeout(data), (data.expires - Date.now()) > 2147483647 ? 2147483647 : (data.expires - Date.now()));
        else {
            (async () => {
                const reminder = await this.db.query("DELETE FROM reminders WHERE user_id=$1 AND reminder_id=$2 RETURNING *", [data.user_id, data.reminder_id]);
                if (!reminder)
                    return;
                let channel, user;
                try {
                    channel = await this.channels.fetch(data.channel_id);
                    await channel.send(`<@${data.user_id}> ${moment(parseInt(data.created_at)).locale(data.locale).fromNow()}: \`${data.text.replace('`', '\u200b`\u200b').slice(0, 500)}\`\n\n<${data.message_uri}>`, {allowedMentions: {parse: ["users"]}});
                } catch(err) {
                    try {
                        user = await this.users.fetch(data.user_id);
                        await user.send(`${moment(parseInt(data.created_at)).fromNow()}: \`${data.text.replace('`', '\u200b`\u200b').slice(0, 500)}\`\n\n${data.message_uri}`);
                    } catch (err) {}
                }
            })();
        }
    }

    addReminder (data) {
        data.expires = parseInt(data.expires) + parseInt(data.created_at);
        setTimeout(() => this.reminderTimeout(data), (data.expires - Date.now()) > 2147483647 ? 2147483647 : (data.expires - Date.now()));
    }

    async sendLogMessage (type, ...options) {
        try {
            const channel = await this.channels.fetch(this.config.channels[`${type}_log`]);
            return await channel.send(...options);
        } catch (err) {
            return err;
        }
    }

    async processCommand (msg) {
        if (msg.author.bot || !msg.guild)
            return;
        const prefix = this.config.prefixes.find(x => msg.content.startsWith(x));
        if (!prefix)
            return;

        const rawArgs = msg.content.slice(prefix.length).trim().split(" ");
        const command = this.findCommand(rawArgs[0]);
        msg.prefix = prefix;
        
        if (!command)
            return;

        const context = new Context(msg, command, msg.content.slice(prefix.length).trim().slice(rawArgs[0].length).trim(), await this.db.fetchGuildLocale(msg.guild.id));
        
        try {
            await command.run(context);
        } catch(err) {
            if (err.stack.length > 1990)
                await this.sendLogMessage('error', `Error in command \`${command.name}\`\nhttps://hastebin.com/${await postHastebin(err.stack)}.js`);
            else
                await this.sendLogMessage('error', `Error in command \`${command.name}\`\n\`\`\`js\n${err.stack.slice(0, 1990)}\`\`\``);
            msg.channel.send(context?.i18n("errors.unknownError") ?? `An error occurred while executing the command.`).catch(() => {});
        }
    }

    addCommand (command, path) {
        command.path = path;
        this.commands.set(command.name, command);
    }

    findCommand (name) {
        return this.commands.find(x => x.name == name
                                       || x.name == name.toLowerCase()
                                       || (x.aliases
                                           && (x.aliases.includes(name.toLowerCase())
                                               || x.aliases.includes(name))));
    }
}

module.exports = { Bot };