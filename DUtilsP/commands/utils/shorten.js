const Discord = require('discord.js');
const fetch = require('node-fetch');

module.exports = {
    name: 'shorten',
    description: 'Shorten the link',
    usage: '<link> [custom_link]',
    options: [
        {
            name: 'link',
            required: true,
            description: 'Link you want to shorten',
            ctype: 'URL',
            type: 'STRING'
        },
        {
            name: 'custom_link',
            required: false,
            description: 'Custom link (it\'ll look like https://is.gd/your_custom_link)',
            type: 'STRING'
        }
    ],
    run: async (ctx) => {
        let link, custom_link;

        if (!ctx._args && !ctx.options)
            return await ctx.sendDelete(ctx.i18n("shorten.noArgument"));

        if (!ctx._args && ctx.options) {
            link = ctx.options.get('link').value;
            custom_link = ctx.options.get('custom_link')?.value;
        } else {
            link = ctx._args.split(/[ ]+/g)[0];
            custom_link = ctx._args.split(/[ ]+/g)[1];
        }
        
        const resp = await fetch(`https://is.gd/create.php?format=simple&url=${encodeURIComponent(link)}${custom_link ? `&shorturl=${encodeURIComponent(custom_link)}` : ""}`);
        const text = await resp.text();

        if (resp.status !== 200)
            if (text.includes("long"))
                return await ctx.sendDelete(ctx.i18n("shorten.errors")["too_short"]);
            else if (text.includes("valid"))
                return await ctx.sendDelete(ctx.i18n("shorten.errors")["invalid"]);
            else if (text.includes("exists"))
                return await ctx.sendDelete(ctx.i18n("shorten.errors")["already_exists"]);
            else if (text.includes("blacklist"))
                return await ctx.sendDelete(ctx.i18n("shorten.errors")["blacklist"]);
            else
                return await ctx.sendDelete(ctx.i18n("shorten.errors")["unknown"]);
        
        await ctx.sendDelete(`<${text}>`);
    }
}