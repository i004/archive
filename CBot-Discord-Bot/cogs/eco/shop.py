import discord

from discord.ext import commands
from random import randint

from cbot.main import CBot as Bot
from cbot.services.Checks import cooldown
from cogs.eco.general import Economy as Eco
from cbot.core.Converters import User, Balance

class Economy(commands.Cog):
    '''Команды экономики'''
    name = 'Экономика'
    def __init__(self, bot: Bot):
        self.bot = bot

    @commands.command(name='shop')
    async def shop(self, ctx: commands.Context):
        '''Магазин'''
        embed = discord.Embed(title='Магазин')
        embed.add_field(name='Монеты (`coins`)', value=f'**Стоимость:** 1 изумруд\n'
                                                       f'При покупке вам выдаётся на этом сервере 25 монет.\n'
                                                       f'Изумруды можно получить за общение на любом сервере с >20 участниками (не включая ботов)')
        embed.set_footer(text=f'Используйте команду buy для покупки чего-либо из магазина')
        await ctx.send(embed=embed)
    
    @commands.command(name='buy')
    async def buy(self, ctx: commands.Context, item, amount: int = 1):
        '''Купить что-то из магазина (`shop`)'''
        if item not in ('coins',):
            return await ctx.send(f'Неизвестный товар')
        if amount < 1:
            return await ctx.send(f'Количество должно быть больше 0')
        currency = await Eco.get_currency(ctx)

        if item == 'coins':
            emeralds = await self.bot.db.query('SELECT * FROM emeralds WHERE user_id = $1', [ctx.author.id])
            if not emeralds:
                emeralds = await self.bot.db.query('INSERT INTO emeralds VALUES ($1) RETURNING *', [ctx.author.id])
            emeralds = emeralds['emeralds']
            if emeralds < amount:
                return await ctx.send(f'У вас недостаточно изумрудов для совершения покупки')
            await self.bot.db.query('UPDATE balance SET balance = balance + $1 WHERE user_id=$2 AND guild_id=$3', [amount*25, ctx.author.id, ctx.guild.id])
            await self.bot.db.query('UPDATE emeralds SET emeralds = emeralds - $1 WHERE user_id=$2', [amount, ctx.author.id])
            await ctx.send(f'Вы успешно приобрели **{amount*25}{currency}** за {amount} изумруда(ов)')

def setup(bot: Bot):
    bot.add_cog(Economy(bot))