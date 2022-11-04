const Discord = require('discord.js');
const wiki = require('wikijs').default;

const supportedLanguages = Object.keys(require('translatte').languages);

module.exports = {
    name: 'wikipedia',
    aliases: ['wiki'],
    description: 'Search for something in Wikipedia',
    usage: '[language] <article>',
    options: [
        {
            name: 'article',
            required: true,
            description: 'Article',
            type: 'STRING'
        },
        {
            name: 'language',
            required: false,
            description: 'Language (default to your language)',
            type: 'STRING'
        },
    ],
    run: async (ctx) => {
        if (!ctx._args && !ctx.options)
            return await ctx.send(ctx.i18n("wiki.noArgument"));
        
        let article, language;
        
        if (!ctx._args && ctx.options) {
            article = ctx.options.get('article').value;
            language = ctx.options.get('language')?.value || ctx.localeCode;
        } else {
            const args = ctx._args.split(/[ ]+/g);
            if (supportedLanguages.includes(args[0])) {
                article = args.slice(1).join(" ");
                language = args[0];
            } else {
                article = args.join(" ");
                language = ctx.localeCode;
            }
        }

        if (!supportedLanguages.includes(language))
            return await ctx.send(ctx.i18n("wiki.unknownLang", {lang: language.replace("`", "\u200b`\u200b").slice(0,100)}));

        let page;
        try {
            page = await wiki({
                apiUrl: `https://${language}.wikipedia.org/w/api.php`
            }).page(article);
        } catch (err) {
            return await ctx.send(ctx.i18n("wiki.notFound"));
        }

        const summary = await page.summary();
        let content;
        
        if (summary.length > 1000) {
            const phrases = summary.slice(0, 1000).split(".");
            content = phrases.slice(0, phrases.length-1).join(".");
        } else
            content = summary;
        
        await ctx.sendDelete({
            content,
            components: [
                new Discord.MessageActionRow()
                    .addComponents(new Discord.MessageButton({label: ctx.i18n("wiki.moreInfo"), style: 'LINK', url: page.url()}))
            ]
        });
    }
}