const Discord = require('discord.js');

module.exports = {
    name: 'clear-cache',
    hidden: true,
    noslash: true,
    description: 'big chungus',
    run: async (ctx) => {
        if (!ctx.client.config.sudoers.includes(ctx.user.id))
            return;
        const cached = {
            users: ctx.client.users.cache.size,
            emojis: ctx.client.emojis.cache.size
        };
        const rss_before = process.memoryUsage().rss;
        const heap_before = process.memoryUsage().heapUsed;
        ctx.client.users.cache.clear();
        ctx.client.emojis.cache.clear();
        const rss_after = process.memoryUsage().rss;
        const heap_after = process.memoryUsage().heapUsed;
        await ctx.send(`Deleted **${cached.users}** users and ${cached.emojis} emojis from cache\nMemory freed: rss **${((rss_before-rss_after)/1024/1024).toString().slice(0, 5)} MB**, heap **${((heap_before-heap_after)/1024/1024).toString().slice(0,5)} MB**`);
    }
}