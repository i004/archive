import discord

from PIL import Image
from io import BytesIO
from datetime import datetime
from discord.ext import commands
from humanize import naturaldate

from cbot.main import CBot as Bot
from cogs.img.utils import Images as ImgUtils
from cogs.config.ideas import Config as IdeaConfig

class leaver:
    emojis = {
        "enabled": "<:toggle_enabled:732988628577419377>",
        "disabled": "<:toggle_disabled:732988356807360594>",
        "channel": "<:config_channel:733027723097931783>"
    }

    @staticmethod
    async def is_enabled(guild: discord.Guild, bot: commands.Bot) -> bool:
        '''Is leaver message enabled'''
        status = await bot.db.query('SELECT * FROM leaver_status WHERE guild_id=$1', [guild.id])
        if not status:
            return False
        
        return status['status']

    @staticmethod
    async def is_embedded(guild: discord.Guild, bot: commands.Bot) -> bool:
        '''Is leaver message embedded'''
        status = await bot.db.query('SELECT * FROM leaver_status WHERE guild_id=$1', [guild.id])
        if not status:
            return False
        
        return status['embedded']
    
    @staticmethod
    async def get_message(guild: discord.Guild, bot: commands.Bot) -> None or str:
        '''Get leaver message'''
        message = await bot.db.query('SELECT * FROM leaver_message WHERE guild_id=$1', [guild.id])
        if not message:
            return None
        
        return message['message']
    
    @staticmethod
    async def format_message(member: discord.Member, bot: commands.Bot):
        '''Format leaver message'''
        message = await leaver.get_message(member.guild, bot)
        if not message:
            return None
        
        variables = {
            '{user}': member.display_name,
            '{user.tag}': str(member),
            '{user.created}': naturaldate(member.created_at),
            '{server}': member.guild.name,
            '{server.members}': member.guild.member_count
        }

        for variable in variables:
            message = message.replace(variable, str(variables[variable]))
        
        return message
    
    @staticmethod
    async def get_channel(guild: discord.Guild, bot: commands.Bot, /, fetch: bool = True) -> None or discord.abc.Messageable or int:
        '''Get leaver channel'''
        channel = await bot.db.query('SELECT * FROM leaver_channel WHERE guild_id=$1', [guild.id])
        if not channel:
            return None
        
        return await bot.fetch_channel(channel['channel_id']) if fetch else channel['channel_id']

    @staticmethod
    async def format_embed(member: discord.Member, bot: commands.Bot, message: str) -> discord.Embed:
        '''Format embedded message'''
        embed = discord.Embed(description=message, timestamp=datetime.utcnow())
        embed.set_author(name=member.name, icon_url=member.avatar_url)
        embed.set_footer(text=member.guild.name, icon_url=member.guild.icon_url)
        embed.set_thumbnail(url=member.avatar_url)

        async with bot.session.get(str(member.avatar_url_as(format='png'))) as avatar:
            content = await avatar.content.read()
            img = Image.open(BytesIO(content))
            color = ImgUtils.most_common_colour(img)
            embed.color = discord.Colour.from_rgb(*color[:3])

        return embed

    @staticmethod
    async def send_message(member: discord.Member, destination: discord.abc.Messageable, bot: commands.Bot):
        '''Send leave message to specified channel'''
        message = await leaver.format_message(member, bot)
        if not message:
            return
        
        if await leaver.is_embedded(member.guild, bot):
            await destination.send(embed = await leaver.format_embed(member, bot, message))
        
        else:
            await destination.send(message)


