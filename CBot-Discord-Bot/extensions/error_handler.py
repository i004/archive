import sys
import discord
import traceback
import cbot.core.Errors as Errors

from hashlib import shake_128
from datetime import timedelta
from discord.ext import commands

from cbot.main import CBot as Bot
from cbot.core.BotConfig import BotConfig
from cbot.services import HelpCommand, WebhookClient
from cogs.music import NoChannelProvided, IncorrectChannelError

class ErrorHandler(commands.Cog):
    def __init__(self, bot: Bot):
        self.bot = bot
    
    @commands.Cog.listener()
    async def on_command_error(self, ctx, error):
        if hasattr(ctx.command, 'on_error'):
            return

        # This prevents any cogs with an overwritten cog_command_error being handled here.
        cog = ctx.cog
        if cog:
            if cog._get_overridden_method(cog.cog_command_error) is not None:
                return

        error = getattr(error, 'original', error)

        if not isinstance(error, commands.CommandOnCooldown) and ctx.command and hasattr(ctx.command, 'reset_cooldown'):
            ctx.command.reset_cooldown(ctx)

        if isinstance(error, commands.CommandNotFound) or isinstance(error, commands.NotOwner) or isinstance(error, IncorrectChannelError): # Ignored errors
            return

        elif isinstance(error, commands.BadArgument) or isinstance(error, commands.UserInputError): # Bad argument or missing argument
            embed = await HelpCommand(ctx).GetCommandHelp(ctx.command)
            await ctx.send(ctx.l10n('errors.incorrect_args', ctx.command.qualified_name),
                            embed = embed)
        
        elif isinstance(error, NoChannelProvided):
            await ctx.send(ctx.l10n('errors.NoChannelProvided'))

        elif isinstance(error, commands.CommandOnCooldown): # Command on cooldown
            retry_after = str(timedelta(seconds=error.retry_after)).split('.')[0]
            await ctx.send(ctx.l10n('errors.command_on_cooldown', str(retry_after)))

        elif isinstance(error, commands.MissingPermissions): # Missing permissions
            missing_permissions = '\n'.join(f'- {ctx.l10n(f"errors.permissions.{x}")};' for x in error.missing_perms)
            await ctx.send(f'{ctx.l10n("errors.user_missing_perms")}\n```diff\n{missing_permissions[:len(missing_permissions)-1]}\n```')

        elif isinstance(error, Errors.IncorrectBalance): # Incorrect balance provided
            await ctx.send(str(error.args[0]))

        elif isinstance(error, commands.BotMissingPermissions): # Bot missing permissions
            await ctx.send(ctx.l10n('errors.bot_missing_perms'))
        
        elif isinstance(error, commands.DisabledCommand): # Command is disabled
            await ctx.send(str(error.args[0]) or ctx.l10n('errors.command_is_disabled.by_developer'))

        elif isinstance(error, Errors.ClosedBeta): # Command is in closed beta testing
            await ctx.send(f':warning: {error.args[0]}')

        elif isinstance(error, Errors.NumberErrors.NotInRange):
            await ctx.send(ctx.l10n('errors.numbers.NotInRange', error.min, error.max))
        
        elif isinstance(error, Errors.NumberErrors.BiggerThan):
            await ctx.send(ctx.l10n('errors.numbers.BiggerThan', error.number))

        elif isinstance(error, Errors.NumberErrors.LowerThan):
            await ctx.send(ctx.l10n('errors.numbers.LowerThan', error.number))
        
        elif isinstance(error, Errors.WavelinkNotConnected):
            await ctx.send(ctx.l10n('errors.wavelink_not_connected'))
        
        elif isinstance(error, Errors.UserIsBlacklisted):
            await ctx.send(f'{ctx.l10n("errors.blacklisted", prefix=ctx.prefix)}\n\n' +
                           (ctx.l10n("errors.blacklist_reason", error.args[0]) if error.args else ""))

        elif isinstance(error, commands.CheckFailure): # Check failure
            await ctx.send(str(error.args[0]))

        else: # Unknown error
            traceback_ = "\n".join(traceback.format_exception(type(error), error, error.__traceback__))
            error_code = shake_128(bytes(traceback_, "utf8")).hexdigest(6)
            webhook = WebhookClient(BotConfig.webhooks['command_errors'])
            embed = discord.Embed(title=f'Произошла ошибка в команде ``{ctx.command}``',
                                        description=f'```py\n{traceback_[:1990]}\n```') \
                                            .add_field(name='Краткая ошибка', value=f'{type(error).__name__}: {error}') \
                                            .add_field(name='Сообщение', value=ctx.message.content[:500]) \
                                            .set_footer(text=f'{ctx.author.name} ({ctx.author.id}) в канале {ctx.channel.name} ({ctx.channel.id}) на сервере {ctx.guild.name} ({ctx.guild.id}) | Код ошибки: {error_code}')
            await webhook.send(embed = embed)

            try:
                await ctx.send(embed=discord.Embed(description=ctx.l10n('errors.unknown_error.embed.description', prefix=ctx.prefix)) \
                                            .set_author(name=ctx.l10n('errors.unknown_error.embed.title', command=ctx.command.qualified_name),
                                                        icon_url='https://cdn.discordapp.com/emojis/767074041760186408.png?v=1') \
                                            .add_field(name=ctx.l10n('errors.unknown_error.embed.error_info.title'),
                                                        value=ctx.l10n('errors.unknown_error.embed.error_info.value', error_code=error_code, error_name=type(error).__name__)))
            except:
                await ctx.send(ctx.l10n('errors.unknown_error.plain_text',
                                            prefix=ctx.prefix, command=ctx.command.qualified_name,
                                            error_code=error_code, error_name=type(error).__name__))

def setup(bot: Bot):
    bot.add_cog(ErrorHandler(bot))