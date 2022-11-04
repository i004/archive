// easter egg

module.exports = {
    name: 'sudo',
    hidden: true,
    noslash: true,
    description: 'banana',
    run: async (ctx) => {
        if (!ctx.client.config.sudoers.includes(ctx.user.id))
            return await ctx.send(`\`\`\`css\n[${ctx.user.username.toLowerCase()}@dutils:~$] ${ctx.msg.content.slice(ctx.msg.prefix.length).trim()}\n${ctx.user.username} is not in the sudoers file. This incident will be reported.\`\`\``);
        
        let cmd;

        if (["eval", "reload", "stats", "clear-cache", "restart"].includes(ctx._args.split(" ")[0])) {
            cmd = ctx._args.split(" ")[0];
            ctx._args = ctx._args.split(" ").slice(1).join(" ");
            await ctx.client.commands.get(cmd).run(ctx);
        }
    }
}