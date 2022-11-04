const Discord = require('discord.js');
const tio = require('tio.js');
const languageAliases = require('../../assets/programming_languages.json');
const { postHastebin } = require('../../modules/API');

module.exports = {
    name: 'sandbox',
    aliases: ['sb', 'run'],
    description: 'Execute a code in a sandbox. (supports over 681 programming languages)',
    usage: '[language] <code>',
    options: [
        {
            name: 'language',
            required: true,
            description: 'Programming language',
            type: 'STRING'
        },
        {
            name: 'code',
            required: true,
            description: 'Code you want to execute',
            type: 'STRING'
        }
    ],
    run: async (ctx) => {
        if (!ctx.client.languages)
            ctx.client.languages = await tio.languages();

        let language, code;

        if (!ctx._args && ctx.options) {
            language = ctx.options.get('language').value;
            code = ctx.options.get('code').value;
        } else {
            if (ctx._args.match(/^(`{3}\w+\n)(.+)(`{3})$/gs)) {
                language = ctx._args.split('\n')[0].slice(3);
                code = ctx._args.split('\n').slice(1).join('\n');
                code = code.slice(0, code.length-3);
            } else {
                language = ctx._args.split(' ')[0];
                code = ctx._args.split(' ').slice(1).join(' ');
                if (code.match(/^(`{3}\w+\n)(.+)(`{3})$/gs)) {
                    code = code.split('\n').slice(1).join('\n');
                    code = code.slice(0, code.length-3);
                } else if (code.startsWith('```') && code.endsWith('```'))
                    code = code.slice(3, code.length-3)
                else if (code.startsWith('`') && code.endsWith('`'))
                    code = code.slice(1, code.length-1)
            }
        }

        if (!language || !code)
            return await ctx.sendDelete(ctx.i18n("sandbox.noArgument"));
        
        if (Object.keys(languageAliases).includes(language))
            language = languageAliases[language];
        if (!ctx.client.languages.includes(language))
            return await ctx.sendDelete(ctx.i18n("sandbox.unknownLang"));
        
        await ctx.defer();
        
        const result = await tio(code, language, 10*1000);

        if (result.timedOut)
            return await ctx.editReply(ctx.i18n("sandbox.timeout"));
        
        const out = `\`\`\`\n${result.output.replace(/`/g, "\u200b`\u200b")}\`\`\`\n\`Exit code: ${result.exitCode}\``;
        if (out.length > 2000 || out.split("\n").length > 30)
            return await ctx.editReply(`${ctx.i18n("sandbox.tooLongOutput", {key: await postHastebin(result.output)})}\n\`Exit code: ${result.exitCode}\``);
        await ctx.editReply(out);
    }
}