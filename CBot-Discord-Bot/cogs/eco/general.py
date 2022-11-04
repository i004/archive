import discord

from random import randint
from discord.ext import commands

from cbot.main import CBot as Bot
from cbot.core.Converters import User, Balance
from cbot.services.Checks import cooldown

class Economy(commands.Cog):
    '''Команды экономики'''
    name = 'Экономика'
    def __init__(self, bot: Bot):
        self.bot = bot

    @staticmethod
    async def get_currency(ctx: commands.Context):
        currency = '$'
        if (record := await ctx.bot.db.query('SELECT * FROM currency WHERE guild_id=$1', [ctx.guild.id])):
            currency = record['currency']
        return currency

    @staticmethod
    async def user_place(ctx: commands.Context, user: discord.User = None):
        users = await ctx.bot.db.query('SELECT * FROM balance WHERE guild_id=$1 ORDER BY balance+bank DESC', [ctx.guild.id], return_list=False)
        if not users:
            return None

        for place, user_data in enumerate(users):
            if user_data['user_id'] == (user or ctx.author).id:
                return place+1

        return None

    @commands.command(name='work')
    @cooldown(hours=1)
    async def work(self, ctx: commands.Context):
        '''Сходить на работу
        
        • Доступно только раз в **1 час**'''
        coins = randint(15,50)
        currency = await Economy.get_currency(ctx)
        bal = await self.bot.db.query('INSERT INTO balance VALUES ($1, $2, $3) '
                                      'ON CONFLICT(guild_id, user_id) DO UPDATE SET balance = balance.balance + EXCLUDED.balance '
                                      'RETURNING *', [ctx.guild.id, ctx.author.id, coins])
        
        await ctx.send(embed = discord.Embed(title=f'Вы сходили на работу и получили {coins}{currency}', description=f'Всего {bal["balance"]}{currency}'))

    @commands.command(name='daily')
    @cooldown(days=1)
    async def daily(self, ctx: commands.Context):
        '''Получить ежедневные деньги
        
        • Доступно только раз в **1 день**'''
        coins = 100
        currency = await Economy.get_currency(ctx)
        bal = await self.bot.db.query('INSERT INTO balance VALUES ($1, $2, $3) '
                                      'ON CONFLICT(guild_id, user_id) DO UPDATE SET balance = balance.balance + EXCLUDED.balance '
                                      'RETURNING *', [ctx.guild.id, ctx.author.id, coins])
        
        await ctx.send(embed = discord.Embed(title=f'Вы получили ежедневные деньги в размере {coins}{currency}', description=f'Всего {bal["balance"]}{currency}'))

    @commands.command(name='deposit', aliases=['dep'])
    async def deposit(self, ctx: commands.Context, amount: Balance('balance')):
        '''Положить деньги в банк'''
        await self.bot.db.query('UPDATE balance SET balance = balance - $1, bank = bank + $1 WHERE user_id=$2 AND guild_id=$3', [amount, ctx.author.id, ctx.guild.id])
        currency = await Economy.get_currency(ctx)
        await ctx.send(f'Вы успешно положили **{amount}{currency}** в банк :ok_hand:')

    @commands.command(name='withdraw', aliases=['with'])
    async def withdraw(self, ctx: commands.Context, amount: Balance('bank')):
        '''Забрать деньги с банка'''
        await self.bot.db.query('UPDATE balance SET balance = balance + $1, bank = bank - $1 WHERE user_id=$2 AND guild_id=$3', [amount, ctx.author.id, ctx.guild.id])
        currency = await Economy.get_currency(ctx)
        await ctx.send(f'Вы успешно забрали **{amount}{currency}** из банка :ok_hand:')

    @commands.command(name='leaderboard', aliases=['lb', 'top'])
    async def leaderboarad(self, ctx: commands.Context):
        '''Топ-10 самых богатых пользователей сервера'''
        users = await self.bot.db.query('SELECT * FROM balance WHERE guild_id=$1 ORDER BY balance+bank DESC LIMIT 10', [ctx.guild.id], return_list=False)
        em = ['one', 'two', 'three', 'four', 'five', 'six', 'seven', 'eight', 'nine', 'keycap_ten']
        leaderboard = []
        currency = await Economy.get_currency(ctx)
        user_place = await Economy.user_place(ctx)

        for place, user in enumerate(users):
            u = '__' if user['user_id'] == ctx.author.id else ''
            leaderboard.append(f'**:{em[place]}: • {u}{ctx.guild.get_member(user["user_id"]) or "Неизвестный пользователь"}{u}:** {user["balance"]+user["bank"]}{currency}')
        
        await ctx.send(embed=discord.Embed(description='\n'.join(leaderboard)) \
                                    .set_author(name='ТОП-10 самых богатых пользователей на этом сервере',
                                                icon_url='https://cdn.discordapp.com/emojis/753315789297418380.png?v=1')
                                    .set_footer(text=f'Ваше место: {user_place}' if user_place else ''))

    @commands.command(name='pay', aliases=['give', 'gift'])
    async def pay(self, ctx: commands.Context, user: User, amount: Balance('balance')):
        '''Перечислить пользователю деньги'''
        user = ctx.guild.get_member(user.id)
        if not user:
            return await ctx.invoke(self.bot.get_command('help'), command='pay')

        if user.bot:
            return await ctx.send(f':warning: Вы не можете переводить деньги ботам')
        if user.id == ctx.author.id:
            return await ctx.send(f':warning: Вы не можете переводить деньги самому себе')
        
        author_bal = await self.bot.db.query('UPDATE balance SET balance = balance - $1 WHERE user_id=$2 AND guild_id=$3 RETURNING *', [amount, ctx.author.id, ctx.guild.id])
        if not author_bal:
            return # small bugfix
        
        await self.bot.db.query('INSERT INTO balance VALUES ($1,$2,$3) ON CONFLICT(guild_id, user_id) DO UPDATE '
                                'SET balance = balance.balance + EXCLUDED.balance', [ctx.guild.id, user.id, amount])

        currency = await Economy.get_currency(ctx)
        await ctx.send(f'Вы успешно перевели **{amount}{currency}** пользователю **{user}** :ok_hand:\n'
                       f'Остаток на балансе: **{author_bal["balance"]}{currency}**')

    @commands.command(name='rep')
    @cooldown(hours=12)
    async def rep(self, ctx: commands.Context, user: User):
        '''Дать репутацию пользователю'''
        if user.bot:
            ctx.command.reset_cooldown(ctx)
            return await ctx.send(':warning: Вы не можете выдавать репутацию ботам')
        
        if user.id == ctx.author.id:
            ctx.command.reset_cooldown(ctx)
            return await ctx.send(':warning: Мы конечно-же всё понимаем, у вас высокое самолюбие, но пожалуйста, держите его при себе.')
        
        await self.bot.db.query('INSERT INTO balance VALUES ($1, $2, 0) ON CONFLICT(guild_id, user_id) DO NOTHING', [ctx.guild.id, user.id])
        reputation = await self.bot.db.query('UPDATE balance SET reputation = reputation + 1 WHERE guild_id=$1 AND user_id=$2 RETURNING *', [ctx.guild.id, user.id])
        await ctx.send(f':sparkles: Вы повысили репутацию **{user}**\nТеперь у него {reputation["reputation"]} репутации')

    @commands.Cog.listener()
    async def on_message(self, msg: discord.Message):
        if not msg.guild or msg.author.bot:
            return
        if randint(1, 100) == 1:
            await self.bot.db.query('INSERT INTO emeralds VALUES ($1, 1) ON CONFLICT(user_id) DO UPDATE SET emeralds = emeralds.emeralds + 1', [msg.author.id])

def setup(bot: Bot):
    bot.add_cog(Economy(bot))