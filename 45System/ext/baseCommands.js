const Discord = require('discord.js');
const { MessageButton, MessageActionRow } = require('discord-buttons');
const { MessageEmbed } = require('discord.js');
const cpu_usage = require('cpu-percentage');
const moment = require('moment');
const ButtonMenu = require('../modules/ButtonMenu');

module.exports = class BaseCommands {
    constructor(bot) {
        this.bot = bot;

        this.bot.addCommand({
            name: 'ping',
            module: 'BaseCommands',
            run: async (ctx) => {
                await ctx.send(`:ping_pong: ${~~ctx.bot.ws.ping}ms`);
            }
        });

        this.bot.addCommand({
            name: 'stats',
            module: 'BaseCommands',
            run: async (ctx) => {
                const db_ver = await ctx.bot.db.query("SHOW server_version");

                const embed = new MessageEmbed()
                    .setTitle(ctx.i18n("commands.stats.stats"))
                    .setThumbnail("https://cdn.discordapp.com/emojis/824240882793447444.png?v=1")
                    .setColor("#5C64F4")
                    
                    .addField(ctx.i18n("commands.stats.lib"),
                              `**[Discord.JS](https://www.npmjs.com/package/discord.js)** ${Discord.version}\n`
                              + `**[PostgreSQL](https://www.postgresql.org/)** ${db_ver.server_version.split(" ")[0]}`,
                              true)
                    .addField(ctx.i18n("commands.stats.stats"),
                              `**${ctx.i18n("commands.stats.members")}:** ${ctx.bot.guilds.cache.map(x => x.memberCount).reduce((a, b) => a + b, 0).toString()}\n`
                              + `**${ctx.i18n("commands.stats.uptime")}:** ${moment(ctx.bot.startedAt).locale(ctx.localeCode).fromNow(true)}`,
                              true)
                    .addField(ctx.i18n("commands.stats.host"),
                              `**RAM:** ${~~(process.memoryUsage().rss / 1024 / 1024)} MB\n`
                              + `**CPU:** ${~~(cpu_usage().percent)}%`,
                              true);

                await ctx.send(embed);
            }
        })

        this.bot.addCommand({
            name: 'help',
            module: 'BaseCommands',
            run: async (ctx) => {
                if (ctx.args[0]) {
                    const cmd = this.bot.handler.getCommand(ctx.args.join(' '));
                    if (!cmd)
                        return await ctx.error({description: ctx.i18n('commands.help.unknownCommand')});
                    const embed = new MessageEmbed()
                    .setTitle(ctx.i18n('commands.help.commandInfo.info', {command: cmd.name}))
                    .setDescription(ctx.i18n(`help.${cmd.name}.help`) || ctx.i18n('commands.help.commandInfo.descriptionNotSet'))
                    .setThumbnail('https://cdn.discordapp.com/emojis/849313041303994399.png?v=1')
                    .setColor('#5C64F4');
                    if (ctx.i18n(`help.${cmd.name}.args`))
                        embed.addField(ctx.i18n("commands.help.commandInfo.args"),
                                       ctx.i18n(`help.${cmd.name}.args`)
                                          .map(x => `\`${x.name}\`\n<:empty:849535331186638858>${x.desc.split("\n").join("\n<:empty:849535331186638858>")}`)
                                          .join('\n'))
                    return await ctx.send(embed);
                }

                const menu = new ButtonMenu(ctx);
                const baseEmbed = (...options) => new MessageEmbed(...options).setColor('#5C64F4');

                menu.addPage(new MessageButton({style: 'gray', label: ctx.i18n("commands.help.categories.base_commands")}).setEmoji('📘'),
                             baseEmbed({title: ctx.i18n("commands.help.categories.base_commands")})
                               .setThumbnail('https://cdn.discordapp.com/emojis/849640996241014804.png?v=1')
                               .addField(ctx.i18n('commands.help.availableCommands'),
                                         ctx.bot.handler.commands
                                           .filter(x => x.module == 'BaseCommands')
                                           .map(x => `\`${x.name}\``)
                                           .join(', '))
                                .setFooter(ctx.i18n('commands.help.detailedCommandInfoTip')));

                menu.addPage(new MessageButton({style: 'gray', label: ctx.i18n("commands.help.categories.fun")}).setEmoji('🎉'),
                             baseEmbed({title: ctx.i18n("commands.help.categories.fun")})
                               .setThumbnail('https://cdn.discordapp.com/emojis/849640996241014804.png?v=1')
                               .addField(ctx.i18n('commands.help.availableCommands'),
                                         ctx.bot.handler.commands
                                           .filter(x => x.module == 'FunCommands')
                                           .map(x => `\`${x.name}\``)
                                           .join(', ') || "null")
                                .setFooter(ctx.i18n('commands.help.detailedCommandInfoTip')));

                menu.addPage(new MessageButton({style: 'gray', label: ctx.i18n("commands.help.categories.eco")}).setEmoji('🪙'),
                             baseEmbed({title: ctx.i18n("commands.help.categories.eco")})
                               .setThumbnail('https://cdn.discordapp.com/emojis/849640996241014804.png?v=1')
                               .addField(ctx.i18n('commands.help.availableCommands'),
                                         ctx.bot.handler.commands
                                           .filter(x => x.module == 'Economy')
                                           .map(x => `\`${x.name}\``)
                                           .join(', ') || "null")
                                .setFooter(ctx.i18n('commands.help.detailedCommandInfoTip')));

                await menu.sendMenu();
            }
        })
    }
}