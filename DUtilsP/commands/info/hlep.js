// easter egg

module.exports = {
    name: 'hlep',
    hidden: true,
    noslash: true,
    description: 'Hlep yourself.',
    run: async (ctx) => {
        await ctx.send('Hlep yourself.');
    }
}