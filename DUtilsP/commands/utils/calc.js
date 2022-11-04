const Discord = require('discord.js');
const fetch = require('node-fetch');

module.exports = {
    name: 'calc',
    aliases: ['calculate', 'solve'],
    description: 'Solve math expression',
    usage: '<expression>',
    options: [
        {
            name: 'expression',
            required: true,
            description: 'Math expression you want to solve',
            type: 'STRING'
        }
    ],
    run: async (ctx) => {
        if (!ctx._args && !ctx.options)
            return await ctx.sendDelete(ctx.i18n("calc.noArgument"));

        const expression = ctx._args || ctx.options.get('expression').value;
        const resp = await fetch(`http://api.mathjs.org/v4/?expr=${encodeURIComponent(expression.replace('"', '').replace("'", "").replace("`", ""))}`);
        const result = (await resp.text()).slice(0,500);

        if (expression.match(/^\(?\d\)?(\+|-|\*|\/)\(?\d\)?$/) && !result.includes("Error")) {
            const responses = ctx.i18n("calc.easter_egg.responses");
            return await ctx.sendDelete(ctx.i18n("calc.easter_egg", {response: responses[Math.floor(Math.random()*responses.length)], result}));
        }
        await ctx.sendDelete(result);
    }
}