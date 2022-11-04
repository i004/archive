module.exports = {
    name: 'restart',
    hidden: true,
    noslash: true,
    description: 'AAAAAAAA BALLS AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA',
    run: async (ctx) => {
        if (!ctx.client.config.developers.includes(ctx.user.id))
            return;
        await ctx.client.user.setPresence({status: 'idle', activities: [{type: 'PLAYING', name: '⛔ restarting...'}]});
        await ctx.send("Restarting...");

        process.exit();
    }
}