import discord

from discord.ext import commands
from cbot.main import CBot as Bot
from cbot.services.Decorators import usage, example

class Config(commands.Cog):
    '''Конфигурация бота'''
    name = "Настройки"  
    def __init__(self, bot: Bot):
        self.bot = bot
    
    async def is_runnable(self, check_function, *args, **kwargs) -> bool:
        try:
            res = check_function(*args, **kwargs)
            if type(res).__name__ == 'coroutine':
                res = await res
            return bool(res)
        except:
            return False

    @commands.group(name='disable', invoke_without_command=True)
    @usage('disable command <команда>')
    @usage('disable module <категория>')
    async def disable(self, ctx: commands.Context):
        '''Отключить определённую команду/модуль на сервере
        
        • Используйте `disable command` для того чтобы отключить команду
        • Используйте `disable module` для того чтобы отключить модуль'''
        await ctx.invoke(self.bot.get_command('help'), command='disable') 
        
    @disable.command(name='command')
    @usage('disable command <команда>')
    @example('disable command ping')
    @commands.has_permissions(administrator=True)
    async def disable_command(self, ctx: commands.Context, *, command_name: str):
        '''Отключить определённую команду'''
        if not (command := self.bot.get_command(command_name)):
            return await ctx.send(':warning: Данная команда не существует.')
        
        if command.qualified_name in ['disable command', 'enable command', 'help']:
            return await ctx.send(f'Вы не можете отключить данную команду :no_entry:')
        
        try:
            await self.bot.db.query(f'INSERT INTO disabled_commands VALUES ($1, $2)', [ctx.guild.id, command.qualified_name])
        except:
            return await ctx.send(f':warning: Данная команда уже отключена.')
        
        await ctx.send(f'Команда ``{command_name}`` была успешно отключена :ok_hand:')
    
    @disable.command(name='module')
    @usage('disable module <модуль>')
    @example('disable module Экономика')
    @commands.has_permissions(administrator=True)
    async def disable_module(self, ctx: commands.Context, *, module_name: str):
        '''Отключить определённый модуль'''
        modules = [x for x in self.bot.cogs if module_name.lower() == x.lower() or 
                                               (
                                                   hasattr(self.bot.cogs[x], "name")
                                                    and module_name.lower() == self.bot.cogs[x].name.lower()
                                               )]
        if not modules:
            return await ctx.send(':warning: Данный модуль не существует.')

        module = modules[0]
        
        if module in ['Config', 'General'] or not await self.is_runnable(self.bot.cogs[module].cog_check, ctx):
            return await ctx.send(f'Вы не можете отключить данный модуль :no_entry:')
        
        try:
            await self.bot.db.query(f'INSERT INTO disabled_commands VALUES ($1, $2)', [ctx.guild.id, module])
        except:
            return await ctx.send(f':warning: Данный модуль уже отключён.')
        
        await ctx.send(f'Модуль ``{module}`` был успешно отключён :ok_hand:')

    
    @commands.group(name='enable', invoke_without_command=True)
    @usage('enable command <команда>')
    @usage('enable module <модуль>')
    async def enable(self, ctx: commands.Context):
        '''Включить определённую команду/модуль на сервере
        
        • Используйте `enable command` для того чтобы включить команду
        • Используйте `enable module` для того чтобы включить модуль'''
        await ctx.invoke(self.bot.get_command('help'), command='disable') 
        
    @enable.command(name='command')
    @usage('enable command <команда>')
    @example('enable command ping')
    @commands.has_permissions(administrator=True)
    async def enable_command(self, ctx: commands.Context, *, command_name: str):
        '''Включить определённую команду'''
        if not self.bot.get_command(command_name):
            return await ctx.send(':warning: Данная команда не существует.')
        
        deleted = await self.bot.db.query(f'DELETE FROM disabled_commands WHERE guild_id = $1 AND command = $2 RETURNING *', [ctx.guild.id, self.bot.get_command(command_name).qualified_name])
        if not deleted:
            return await ctx.send(f':warning: Данная команда уже включена.')
        
        await ctx.send(f'Команда ``{command_name}`` была успешно включена :ok_hand:')
        
    @enable.command(name='module')
    @usage('enable module <модуль>')
    @example('enable module Экономика')
    @commands.has_permissions(administrator=True)
    async def enable_module(self, ctx: commands.Context, *, module_name: str):
        '''Включить определённый модуль'''
        modules = [x for x in self.bot.cogs if module_name.lower() == x.lower() or 
                                               (
                                                   hasattr(self.bot.cogs[x], "name")
                                                    and module_name.lower() == self.bot.cogs[x].name.lower()
                                               )]
        if not modules:
            return await ctx.send(':warning: Данный модуль не существует.')

        module = modules[0]
        
        deleted = await self.bot.db.query(f'DELETE FROM disabled_commands WHERE guild_id = $1 AND command = $2 RETURNING *', [ctx.guild.id, module])
        if not deleted:
            return await ctx.send(f':warning: Данный модуль уже включён.')
        
        await ctx.send(f'Модуль ``{module}`` был успешно включён :ok_hand:')
    


def setup(bot: Bot):
    bot.add_cog(Config(bot))