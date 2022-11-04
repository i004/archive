const Discord = require('discord.js');
const {inspect} = require('util');
const { MessageEmbed } = require('discord.js');
const { MessageButton, MessageActionRow } = require('discord-buttons');
const { writeFileSync } = require('fs');

module.exports = class BaseCommands {
    constructor(bot) {
        this.bot = bot;

        this.bot.addCommand({
            name: 'psql',
            aliases: ['sql'],
            hidden: true,
            run: async (ctx) => {
                if (!ctx.bot.config.developers.includes(ctx.author.id))
                    return;
                try {
                    await ctx.send(`\`\`\`json\n${JSON.stringify(await ctx.bot.db.query(ctx.rawArgs, [], {array: true}), null, 2).slice(0, 2000)}\n\`\`\``);
                } catch (err) {
                    await ctx.send(`\`\`\`pgsql\n${err.stack}\n\`\`\``)
                }
            }
        })

        this.bot.addCommand({
            name: 'reload',
            aliases: ['rel'],
            hidden: true,
            run: async (ctx) => {
                if (!ctx.bot.config.developers.includes(ctx.author.id))
                    return;
                if (!ctx.args[0])
                    return await ctx.send('specify module');
                delete require.cache[require.resolve(`./${ctx.args[0]}`)];
                const module = require(`./${ctx.args[0]}`);
                delete ctx.bot.handler.modules[module.name];
                ctx.bot.handler.commands.filter(x => x.module == module.name).forEach(x => ctx.bot.handler.commands.delete(x.name));
                ctx.bot.loadModule(module);
                var reloadedLocales;
                try {
                    ctx.bot.locale.reloadLocales();
                    reloadedLocales = true;
                } catch(err) {
                    reloadedLocales = false;
                }
                await ctx.send(`reloaded module ${module.name}\n${reloadedLocales ? "reloaded locales" : "error attempting to reload locales"}`);
            }
        });

        this.bot.addCommand({
            name: 'restart',
            hidden: true,
            run: async (ctx) => {
                if (!ctx.bot.config.developers.includes(ctx.author.id))
                    return;
                await ctx.send("Restarting...");
                writeFileSync(".lock", "0");
                process.exit();
            }
        })

        this.bot.addCommand({
            name: 'logout',
            hidden: true,
            run: async (ctx) => {
                if (!ctx.bot.config.developers.includes(ctx.author.id))
                    return;
                await ctx.send("Logging out...");
                writeFileSync(".lock", "1");
                process.exit();
            }
        })

        this.bot.addCommand({
            name: 'eval',
            aliases: ['e'],
            hidden: true,
            run: async (ctx) => {
                if (!ctx.bot.config.developers.includes(ctx.author.id))
                    return;
                let src = ctx.rawArgs;

                if (src.startsWith('```javascript')) src = src.slice('```javascript'.length, src.length-3);
                else if (src.startsWith('```js')) src = src.slice('```js'.length, src.length-3);
                else if (src.startsWith('```')) src = src.slice(3, src.length-3);
                
                src = src.split('\n');
                src[src.length-1] = `yield ${src[src.length-1]}`;
                src = src.join('\n');

                const bot = ctx.bot,
                      guild = ctx.guild,
                      channel = ctx.channel,
                      author = ctx.author,
                      member = ctx.member,
                      message = ctx,
                      msg = ctx;

                try {
                    const gen = eval(`(async function* __l_async_executor (ctx) {\n${src}\n})(ctx)`);
                    for await (let o of gen)
                        if (typeof(o) != "undefined")
                            await ctx.send((typeof(o) == "object" ? inspect(o, false, 1, false) : o).toString().slice(0, 2000));
                } catch (err) {
                    await ctx.send(`\`\`\`js\n${err.stack}\n\`\`\``);
                }
            }
        })
    }
}