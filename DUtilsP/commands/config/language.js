const Discord = require('discord.js');

module.exports = {
    name: 'language',
    aliases: ['locale', 'lang'],
    description: 'Manage bot\'s language',
    run: async (ctx) => {
        const currentLang = ctx.i18n("language.currentLanguage", {emoji: ctx.i18n("language")['emoji'], name: ctx.i18n("language")['name']});
        if (!ctx.member.permissions.has("MANAGE_GUILD"))
            return await ctx.send(currentLang);
        const components = [new Discord.MessageActionRow()];

        for (let locale of Object.values(ctx.client.locales))
            components[0].addComponents(
                new Discord.MessageButton()
                    .setLabel(locale.format("language")["name"])
                    .setEmoji(locale.format("language")["emoji"])
                    .setCustomID(locale.code)
                    .setStyle(locale.code == ctx.localeCode ? "PRIMARY" : "SECONDARY")
                    .setDisabled(locale.code == ctx.localeCode)
            );

        await ctx.send({ content: `${currentLang}\n\n${ctx.i18n("language.howToChange")}`, components});
        const msg = await ctx.fetchReply();
        const collector = msg.createMessageComponentInteractionCollector((i) => i.user.id == ctx.user.id, {time: 60*1000});

        collector.on('collect', async (i) => {
            i.deferUpdate();
            if (ctx.client.locales[i.customID]) {
                const locale = ctx.client.locales[i.customID];
                await ctx.client.db.query("INSERT INTO locales VALUES ($1, $2) ON CONFLICT (guild_id) DO UPDATE SET locale = EXCLUDED.locale", [ctx.guildID, i.customID]);
                await ctx.editReply({
                    content: locale.format("language.changed", {emoji: locale.format("language")['emoji'], name: locale.format("language")['name']}),
                    components: []
                });
            }
        });
    }
}