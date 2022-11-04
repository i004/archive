const Discord = require('discord.js');
const fetch = require('node-fetch');

module.exports = {
    name: 'ping',
    description: 'Get bot\'s ping',
    run: async (ctx) => {
        await ctx.sendDelete(`:ping_pong: **${ctx.client.ws.ping}**ms`);
        
        // const metricsResp = await fetch('https://discordstatus.com/metrics-display/5k2rt9f7pmny/day.json');
        // const statusResp = await fetch('https://discordstatus.com/api/v2/status.json');
        
        // const metrics = await metricsResp.json();
        // const status = await statusResp.json();
        // const resp = `:ping_pong: **${ctx.client.ws.ping}**ms\n\n${ctx.i18n("ping.api_status")}: \`${status.status.description}\`\n${ctx.i18n("ping.api_ping")}: \`${Math.floor(metrics.metrics[0].summary.mean)}ms\``

        // await ctx.editReply(resp);
    }
}