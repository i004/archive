from time import time
from discord.ext import commands
import cbot.core.Errors as Errors

def cooldown(seconds: int = 0, /, minutes: int = 0, hours: int = 0, days: int = 0):
    seconds = seconds + (minutes*60) + (hours*60*60) + (days*24*60*60)
    async def predicate(ctx: commands.Context):
        async def set_cooldown(*args, **kwargs):
            await ctx.bot.db.query('INSERT INTO cooldown(guild_id, user_id, command, ends_at) '
                                   'VALUES ($1, $2, $3, $4) ON CONFLICT(guild_id, user_id, command) '
                                   'DO UPDATE SET ends_at = EXCLUDED.ends_at',
                                   [ctx.guild.id, ctx.author.id, ctx.command.qualified_name, time()+seconds])
        def reset_cooldown(_ctx: commands.Context):
            async def reset_cooldown_wrapper(_ctx):
                await _ctx.bot.db.query('DELETE FROM cooldown WHERE guild_id=$1 AND user_id=$2 AND command=$3',
                                        [ctx.guild.id, ctx.author.id, ctx.command.qualified_name])
            ctx.bot.loop.create_task(reset_cooldown_wrapper(_ctx))
        ctx.command.before_invoke(set_cooldown)
        ctx.command.reset_cooldown = reset_cooldown

        data = await ctx.bot.db.query('SELECT * FROM cooldown WHERE guild_id=$1 AND user_id=$2 AND command=$3',
                                        [ctx.guild.id, ctx.author.id, ctx.command.qualified_name])

        if not data:
            return True
        
        elif data['ends_at'] > time():
            raise commands.CommandOnCooldown('', retry_after=data['ends_at'] - time())
        
        return True

    return commands.check(predicate)

def is_in_guild(guild_id):
    async def predicate(ctx: commands.Context):
        if ctx.guild.id != guild_id:
            raise commands.NotOwner()
        return ctx.guild.id == guild_id
    return commands.check(predicate)

def is_in_guilds(guild_ids):
    async def predicate(ctx: commands.Context):
        if ctx.guild.id not in guild_ids:
            raise commands.NotOwner()
        return ctx.guild.id in guild_ids
    return commands.check(predicate)

def closed_beta(replacement=None):
    async def predicate(ctx: commands.Context):
        if ctx.guild.id != 679582589031546880 or 756915487601983569 not in [x.id for x in ctx.author.roles]:
            raise Errors.ClosedBeta(ctx.l10n('errors.closed_beta.0', ctx.command.qualified_name) +
                                    f'\n{ctx.l10n("errors.closed_beta.1", replacement) if replacement else ""}')
        return True
    return commands.check(predicate)