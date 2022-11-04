const Discord = require('discord.js');
const { MessageButton, MessageActionRow } = require('discord-buttons');
const { MessageEmbed } = require('discord.js');
const { readFileSync } = require('fs');

module.exports = class FunCommands {
    constructor(bot) {
        this.bot = bot;
        
        this.bot.addCommand({
            name: 'try',
            module: 'FunCommands',
            run: async (ctx) => {
                if (!ctx.args[0])
                    return;
                let suc = Math.random() <= 0.5;
                if (ctx.args[0].endsWith('%') && !isNaN(parseInt(ctx.args[0])) && parseInt(ctx.args[0]) < 100 && parseInt(ctx.args[0]) > 0) {
                    suc = Math.random() <= parseInt(ctx.args[0])/100;
                    ctx.rawArgs = ctx.rawArgs.split(" ").slice(1).join(" ");
                }
                await ctx.send(ctx.i18n("commands.roleplay.try.text", {user: ctx.author.toString(), action: ctx.rawArgs.toLowerCase(), state: suc ? ctx.i18n("commands.roleplay.try.successful") : ctx.i18n("commands.roleplay.try.fail")}),
                               {allowedMentions: {parse:[]}})
            }
        })
        
        this.bot.addCommand({
            name: 'shout',
            module: 'FunCommands',
            run: async (ctx) => {
                if (!ctx.args[0])
                    return;
                await ctx.send(ctx.i18n("commands.roleplay.shout.text", {user: ctx.author.toString(), text: ctx.rawArgs}),
                               {allowedMentions: {parse:[]}});
            }
        })
        
        this.bot.addCommand({
            name: 'whisper',
            module: 'FunCommands',
            run: async (ctx) => {
                if (!ctx.args[0])
                    return;
                await ctx.send(ctx.i18n("commands.roleplay.whisper.text", {user: ctx.author.toString(), text: ctx.rawArgs}),
                               {allowedMentions: {parse:[]}});
            }
        })
        
        this.bot.addCommand({
            name: 'random',
            module: 'FunCommands',
            run: async (ctx) => {
                if (!ctx.args[0] || !ctx.args[1] || isNaN(parseInt(ctx.args[0])) || isNaN(parseInt(ctx.args[1])))
                    await ctx.send(Math.floor(Math.random()*10));
                else
                    await ctx.send(Math.floor(Math.random() * (parseInt(ctx.args[1]) - parseInt(ctx.args[0]) + parseInt(ctx.args[0]))));
            }
        })

        this.bot.addCommand({
            name: 'cast',
            module: 'FunCommands',
            run: async (ctx) => {
                if (!ctx.args[0])
                    return await ctx.send(ctx.i18n("commands.cast.specifyTag"));
                
                const secrets = {
                    'cast': 'Hmmm... how unexpected',
                    'tag': 'Damn, `tag` is a argument that you need to specify, you don\'t need to enter "tag"',
                    '45community': 'yes, this is our server name',
                    'ahke3sapzs': 'This is our server invite. What did you expect?',
                    'null': '[object Object]',
                    'sus': 'me when the impostor is sus',
                    'unknown_tag': 'yes, definitely unknown tag',
                    'discord.gg/ahke3sapzs': 'This is our server invite. What did you expect?',
                    'thistagdoesnotexist': 'or it is?',
                    'sudo': '[sudo] Password for root:',
                    '0': 'r: null',
                    'nsfw': ':face_with_raised_eyebrow:',
                    'help': 'Check help in `help cast`',
                    '69': 'haha funni number)',
                    '4+5': '9',
                    '9': '9-4+40',
                    '45': '4+5',
                    'object': 'undefined',
                    'undefined': 'null',
                    'weflown': '<:weflown:811265465586155540>',
                    'eyes': 'the answer is',
                    'hint': 'do a the b c 0 r an You n rn o th id c',
                    'answer': 'yes',
                    'you': 'No, the answer is not `you`.',
                    'do': 'No, the answer is not `do`.',
                    'choice': 'No, the answer is not `choice`.',
                    'yes': 'the answer is yes? do you really think that it is `yes`? i think that you need to rethink your choice',
                    'rethink': 'The answer is correct. But you need to find another answer.\n```2`*EP2Dm6D2FBA_2FTMj1,(XG2E<Z_2FB5R2DI-E2_[-I2DI-G1,(UU2FTAT1GL[F1.<uQ1H#```',
                };

                if (Object.keys(secrets).includes(ctx.args[0].toLowerCase())) {
                    const e = await ctx.bot.db.query("SELECT * FROM found_secrets WHERE user_id=$1", [ctx.author.id], {array: true});
                    await ctx.bot.db.query("INSERT INTO found_secrets VALUES ($1, $2) ON CONFLICT (user_id, name) DO NOTHING",
                                           [ctx.author.id, `cast_${ctx.args[0]}`]);
                    if (!e.find(x => x.name == `cast_${ctx.args[0]}`))
                        return await ctx.send(`**Secret #${Object.keys(secrets).indexOf(ctx.args[0].toLowerCase())}**\n${secrets[ctx.args[0].toLowerCase()]}\n\nFound secrets: ${e.length+1}`);
                    else
                        return await ctx.send(`**Secret #${Object.keys(secrets).indexOf(ctx.args[0].toLowerCase())}**\nYou've already found this secret.\n\nFound secrets: ${e.length}`);
                }

                const tags = JSON.parse(readFileSync("tags.json"));
                
                if (!tags.find(x => x.name == ctx.args[0].toLowerCase()))
                    return await ctx.send(ctx.i18n("commands.cast.unknownTag"));
                
                const tag = tags.find(x => x.name == ctx.args[0].toLowerCase());

                if (tag.code) eval(tag.code);
                if (tag.embed) await ctx.send({embed: tag.embed});
            }
        });

    }
}