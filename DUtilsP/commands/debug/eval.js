const Discord = require('discord.js');
const { postHastebin } = require('../../modules/API');
const { inspect } = require('util');

module.exports = {
    name: 'eval',
    aliases: ['e'],
    hidden: true,
    noslash: true,
    description: 'big chungus',
    run: async (ctx) => {
        if (!ctx.client.config.developers.includes(ctx.user.id))
            return;
        if (!ctx._args)
            return await ctx.sendDelete("specify code");
        let code = ctx._args;
        if (code.startsWith("```javascript") && code.endsWith("```")) code = code.slice("```javascript".length, code.length-3);
        if (code.startsWith("```js") && code.endsWith("```")) code = code.slice("```js".length, code.length-3);
        if (code.startsWith("```") && code.endsWith("```")) code = code.slice(3, code.length-3);
        try {
            const client = ctx.client,
                  channel = ctx.channel,
                  guild = ctx.guild,
                  member = ctx.member,
                  author = ctx.user,
                  msg = ctx.msg;
            const res = await eval(`(async function * asyncEvalExecutor () {${code}})()`);
            const formatOutput = async (out) => out.length > 2000 ? `https://hastebin.com/${await postHastebin(out.split(ctx.client.token).join("[token omitted]"))}` : out.split(ctx.client.token).join("[token omitted]");
            for await (let ln of res) {
                if (typeof ln == "undefined" || ln.toString().length == 0)
                    continue;
                if (ln instanceof Discord.MessageEmbed)
                    await ctx.sendDelete({embed: ln});
                else if (typeof ln == "string")
                    await ctx.sendDelete(await formatOutput(ln));
                else
                    await ctx.sendDelete(await formatOutput(inspect(ln, {depth: 1})));
            }
            ctx.msg.react("✅");
        } catch (err) {
            ctx.msg.react("‼️");
            if (err.stack.length > 1990)
                await ctx.sendDelete(`:warning:\nhttps://hastebin.com/${await postHastebin(err.stack)}.js`);
            else    
                await ctx.sendDelete(`:warning:\n\`\`\`js\n${err.stack}\`\`\``);
        }
    }
}