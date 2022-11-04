const { MessageEmbed, Collector } = require("discord.js");
const { readFileSync } = require("fs");
const moment = require('moment');

module.exports = class Events {
    constructor(bot) {
        this.bot = bot;

        this.bot.on('ready', this.onReady);
        this.bot.on('commandError', this.onCommandError);
        this.bot.on('message', this.onMessage);
        this.bot.on('raw', this.onRaw);
        this.bot.on('voiceStateUpdate', this.onVoiceStateUpdate);
    }

    onRaw = async (event) => {
        try {
            if (["MESSAGE_REACTION_ADD", "MESSAGE_REACTION_REMOVE"].includes(event.t)) {
                if (event.d.channel_id == '810648392392638465') { // role menu
                    const roles = {
                        '📰': '838451139820781598',
                        '📣': '838451159009722369',
                        '🎉': '838451160369070130',
                        '💿': '860168363389091850'
                    };
                    const guild = this.bot.guilds.cache.get('810590565179719702');
                    const u = await guild.members.fetch(event.d.user_id);
                    
                    if (event.t == "MESSAGE_REACTION_ADD")
                        await u.roles.add(guild.roles.cache.get(roles[event.d.emoji.name]));
                    else
                        await u.roles.remove(guild.roles.cache.get(roles[event.d.emoji.name]));
                }
            }
        } catch (err) {
            console.log(err.stack);
        }
    }

    onVoiceStateUpdate = async (before, after) => {
        if (after.channelID === '848597862413238302')
            after.kick();
    }
    
    onMessage = async (msg) => {
        if (!msg.guild || msg.author.bot)
            return;
        await this.bot.db.query("INSERT INTO messages VALUES ($1, 1) ON CONFLICT (user_id) DO UPDATE SET count = messages.count + 1", [msg.author.id]);

        if (['810590565606359042', '849611029868183602'].includes(msg.channel.id) && Math.random() * 100 <= 10 && await this.bot.db.query("SELECT * FROM balance WHERE user_id=$1", [msg.author.id]))
            await this.bot.db.query("INSERT INTO shards VALUES ($1, 1) ON CONFLICT(user_id) DO UPDATE SET shards = shards.shards + 1 RETURNING *", [msg.author.id]);
    }

    onReady = async () => {
        console.log(`Logged in as ${this.bot.user.tag} (${this.bot.user.id})`);
        this.bot.db.setup(readFileSync("setup.psql"));
    }

    onCommandError = async (ctx, error) => {
        if (!error || !ctx.i18n)
            return;
        await ctx.error(
            {
                title: ctx.i18n("error.unknown"),
                description: ctx.i18n("error.unknown__desc", {error: error.stack.toString()})
            }
        );
        console.error(`Error in command ${ctx.command.name}:\n${error.stack}`);
    }
}