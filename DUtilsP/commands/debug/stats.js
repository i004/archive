const Discord = require('discord.js');
const cpu_usage = require('cpu-percentage');
const os = require('os');

module.exports = {
    name: 'stats',
    hidden: true,
    noslash: true,
    description: 'big chungus',
    run: async (ctx) => {
        if (!ctx.client.config.sudoers.includes(ctx.user.id))
            return;
        await ctx.sendDelete(`\`\`\`ini
[ws]
ping=${ctx.client.ws.ping}ms

[cache]
guilds=${ctx.client.guilds.cache.size}
channels=${ctx.client.channels.cache.size}
emojis=${ctx.client.emojis.cache.size}
users=${ctx.client.users.cache.size}

[core]
commands=${ctx.client.commands.size}
uptime=${Math.floor(ctx.client.uptime/1000/60/60)}h

[process]
mem_rss=${~~(process.memoryUsage().rss / 1024 / 1024)}MB
mem_heap=${~~(process.memoryUsage().heapUsed / 1024 / 1024)}MB
proc=${~~(cpu_usage().percent)}%

[system]
uptime=${Math.floor(os.uptime()/60/60)}h\`\`\``);
    }
}