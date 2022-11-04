import discord

from discord.ext import commands

from cbot.main import CBot as Bot
from cbot.services.Decorators import usage, example

class Config(commands.Cog):
    '''Конфигурация бота'''
    name = "Настройки"  
    def __init__(self, bot: Bot):
        self.bot = bot

    @staticmethod
    async def get_idea_channel(ctx: commands.Context) -> discord.abc.Messageable or None:
        '''Get suggestion channel'''
        idea_channel = await ctx.bot.db.query('SELECT * FROM idea_channel WHERE guild_id=$1', [ctx.guild.id])
        if not idea_channel:
            return None
        return await ctx.bot.fetch_channel(idea_channel['channel_id'])

    @commands.group(name='suggestion', invoke_without_command=True)
    @usage('suggestion channel')
    @usage('suggestion channel set <канал>')
    async def suggestion(self, ctx: commands.Context):
        '''Управление идеями
        
        • Вы можете сменить канал для идей с помощью ``suggestion channel``'''
        await ctx.invoke(self.bot.get_command('help'), command='suggestion')
    
    @suggestion.group(name='channel', invoke_without_command=True)
    @usage('suggestion channel set <канал>')
    @commands.has_permissions(manage_guild=True)
    async def suggestion_channel(self, ctx: commands.Context):
        '''Канал для идей'''
        idea_channel = await self.get_idea_channel(ctx)
        await ctx.send(embed = discord.Embed(title='Канал для идей') \
                                    .add_field(name='Текущий канал для идей', value=idea_channel.mention if idea_channel else "Не установлено")
                                    .add_field(name='\u200b\nСправка', value='Вы можете сменить канал для идей с помощью `suggestion channel set <Новый канал>` или убрать его с помощью `suggestion channel reset`', inline=False))

    @suggestion_channel.command(name='set')
    @usage('suggestion channel set <канал>')
    @example('suggestion channel set {ctx.channel.mention}')
    @commands.has_permissions(manage_guild=True)
    async def set_suggestion_channel(self, ctx: commands.Context, new_channel: discord.TextChannel):
        '''Сменить канал для идей'''
        perms = new_channel.permissions_for(ctx.guild.me)
        if not perms.send_messages or not perms.add_reactions or not perms.embed_links:
            return await ctx.send(':no_entry: Я не могу отправлять сообщения в этот канал!\n'
                                  'Предоставьте мне следующие права в указанном вами канале:\n'
                                  '**• Отправлять сообщения**\n'
                                  '**• Добавлять реакции**\n'
                                  '**• Прикреплять ссылки**\n')
        await self.bot.db.query('INSERT INTO idea_channel VALUES ($1, $2) ON CONFLICT (guild_id) DO UPDATE SET channel_id = EXCLUDED.channel_id',
                                    [ctx.guild.id, new_channel.id])
        await ctx.send(f'Канал для идей успешно сменён на **{new_channel.name}** :ok_hand:')

def setup(bot: Bot):
    bot.add_cog(Config(bot))