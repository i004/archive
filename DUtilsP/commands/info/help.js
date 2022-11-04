const Discord = require('discord.js');
const moment = require('moment');

module.exports = {
    name: 'help',
    usage: '[command]',
    noslash: true,
    description: 'Nothing to see here.',
    run: async (ctx) => {
        if (ctx._args) {
            const commandName = ctx._args.split(/[ ]+/g)[0];
            const command = ctx.client.findCommand(commandName);
            if (!command)
                return await ctx.send(ctx.i18n("help.unknownCommand"));
            await ctx.send(`> \`${command.name}${command.usage ? ` ${command.usage}` : ""}\`\n${ctx.i18n("commandHelp")[command.name] || ctx.i18n("help.noDescription")}`);
        } else {
            const texts = {
                info: ctx.i18n("help.pages.info", {uptime: moment(Date.now()-ctx.client.uptime).locale(ctx.localeCode).fromNow(true), guilds: ctx.client.guilds.cache.size}),
                commands: ctx.i18n("help.pages.commands", {commands: ctx.client.commands.filter(x => !x.hidden && !x.noslash).map(x => x.name).join(", ")}),
                prefixes: ctx.i18n("help.pages.prefixes", {prefixes: ctx.client.config.prefixes.join("\n")})
            }
            const components = [
                new Discord.MessageActionRow()
                    .addComponents(
                        new Discord.MessageButton({label: ctx.i18n("help.button.info"), style: 'PRIMARY', customID: 'info'}),
                        new Discord.MessageButton({label: ctx.i18n("help.button.commands"), style: 'PRIMARY', customID: 'commands'}),
                        new Discord.MessageButton({label: ctx.i18n("help.button.prefixes"), style: 'PRIMARY', customID: 'prefixes'}),
                        new Discord.MessageButton({label: ctx.i18n("help.button.inviteBot"), style: 'LINK', url: `https://discord.com/oauth2/authorize?client_id=${ctx.client.user.id}&scope=bot%20applications.commands`})
                    )
            ];
            await ctx.send({
                content: texts.info,
                components
            });
            const msg = await ctx.fetchReply();
            const filter = (i) => i.user.id == ctx.user.id;
            const collector = msg.createMessageComponentInteractionCollector(filter, { time: 60*1000 });

            collector.on('collect', async i => {
                i.deferUpdate();
                await ctx.editReply({content: texts[i.customID], components});
            });
        }
    }
}