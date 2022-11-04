const { existsSync } = require('fs');
const { Locale } = require('../../modules/LocaleManager');
const { readFileSync } = require('fs');

module.exports = {
    name: 'reload',
    aliases: ['rel', 'rl', 'r'],
    hidden: true,
    noslash: true,
    description: 'egg',
    run: async (ctx) => {
        if (!ctx.client.config.developers.includes(ctx.user.id))
            return;
        if (!ctx._args)
            return await ctx.sendDelete("specify command");
        const command = ctx.client.commands.get(ctx._args);
        ctx.client.locales = { // reload locales
            en: new Locale('en', readFileSync("assets/locales/en.json")),
            ru: new Locale('ru', readFileSync("assets/locales/ru.json")),
        };
        if (!command) {
            const path = `commands/${ctx._args}`;
            if (!existsSync(path))
                return await ctx.sendDelete("unknown command");
            const cmd = require(`../../${path}`);
            cmd.path = path;
            ctx.client.commands.set(cmd.name, cmd);
            ctx.msg.react("👌");
            ctx.msg.react("📥");
            return;
        }
        delete require.cache[require.resolve(`../../${command.path}`)];
        const m = require(`../../${command.path}`);
        m.path = command.path;
        ctx.client.commands.set(m.name, m);
        ctx.msg.react("👌");
        ctx.msg.react("🔁");
    }
}