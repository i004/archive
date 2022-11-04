module.exports = {
    name: 'prefix',
    aliases: ['prefixes'],
    noslash: true,
    description: 'All bot\'s prefixes',
    run: async (ctx) => {
        await ctx.sendDelete(`${ctx.client.config.prefixes.map(x => `\`${x}\``).join("\n")}`);
    }
}