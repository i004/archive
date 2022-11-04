const Discord = require('discord.js');
const fetch = require('node-fetch');

const requestCache = {};

module.exports = {
    name: 'google',
    description: 'Search in Google',
    usage: '<query>',
    options: [
        {
            name: 'query',
            required: true,
            description: 'Search query',
            type: 'STRING'
        }
    ],
    run: async (ctx) => {
        if (!ctx._args && !ctx.options)
            return await ctx.sendDelete(ctx.i18n("google.noArgument"));
        
        const query = ctx._args || ctx.options.get('query').value;

        if (Object.keys(requestCache).includes(query))
            return await ctx.sendDelete(requestCache[query]);

        const resp = await fetch(
            `https://www.googleapis.com/customsearch/v1`
            + `?key=${ctx.client.config.tokens.googleSearch}`
            + `&cx=e6702337c52c4f661`
            + `&q=${encodeURIComponent(query)}`
            + `&safe=${ctx.channel.nsfw ? "off" : "active"}`
        )
        if (resp.status == 429)
            return await ctx.sendDelete(ctx.i18n("google.dailyQuota"));
        if (resp.status != 200)
            return await ctx.sendDelete(ctx.i18n("google.error", {status: resp.status}));

        const data = await resp.json();

        if (!data.items || data.items.length == 0)
            return await ctx.sendDelete(ctx.i18n("google.nothingFound"));

        const embed = new Discord.MessageEmbed()
                .setDescription(data.items.slice(0, 5).map(x => `**[${x.title}](<${x.link}>)**\n${x.snippet}`).join("\n\n"));

        requestCache[query] = embed;

        await ctx.sendDelete({embeds: [embed]});
    }
}