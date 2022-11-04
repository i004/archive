const Discord = require('discord.js');
const { postHastebin } = require('../../modules/API');

module.exports = {
    name: 'hastebin',
    aliases: ['haste'],
    usage: '<text>',
    description: 'Upload a text on https://hastebin.com',
    options: [
        {
            name: 'text',
            required: true,
            description: 'Text you want to upload',
            type: 'STRING'
        }
    ],
    run: async (ctx) => {
        if (!ctx._args && !ctx.options)
            return await ctx.sendDelete(ctx.i18n("hastebin.noArgument"));

        const code = await postHastebin(ctx._args || ctx.options.get('text').value);

        await ctx.sendDelete(`https://hastebin.com/${code}`);
    }
}