from discord.ext import commands
from cbot.core.Errors import UserIsBlacklisted
import discord

async def is_disabled(ctx: commands.Context, command: str) -> bool:
    return bool(await ctx.bot.db.query(f'SELECT * FROM disabled_commands WHERE guild_id=$1 AND command=$2',
                                        [ctx.guild.id, command]))

class BotChecks:
    @staticmethod
    async def MainCheck(ctx: commands.Context):
        return await BotChecks.is_command_disabled(ctx) and await BotChecks.is_blacklisted(ctx)

    @staticmethod
    async def is_command_disabled(ctx: commands.Context):
        if ctx.command.qualified_name in ctx.bot.config.disabled_commands and not await ctx.bot.is_owner(ctx.author): # If command is disabled by developer(s)
            raise commands.DisabledCommand(ctx.l10n('errors.command_is_disabled.by_developer', ctx.command.qualified_name))

        elif await is_disabled(ctx, ctx.command.qualified_name): # If command is disabled by server owner
            raise commands.DisabledCommand(ctx.l10n('errors.command_is_disabled.by_server_owner', ctx.command.qualified_name))
        
        elif ctx.command.parent and await is_disabled(ctx, ctx.command.parent.qualified_name): # If command group is disabled by server owner
            raise commands.DisabledCommand(ctx.l10n('errors.command_is_disabled.by_server_owner', ctx.command.parent.qualified_name))
        
        elif ctx.command.cog_name and await ctx.bot.db.query(f'SELECT * FROM disabled_commands WHERE guild_id=$1 AND command=$2',
                                                [ctx.guild.id, ctx.command.cog_name]): # If command module is disabled by server owner
            raise commands.DisabledCommand(ctx.l10n('errors.command_is_disabled.by_module', ctx.command.cog_name))
        
        else:
            return True
    
    @staticmethod
    async def is_blacklisted(ctx: commands.Context):
        if (record := await ctx.bot.db.query('SELECT * FROM blacklist WHERE user_id=$1', [ctx.author.id])) and ctx.command.name != 'support': # If user are blacklisted
            raise UserIsBlacklisted(record['reason'])
        
        else:
            return True