class Config(commands.Cog):
    '''Конфигурация бота'''
    name = "Настройки"  
    def __init__(self, bot: Bot):
        self.bot = bot

    @commands.group(name='leaver', invoke_without_command=True)
    async def leaver(self, ctx: commands.Context):
        '''Настройки сообщения о выходе'''
        embed = discord.Embed(title='Сообщение о выходе')
        status = []

        enabled = await leaver.is_enabled(ctx.guild, self.bot)
        status.append(f'{leaver.emojis["enabled"]} Сообщение о выходе сейчас **включено**'
                      if enabled
                      else f'{leaver.emojis["disabled"]} Сообщение о выходе сейчас **выключено**')

        embedded = await leaver.is_embedded(ctx.guild, self.bot)
        status.append(f'{leaver.emojis["enabled"]} Эмбеда в сообщении для сообщений о выходе сейчас **включена**'
                      if embedded
                      else f'{leaver.emojis["disabled"]} Эмбеда в сообщении для сообщений о выходе сейчас **выключена**')

        channel = await leaver.get_channel(ctx.guild, self.bot, fetch=False)
        status.append(f'{leaver.emojis["channel"]} Текущий канал для для сообщений о выходе: **' + (f'<#{channel}>' if channel else "Не установлено") + "**")

        embed.description = '\n'.join(status)
        embed.add_field(name='Справка', value='Включить/выключить сообщение о выходе вы можете с помощью команды `leaver toggle`\n'
                                              'Сменить канал для сообщений о выходе вы можете с помощью `leaver channel set <Канал>` или `leaver channel reset` чтобы его сбросить\n\n'
                                              'Сменить сообщение для сообщений о выходе вы можете с помощью `leaver message <Новое сообщение>`. В сообщении можно указывать специальные аргументы в фигурных скобках (`{}`)')
        embed.add_field(name='Доступные переменные', value=f'**{{user}}** - Никнейм пользователя\n'
                                                           f'**{{user.tag}}** - Имя+тег пользователя\n'
                                                           f'**{{user.created}}** - Дата создания пользователя\n'
                                                           f'**{{server}}** - Имя сервера\n'
                                                           f'**{{server.members}}** - Кол-во участников сервера\n')

        embed.add_field(name='Дополнительно', value='Вы можете получить предпросмотр сообщения о выходе с помощью `leaver preview`\n\n'
                                                    'Чтобы включить/выключить режим эмбеды воспользуйтесь `leaver embed toggle`', inline=False)
        embed.set_footer(text=ctx.guild.name, icon_url=ctx.guild.icon_url)

        await ctx.send(embed = embed)
    
    @leaver.command(name='toggle')
    @commands.has_permissions(manage_guild=True)
    async def toggle(self, ctx: commands.Context):
        '''Включить/выключить сообщение о выходе'''
        enabled = await leaver.is_enabled(ctx.guild, self.bot)

        if not enabled:
            await self.bot.db.query('INSERT INTO leaver_status VALUES ($1, true, false) ON CONFLICT(guild_id) DO UPDATE SET status = excluded.status', [ctx.guild.id])
            await ctx.send('Сообщение о выходе было успешно включено :ok_hand:')

            if not await leaver.get_channel(ctx.guild, self.bot, fetch=False):
                await ctx.send(':warning: Канал для сообщений о выходе **не установлен**, установите его через `leaver channel set <канал>`')
        
        else:
            await self.bot.db.query('INSERT INTO leaver_status VALUES ($1, false, false) ON CONFLICT(guild_id) DO UPDATE SET status = excluded.status', [ctx.guild.id])
            await ctx.send('Сообщение о выходе было успешно выключено :ok_hand:')

    @leaver.group(name='embed', invoke_without_command=True)
    async def embed(self, ctx: commands.Context):
        '''Управление эмбедой в сообщении о выходе'''
        await ctx.invoke(self.bot.get_command('help'), command='leaver embed')
    
    @embed.command(name='toggle')
    @commands.has_permissions(manage_guild=True)
    async def toggle_embed(self, ctx: commands.Context):
        '''Включить/выключить эмбеду в сообщении о выходе'''
        enabled = await leaver.is_embedded(ctx.guild, self.bot)

        if not enabled:
            await self.bot.db.query('INSERT INTO leaver_status VALUES ($1, false, true) ON CONFLICT(guild_id) DO UPDATE SET embedded = excluded.embedded', [ctx.guild.id])
            await ctx.send('Эмбеда в сообщении для сообщений о выходе была успешно включена :ok_hand:')
        
        else:
            await self.bot.db.query('INSERT INTO leaver_status VALUES ($1, false, false) ON CONFLICT(guild_id) DO UPDATE SET embedded = excluded.embedded', [ctx.guild.id])
            await ctx.send('Эмбеда в сообщении для сообщений о выходе была успешно выключена :ok_hand:')

    @leaver.command(name='message', aliases=['msg'])
    @commands.has_permissions(manage_guild=True)
    async def message(self, ctx: commands.Context, *, new_message = None):
        '''Сменить сообщение для сообщений о выходе
        
        Если не указать аргумент `new_message`, бот отошлёт вам текущее сообщение для сообщений о выходе.'''
        if not new_message:
            message = await leaver.get_message(ctx.guild, self.bot)
            await ctx.send('Текущее сообщение для сообщений о выходе:', embed = discord.Embed(description=message))
            
        else:
            if len(new_message) > 1650:
                return await ctx.send(f'Макс. длина сообщения - **1650** символов. Просьба сократить ваше сообщение как минимум на **{len(new_message)-1650}** символов.')
            
            await self.bot.db.query('INSERT INTO leaver_message VALUES ($1, $2) ON CONFLICT(guild_id) DO UPDATE SET message = excluded.message', [ctx.guild.id, new_message])
            await ctx.send(f'Сообщение о выходе было успешно изменено :ok_hand:')

    @leaver.command(name='preview')
    @commands.has_permissions(manage_guild=True)
    async def preview(self, ctx: commands.Context):
        '''Предпросмотр сообщения о выходе'''
        if not await leaver.get_message(ctx.guild, self.bot):
            return await ctx.send(f':warning: Сообщение о выходе не установлено')

        await leaver.send_message(ctx.author, ctx.channel, self.bot)

        warning = []
        if not await leaver.is_enabled(ctx.guild, self.bot):
            warning.append(':warning: Сообщение о выходе не включено, включите его через `leaver toggle`')
        
        if not await leaver.get_channel(ctx.guild, self.bot, fetch=False):
            warning.append(':warning: Канал для сообщений о выходе **не установлен**, установите его через `leaver channel set <канал>`')
        
        if warning:
            await ctx.send('\n'.join(warning))
        
    @leaver.group(name='channel', invoke_without_command=True)
    async def channel(self, ctx: commands.Context):
        '''Настройки канала для сообщений о выходе'''
        channel = await leaver.get_channel(ctx.guild, self.bot, fetch=False)
        if not channel:
            channel = 'Не установлено'
        else:
            channel = f'<#{channel}>'
        
        await ctx.send(f'Текущий канал для сообщений о выходе: **{channel}**\n\n'
                        'Вы можете его сменить с помощью `leaver channel set <канал>` или убрать его с помощью `leaver channel reset`')

    @channel.command(name='reset', aliases=['remove'])
    @commands.has_permissions(manage_guild=True)
    async def reset_channel(self, ctx: commands.Context):
        '''Сбросить канал для для сообщений о выходе'''
        deleted = await self.bot.db.query('DELETE FROM leaver_channel WHERE guild_id=$1 RETURNING *', [ctx.guild.id])
        if not deleted:
            return await ctx.send(':warning: Канал для для сообщений о выходе не установлен')
        
        await ctx.send('Канал для для сообщений о выходе был успешно сброшен :ok_hand:')
    
    @channel.command(name='set')
    @commands.has_permissions(manage_guild=True)
    async def set_channel(self, ctx: commands.Context, channel: discord.TextChannel):
        '''Установить канал для для сообщений о выходе'''
        perms = channel.permissions_for(ctx.guild.me)
        if not perms.send_messages or not perms.embed_links:
            return await ctx.send(f':warning: Не удалось установить канал для для сообщений о выходе на **{channel.name}**: '
                                  f'У меня отсувствуют требуемые права!\n'
                                  f'Просьба дать мне следующие права в данном канале:\n'
                                  f'• Отправлять сообщения\n'
                                  f'• Прикреплять ссылки (эмбеды)')

        if await leaver.get_channel(ctx.guild, self.bot, fetch=False) == channel.id:
            return await ctx.send(f'Канал для для сообщений о выходе уже установлен на {channel.mention} :no_entry:')

        await self.bot.db.query('INSERT INTO leaver_channel VALUES ($1, $2) ON CONFLICT(guild_id) DO UPDATE SET channel_id = excluded.channel_id', [ctx.guild.id, channel.id])
        await ctx.send(f'Канал для для сообщений о выходе был успешно сменён на {channel.mention} :ok_hand:')

def setup(bot: Bot):
    bot.add_cog(Config(bot))