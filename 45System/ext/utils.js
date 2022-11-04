const Discord = require('discord.js');
const { MessageButton, MessageActionRow } = require('discord-buttons');
const { MessageEmbed } = require('discord.js');
const ButtonMenu = require('../modules/ButtonMenu');

module.exports = class Utils {
    constructor(bot) {
        this.bot = bot;

        // this.bot.addCommand({
        //     name: 'sandbox',
        //     aliases: ['run', 'code', 'sb'],
        //     module: 'Utils',
        //     run: async (ctx) => {
        //         const languages = ["bash", "c", "csharp", "cpp", "d", "elixir", "fsharp", "go", "haskell", "java", "javascript", "kotlin", "objective-c", "perl", "php", "python2", "python3", "ruby", "rust", "swift", "typescript"];
        //         const aliases = {
        //             'c#': 'csharp',
        //             'cs': 'csharp',
        //             'f#': 'fsharp',
        //             'fs': 'fsharp',
        //             'hk': 'haskell',
        //             'js': 'javascript',
        //             'objectivec': 'objetivec',
        //             'python': 'python3',
        //             'py': 'python3',
        //             'rb': 'ruby',
        //             'ts': 'typescript'
        //         };

        //         if (!ctx.rawArgs)
        //             return await ctx.send(ctx.i18n("commands.sandbox.specifyCode"));
                
        //         const getLanguage = (code) => languages.includes(code) ? code : (Object.keys(aliases).includes(code) ? aliases[code] : null);
                
        //         if (ctx.rawArgs.match(/(?:`{3})(\w+)(\n.+?)(`{3})/gs)) {

        //         }
        //     }
        // });
    }
}