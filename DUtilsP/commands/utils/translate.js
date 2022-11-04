const Discord = require('discord.js');
const translatte = require('translatte');
const { postHastebin } = require('../../modules/API');
// const { messageUrl } = require('../../assets/regex');

module.exports = {
    name: 'translate',
    aliases: ['tr', 'tl'],
    description: 'Translate the text',
    usage: '[source=auto] [language=en] <text>',
    options: [
        {
            name: 'text',
            required: true,
            description: 'Text you want to translate',//. You can specify link to a message too!',
            type: 'STRING'
        },
        {
            name: 'language',
            required: true,
            description: 'The language you want to translate text into',
            type: 'STRING'
        },
        {
            name: 'source',
            required: false,
            description: 'Source language you want to translate text from (default `auto`)',
            type: 'STRING'
        },
    ],
    run: async (ctx) => {
        let text, dest, src;

        if (!ctx._args && !ctx.options)
            return await ctx.sendDelete(ctx.i18n("translate.noArgument"));

        const languageCodes = Object.keys(translatte.languages);

        if (!ctx._args && ctx.options) {
            text = ctx.options.get('text').value;
            dest = ctx.options.get('language')?.value || "en";
            src = ctx.options.get('source')?.value || "auto";
        } else {
            const args = ctx._args.split(" ");
            if (languageCodes.includes(args[0])) {
                dest = args[0];
                text = args.slice(1).join(" ");
            } if (languageCodes.includes(args[0]) && languageCodes.includes(args[1])) {
                dest = args[1];
                src = args[0];
                text = args.slice(2).join(" ");
            }
        }
        
        if (dest && !languageCodes.includes(dest))
            return await ctx.sendDelete(ctx.i18n("translate.unknownLanguage", {lang: dest.replace("`", "\u200b`\u200b").slice(0,20)}));
            
        if (src && !languageCodes.includes(src))
            return await ctx.sendDelete(ctx.i18n("translate.unknownLanguage", {lang: src.replace("`", "\u200b`\u200b").slice(0,20)}));

            
        if (!text || !dest)
            return await ctx.sendDelete(ctx.i18n("translate.noArgument"));

        // if (text.match(messageUrl)) {
        //     const msgURL = text.match(messageUrl);
        //     const msgID = msgURL[msgURL.length-1];
        //     const channelID = msgURL[msgURL.length-2];
        //     const guildID = msgURL[msgURL.length-3];
        //     if (guildID != ctx.guildID)
        //         return await ctx.send(`This message is not from this guild!`);
        //     let channel;
        //     try {
        //         channel = await ctx.guild.channels.fetch(channelID);
        //     } catch (err) {
        //         return await ctx.send(`Unknown channel`);
        //     }
        //     let message;
        //     try {
        //         message = await channel.messages.fetch(msgID);
        //     } catch (err) {
        //         return await ctx.send(`Unknown message`);
        //     }
        //     text = message.content;
        //     if (!message.content)
        //         return await ctx.send(`Empty message`);
        // } else if (text.match(/^(\d{17,21})$/)) {
        //     let message;
        //     try { message = await channel.messages.fetch(msgID); } catch (err) { }
        //     if (message) {
        //         text = message.content;
        //         if (!message.content)
        //             return await ctx.send(`Empty message`);
        //     }
        // }

        const res = await translatte(text, {from: src || 'auto', to: dest || 'en'});

        if (res.text.length > 2000 || res.text.split('\n').length > 30)
            return await ctx.sendDelete(ctx.i18n("translate.tooBig", {key: await postHastebin(res.text)}));
        
        await ctx.sendDelete(res.text);
    }
}