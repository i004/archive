import discord

from discord.ext import commands
from PIL import Image
from io import BytesIO
from time import ctime
from asyncio import sleep

from cbot.main import CBot as Bot
from cogs.config.leaver import leaver
from cogs.config.welcomer import Welcomer
from cbot.core.BotConfig import BotConfig
from cbot.services.Emojis import GetEmoji
from cogs.img.utils import Images as ImgUtils
from cbot.services import Logger, WebhookClient
from cogs.config.prefix import Config as Prefix

class Events(commands.Cog):
    def __init__(self, bot: Bot):
        self.bot = bot
        self.checking = []
        if not hasattr(self.bot, 'colour'):
            self.bot.colour = 0x0

    @commands.Cog.listener()
    async def on_message(self, msg: discord.Message):
        if not msg.author.bot and msg.content in (f'<@!{self.bot.user.id}>', f'<@{self.bot.user.id}>'):
            prefix = await self.bot.get_prefix(msg)
            guild_prefix = await self.bot.db.query('SELECT * FROM prefixes WHERE id=$1', [msg.guild.id])
            user_prefix = await self.bot.db.query('SELECT * FROM prefixes WHERE id=$1', [msg.author.id])
            if guild_prefix:
                guild_prefix = guild_prefix.get('prefix')
            if user_prefix:
                user_prefix = user_prefix.get('prefix')

            return await msg.channel.send(msg.author.mention, embed=discord.Embed(title=f'Мой префикс — `{prefix[-1]}`',
                                                                                  description=f'Префикс сервера — `{guild_prefix or "Не установлено"}`\n'
                                                                                              f'Ваш префикс — `{user_prefix or "Не установлено"}`') \
                                                                           .add_field(name=f':memo: Вы можете получить список команд с помощью `help`\n'
                                                                                           f':ping_pong: Мой пинг — {round(self.bot.latency*1000, 2)}ms',
                                                                                      value='Вы можете сменить мой префикс с помощью команды `prefix`') \
                                                                           .set_author(name=msg.author.name, icon_url=msg.author.avatar_url))

    @commands.Cog.listener()
    async def on_message_edit(self, before: discord.Message, after: discord.Message):
        if before.content == after.content or not after.guild or after.author.bot:
            return
        
        await self.bot.process_commands(after)
    
    @commands.Cog.listener()
    async def on_member_join(self, member: discord.Member):
        if not await Welcomer.is_enabled(member.guild, self.bot):
            return
        
        channel = await Welcomer.get_channel(member.guild, self.bot)
        if not channel:
            return
        
        await Welcomer.send_message(member, channel, self.bot)
    
    @commands.Cog.listener()
    async def on_member_remove(self, member: discord.Member):
        if not await leaver.is_enabled(member.guild, self.bot):
            return
        
        channel = await leaver.get_channel(member.guild, self.bot)
        if not channel:
            return
        
        await leaver.send_message(member, channel, self.bot)

    @commands.Cog.listener()
    async def on_ready(self):
        async with self.bot.session.get(str(self.bot.user.avatar_url_as(format='png'))) as avatar:
            content = await avatar.content.read()
            img = Image.open(BytesIO(content)).resize((100,100), Image.NEAREST).convert('RGB')
            px = img.load()
            to_hex = lambda rgb: '%02x%02x%02x' % rgb
            self.bot.colour = int(to_hex(px[0, 0]), 16)

    @commands.Cog.listener()
    async def on_shard_connect(self, shard_id):
        Logger.info(f'[Shards] Shard #{shard_id} connected')
        await WebhookClient(BotConfig.webhooks['ws_logs']) \
                  .send(f'[``{ctime()}``] <:status_idle:732567956050935859> Shard #{shard_id+1} connected')

    @commands.Cog.listener()
    async def on_shard_ready(self, shard_id):
        Logger.info(f'[Shards] Shard #{shard_id} ready')
        await WebhookClient(BotConfig.webhooks['ws_logs']) \
                  .send(f'[``{ctime()}``] <:status_online:732568000070418473> Shard #{shard_id+1} ready')

    @commands.Cog.listener()
    async def on_shard_disconnect(self, shard_id):
        Logger.warn(f'[Shards] Shard #{shard_id} disconnected')
        await WebhookClient(BotConfig.webhooks['ws_logs']) \
                  .send(f'[``{ctime()}``] <:status_dnd:732567911348043777> Shard #{shard_id+1} disconnected')
    
    @commands.Cog.listener()
    async def on_shard_resumed(self, shard_id):
        Logger.info(f'[Shards] Shard #{shard_id} resumed')
        await WebhookClient(BotConfig.webhooks['ws_logs']) \
                  .send(f'[``{ctime()}``] <:status_online:732568000070418473> Shard #{shard_id+1} resumed')
    
    @commands.Cog.listener()
    async def on_guild_join(self, guild: discord.Guild):
        await WebhookClient(BotConfig.webhooks['server_logs']) \
                        .send(embed=discord.Embed(title='Меня добавили на сервер', color=0x66c358) \
                                        .set_author(name=guild.name, icon_url=guild.icon_url) \
                                        .add_field(name='Кол-во пользователей', value=str(guild.member_count)) \
                                        .add_field(name='ID', value=str(guild.id)) \
                                        .add_field(name='Шард', value=str(guild.shard_id or 0)) \
                                        .set_footer(text=f'Теперь у меня {len(self.bot.guilds)} серверов'))
    
    @commands.Cog.listener()
    async def on_guild_remove(self, guild: discord.Guild):
        await WebhookClient(BotConfig.webhooks['server_logs']) \
                        .send(embed=discord.Embed(title='Меня убрали с сервера', color=0xca5958) \
                                        .set_author(name=guild.name, icon_url=guild.icon_url) \
                                        .add_field(name='ID', value=str(guild.id)) \
                                        .set_footer(text=f'Теперь у меня {len(self.bot.guilds)} серверов'))

def setup(bot: Bot):
    bot.add_cog(Events(bot))
