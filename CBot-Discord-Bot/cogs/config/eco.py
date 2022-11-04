import discord

from discord.ext import commands

from cbot.main import CBot as Bot
from cogs.eco.general import Economy
from cbot.services.Decorators import usage, example

class Config(commands.Cog):
    '''Конфигурация бота'''
    name = "Настройки"
    def __init__(self, bot: Bot):
        self.bot = bot

    @commands.group(name='currency', invoke_without_command=True)
    @usage('currency set <символ>')
    @usage('currency reset')
    async def currency(self, ctx: commands.Context):
        '''Сменить символ валюты на сервере'''
        await ctx.send(embed=discord.Embed(title=f'Текущая валюта - `{await Economy.get_currency(ctx)}`',
                                           description=f'Вы можете сменить валюту с помощью `{ctx.prefix}currency set <валюта>`, '
                                                       f'или сбросить её с помощью `{ctx.prefix}currency reset`'))

    @currency.command(name='set')
    @usage('currency set <символ>')
    @example('currency set ₽')
    @example('currency set <:emerald2:747756150052880425>')
    @commands.has_permissions(manage_guild=True)
    async def set_currency(self, ctx: commands.Context, new_currency):
        '''Сменить символ валюты на сервере'''
        if len(new_currency) > 64:
            return await ctx.send(':warning: Максимальная длина валюты — **64** символов.')
        await self.bot.db.query('INSERT INTO currency VALUES ($1, $2) ON CONFLICT(guild_id) DO UPDATE SET currency = EXCLUDED.currency',
                                    [ctx.guild.id, new_currency])
        await ctx.send(f'Символ валюты на сервере был успешно изменён :ok_hand:')
    
    @currency.command(name='reset')
    @commands.has_permissions(manage_guild=True)
    async def reset_currency(self, ctx: commands.Context):
        '''Сбросить символ валюты на сервере'''
        await self.bot.db.query('DELETE FROM currency WHERE guild_id=$1', [ctx.guild.id])
        await ctx.send(f'Символ валюты был успешно сброшен :ok_hand:')
        

def setup(bot: Bot):
    bot.add_cog(Config(bot))