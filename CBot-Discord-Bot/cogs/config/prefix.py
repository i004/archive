import discord

from discord.ext import commands

from cbot.main import CBot as Bot
from cbot.services.Decorators import usage, example

class Config(commands.Cog):
    '''Конфигурация бота'''
    name = "Настройки"
    def __init__(self, bot: Bot):
        self.bot = bot
    
    async def get_prefix(self, /, guild: discord.Guild = None, user: discord.User = None):
        if not guild and not user:
            raise ValueError('Excepted `guild` or `user` parameter')
            
        if guild and user:
            return {"guild": await self.get_prefix(guild=guild),
                    "user": await self.get_prefix(user=user)}
        
        elif guild:
            prefix = await self.bot.db.query('SELECT * FROM prefixes WHERE id=$1', [guild.id])
            if not prefix:
                return
            return prefix['prefix']
        
        elif user:
            prefix = await self.bot.db.query('SELECT * FROM prefixes WHERE id=$1', [user.id])
            if not prefix:
                return
            return prefix['prefix']

    @commands.group(name='prefix', invoke_without_command=True)
    @usage('prefix server <новый префикс сервера>')
    @usage('prefix self <ваш новый префикс>')
    async def prefix(self, ctx: commands.Context):
        '''Настройки префикса бота'''
        
        embed = discord.Embed(title=f'Текущий префикс бота: ``{ctx.prefix}``',
                              description=f'Префикс сервера: ``{(await self.get_prefix(guild=ctx.guild)) or "Не установлено"}``\n'
                                          f'Ваш префикс: ``{(await self.get_prefix(user=ctx.author)) or "Не установлено"}``')

        embed.add_field(name='Справка', value=(f'`{ctx.prefix}{ctx.command.name} server <новый префикс>`: Установить префикс для сервера\n'
                                               f'`{ctx.prefix}{ctx.command.name} self <новый префикс>`: Установить свой уникальный префикс\n\n'
                                               f'Укажите `reset` вместо нового префикса, чтобы сбросить ваш префикс или префикс сервера'))

        embed.set_footer(text=ctx.guild.name, icon_url=ctx.guild.icon_url)

        await ctx.send(embed=embed)
    
    @prefix.group(name='server', aliases=['guild'], invoke_without_command=True)
    @usage('prefix server <новый префикс сервера>')
    @usage('prefix server reset')
    @example('prefix server !')
    @commands.has_permissions(manage_guild=True)
    async def serverprefix(self, ctx: commands.Context, prefix: str):
        '''Сменить префикс сервера'''
        await self.bot.db.query(f'INSERT INTO prefixes VALUES ($1, $2) ON CONFLICT(id) DO UPDATE SET prefix = EXCLUDED.prefix', [ctx.guild.id, prefix])
        await ctx.send(f'Префикс сервера был успешно сменён :ok_hand:')
    
    @serverprefix.command(name='reset')
    @commands.has_permissions(manage_guild=True)
    async def reset_server_prefix(self, ctx: commands.Context):
        '''Сбросить префикс сервера'''
        await self.bot.db.query(f'DELETE FROM prefixes WHERE id=$1', [ctx.guild.id])
        await ctx.send(f'Префикс сервера был успешно сброшен :ok_hand:')
    
    @prefix.group(name='self', invoke_without_command=True)
    @usage('prefix self <ваш новый префикс>')
    @usage('prefix self reset')
    @example('prefix self !')
    async def selfprefix(self, ctx: commands.Context, prefix: str):
        '''Сменить свой префикс'''
        await self.bot.db.query(f'INSERT INTO prefixes VALUES ($1, $2) ON CONFLICT(id) DO UPDATE SET prefix = EXCLUDED.prefix', [ctx.author.id, prefix])
        await ctx.send(f'Ваш префикс был успешно сменён :ok_hand:')
    
    @selfprefix.command(name='reset')
    async def reset_self_prefix(self, ctx: commands.Context):
        '''Сбросить свой префикс'''
        await self.bot.db.query(f'DELETE FROM prefixes WHERE id=$1', [ctx.author.id])
        await ctx.send(f'Ваш префикс был успешно сброшен :ok_hand:')

def setup(bot: Bot):
    bot.add_cog(Config(bot))