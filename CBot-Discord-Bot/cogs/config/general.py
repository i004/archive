import discord

from discord.ext import commands

from cbot.main import CBot as Bot
from cogs.config.ideas import Config as IdeaConfig

class Config(commands.Cog):
    '''Конфигурация бота'''
    name = "Настройки"  
    def __init__(self, bot: Bot):
        self.bot = bot

    @commands.command(name='settings', aliases=['config'])
    @commands.has_permissions(manage_guild=True)
    async def settings(self, ctx: commands.Context):
        '''Просмотр настроек бота'''
        embed = discord.Embed()
        embed.set_author(name=f'{ctx.guild.name}: Настройки', icon_url=ctx.guild.icon_url)
        
        disabled = await self.bot.db.query('SELECT * FROM disabled_commands WHERE guild_id = $1', [ctx.guild.id], return_list=False)
        disabled_modules = [getattr(self.bot.cogs[x['command']], "name", x['command']) for x in disabled if x['command'] in self.bot.cogs]
        disabled_commands = [x['command'] for x in disabled if self.bot.get_command(x['command'])]

        embed.add_field(name='Отключённые модули', value='\n'.join(disabled_modules) or 'Пусто')
        embed.add_field(name='Отключённые команды', value='\n'.join(disabled_commands) or 'Пусто')
        try:
            idea_channel = await IdeaConfig.get_idea_channel(ctx)
            embed.add_field(name='Канал для идей', value=idea_channel.mention if idea_channel else "Не установлено")
        except:
            embed.add_field(name='Канал для идей', value="Не установлено")

        embed.add_field(name='\u200b\nСправка', value=('Все команды из отключённых модулей **не могут** быть выполнены на этом сервере. Вы можете отключить модуль с помощью `disable module <Модуль>` или включить его обратно с помощью `enable module <Модуль>`\n'
                                                       'Точно так же и с командами, только их можно отключить с помощью `disable command <Команда>` и включить с помощью `enable command`\n\n'
                                                       'Настройки канала для идей доступны в команде `suggestion`\n'
                                                       'Настройки сообщения о заходе/выходе с сервера доступны в команде `welcomer` и `leaver`\n'
                                                       'Настройки авто-реакций доступны в команде `auto-react`'), inline=False)

        await ctx.send(embed=embed)

def setup(bot: Bot):
    bot.add_cog(Config(bot))