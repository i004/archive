import os
import sys
import psutil
import discord
import platform
import humanize

from re import match
from datetime import datetime
from discord.ext import commands

del sys.modules['cbot.services']
del sys.modules['cbot.services.HelpCommand']

from cbot.main import CBot as Bot
from cbot.core.Converters import User
from cbot.services.Utils import GitInfo
from cbot.services import Paginator, HelpCommand
from cbot.services.Decorators import usage, example

class General(commands.Cog):
    def __init__(self, bot: Bot):
        self.bot = bot
        self.bot.remove_command('help')
 
    @commands.command(name='ping', aliases=['pong'])
    async def ping(self, ctx: commands.Context):
        diff = (datetime.now().timestamp() - ctx.message.created_at.timestamp())

        embed = discord.Embed(title=f':ping_pong: {round(self.bot.latency*1000, 2)}ms',
                              description='\n'.join(ctx.l10n('ping.shard', shard.id+1, round(shard.latency*1000, 2)) for shard in self.bot.shards.values()))
        embed.set_footer(text=ctx.l10n('ping.discord_api', round(diff*1000, 2)))

        await ctx.send(embed=embed)

    @commands.command(name='help')
    async def help_(self, ctx: commands.Context, *, command: str = None):
        await HelpCommand(ctx).execute(command)
    
    @commands.command(name='stats')
    async def stats(self, ctx: commands.Context):
        memory = psutil.virtual_memory()
        proc = psutil.Process()
        proc.oneshot()

        embed = discord.Embed()
        embed.set_author(name=ctx.l10n('stats.title'), icon_url=self.bot.user.avatar_url)
        
        embed.add_field(name=ctx.l10n('stats.libary'),
                        value=f'Python {platform.python_version()}\n'
                              f'discord.py {discord.__version__}')
        embed.add_field(name=ctx.l10n('stats.memory.title'),
                        value=ctx.l10n('stats.memory.value', used=humanize.naturalsize(memory.used),
                                                             total=humanize.naturalsize(memory.total),
                                                             percent=round((memory.used/memory.total)*100)))
        
        embed.add_field(name=ctx.l10n('stats.processor.title'),
                        value=ctx.l10n('stats.processor.value', threads=len(proc.threads()),
                                                                load=psutil.cpu_percent()))

        embed.add_field(name=ctx.l10n('stats.members'),
                        value=str(len(self.bot.users)))

        embed.add_field(name=ctx.l10n('stats.channels'),
                        value=str(sum([len(x.channels) for x in self.bot.guilds])))

        embed.add_field(name=ctx.l10n('stats.servers'),
                        value=str(len(self.bot.guilds)))

        embed.add_field(name=ctx.l10n('stats.shards'),
                        value=str(self.bot.shard_count or 1))
            
        embed.add_field(name=ctx.l10n('stats.latency'),
                        value=str(round(self.bot.latency*1000, 2)) + 'ms')

        embed.add_field(name=ctx.l10n('stats.database_size'),
                        value=humanize.naturalsize((await self.bot.db.query('SELECT pg_database_size(\'sc_js\')'))['pg_database_size']))

        await ctx.send(embed = embed)

    @commands.command(name='shards')
    async def shards(self, ctx: commands.Context):
        embed = discord.Embed(title=ctx.l10n('shards.title', self.bot.shard_count))
        users_in_shard = lambda shard_id: sum([x.member_count for x in self.bot.guilds if x.shard_id == shard_id])

        for shard in self.bot.shards.values():
            embed.add_field(name=ctx.l10n('shards.shard', shard.id+1) + (ctx.l10n('shards.current') if shard.id == ctx.guild.shard_id else ""),
                            value=ctx.l10n('shards.info', latency=round((shard.latency or 0)*1000, 2),
                                                          members=sum([x.member_count for x in self.bot.guilds if x.shard_id == shard.id]),
                                                          servers=len([x for x in self.bot.guilds if x.shard_id == shard.id])))

        await ctx.send(embed=embed)

    async def bot_info(self, bot):
        async with self.bot.session.get(f'https://discord.com/api/v6/oauth2/authorize?client_id={bot.id}&scope=bot') as resp:
            data = await resp.json()
            return data

    @commands.command(name='user', aliases=['member'])
    async def user(self, ctx: commands.Context, user: User = None):
        if not user:
            user = ctx.author

        user = ctx.guild.get_member(user.id) or user
        if hasattr(user, 'guild'):
            embed = discord.Embed(description=ctx.l10n('user.user_id', user.id))
            emojis = {"mobile": "📱", "web": "🌐", "desktop": "💻"}
            username = str(user) + ' '
            if user.desktop_status.name != 'offline':
                username += emojis["desktop"]
            if user.web_status.name != 'offline':
                username += emojis["web"]
            if user.mobile_status.name != 'offline':
                username += emojis["mobile"]
            embed.set_author(name=username, icon_url=user.avatar_url)
            if user.colour.value != 0:
                embed.color = user.colour
            embed.add_field(name=ctx.l10n('user.created_at'), value=humanize.naturaldate(user.created_at))
            embed.add_field(name=ctx.l10n('user.joined_at'), value=humanize.naturaldate(user.joined_at))
            embed.add_field(name=ctx.l10n('user.nickname_colour'), value=str(user.colour))
            if user.bot:
                bot_info = await self.bot_info(user)
                embed.add_field(name=ctx.l10n('user.bot_info.servers'), value=bot_info['bot']['approximate_guild_count'])
            embed.set_thumbnail(url=user.avatar_url)
            await ctx.send(embed=embed)
        else:
            embed = discord.Embed(description=ctx.l10n('user.user_id', user.id))
            embed.set_author(name=str(user), icon_url=user.avatar_url)
            embed.add_field(name=ctx.l10n('user.created_at'), value=humanize.naturaldate(user.created_at))
            embed.add_field(name=ctx.l10n('user.is_bot'), value=ctx.l10n('values.yes') if user.bot else ctx.l10n('values.no'))
            embed.add_field(name='\u200b', value='\u200b')
            if user.bot:
                bot_info = await self.bot_info(user)
                embed.add_field(name=ctx.l10n('user.bot_info.servers'), value=bot_info['bot']['approximate_guild_count'])
            embed.set_thumbnail(url=user.avatar_url)
            await ctx.send(embed=embed)

    @commands.group(name='server', aliases=['guild'], invoke_without_command=True)
    async def server(self, ctx: commands.Context):
        await ctx.invoke(self.bot.get_command('help'), command='server')
    
    @server.command(name='info')
    async def server_info(self, ctx: commands.Context):
        embed = discord.Embed(description=ctx.l10n('server.info.server_id', ctx.guild.id))
        embed.set_author(name=ctx.guild.name, icon_url=ctx.guild.icon_url)
        embed.add_field(name=ctx.l10n('server.info.members'), value=str(ctx.guild.member_count))
        embed.add_field(name=ctx.l10n('server.info.created_at'), value=humanize.naturaldate(ctx.guild.created_at))
        embed.add_field(name=ctx.l10n('server.info.region'), value=ctx.l10n(f'server.info.regions.{ctx.guild.region.name}') or ctx.l10n('server.info.regions.unknown-region'))
        embed.add_field(name=ctx.l10n('server.info.channels'), value=len(ctx.guild.channels))
        embed.add_field(name=ctx.l10n('server.info.roles'), value=len(ctx.guild.roles))
        embed.add_field(name=ctx.l10n('server.info.emojis'), value=len(ctx.guild.emojis))
        embed.add_field(name=ctx.l10n('server.info.owner'), value=ctx.guild.owner.mention)
        embed.set_footer(text=ctx.l10n('server.info.shard', ctx.guild.shard_id+1, self.bot.shard_count))
        embed.set_thumbnail(url=ctx.guild.icon_url)
        if ctx.guild.banner or ctx.guild.splash:
            embed.set_image(url=ctx.guild.banner_url or ctx.guild.splash_url)

        await ctx.send(embed = embed)

    @server.command(name='icon')
    async def server_icon(self, ctx: commands.Context):
        await ctx.send(embed = discord.Embed(description=f'**[PNG]({ctx.guild.icon_url_as(format="png")})** | **[JPEG]({ctx.guild.icon_url_as(format="jpeg")})** | **[WEBP]({ctx.guild.icon_url_as(format="webp")})**' +
                                                          (f' | **[GIF]({ctx.guild.icon_url_as(format="gif")})**' if ctx.guild.is_icon_animated() else "")) \
                                    .set_author(name=ctx.guild.name, icon_url=ctx.guild.icon_url, url=ctx.guild.icon_url) \
                                    .set_image(url=ctx.guild.icon_url))

    @server.command(name='splash')
    async def server_splash(self, ctx: commands.Context):
        if not ctx.guild.splash:
            return await ctx.send(f'У этого сервера нету фона приглашения')
        await ctx.send(embed = discord.Embed(description=f'**[PNG]({ctx.guild.splash_url_as(format="png")})** | **[JPEG]({ctx.guild.splash_url_as(format="jpeg")})** | **[WEBP]({ctx.guild.splash_url_as(format="webp")})**') \
                                    .set_author(name=ctx.guild.name, icon_url=ctx.guild.icon_url, url=ctx.guild.splash_url) \
                                    .set_image(url=ctx.guild.splash_url))

    @server.command(name='banner')
    async def server_banner(self, ctx: commands.Context):
        if not ctx.guild.banner:
            raise commands.CommandError(f'{ctx.author.id} нашёл баг!')
            
            return await ctx.send(f'У этого сервера нету баннера')
        await ctx.send(embed = discord.Embed(description=f'**[PNG]({ctx.guild.banner_url_as(format="png")})** | **[JPEG]({ctx.guild.banner_url_as(format="jpeg")})** | **[WEBP]({ctx.guild.banner_url_as(format="webp")})**') \
                                    .set_author(name=ctx.guild.name, icon_url=ctx.guild.icon_url, url=ctx.guild.banner_url) \
                                    .set_image(url=ctx.guild.banner_url))

    @commands.command(name='invite')
    async def invite(self, ctx: commands.Context, bot: User = None):
        if not bot or not bot.bot:
            bot = self.bot.user

        await ctx.send(ctx.l10n(f'invite.title', bot.name) + '\n'
                       f'{"<:blankLine:748184889869992017>"*6}\n'
                       f'<:discord_staff:603612323063791656> • {ctx.l10n("invite.all_perms")} » <https://discordapp.com/oauth2/authorize?client_id={bot.id}&permissions=8&scope=bot>\n'
                       f'<:bot:758710819613311016> • {ctx.l10n("invite.no_perms")} » <https://discordapp.com/oauth2/authorize?client_id={bot.id}&permissions=0&scope=bot>\n\n' +
                       (f'<:server_gray_plus_green:758716350431625266> • {ctx.l10n("invite.support_server")} » https://discord.gg/Ac9SPXH\n'
                        f':globe_with_meridians: • {ctx.l10n("invite.monitorings.0")} » <https://bots.server-discord.com/689532005548949555>' if bot.id == self.bot.user.id else ''))
    
    @commands.command(name='support')
    async def support(self, ctx: commands.Context):
        await ctx.send(f'{ctx.l10n("invite.support_server")} {self.bot.user.name}\n'
                       f'{"<:blankLine:748184889869992017>"*6}\n'
                       f'<:server_gray_plus_green:758716350431625266> • {ctx.l10n("invite.support_server")} » https://discord.gg/Ac9SPXH')

    @commands.command(name='about')
    async def about(self, ctx: commands.Context):
        embed = discord.Embed(colour=self.bot.colour)
        embed.set_author(name=self.bot.user.name, icon_url=self.bot.user.avatar_url)
        embed.description = ctx.l10n('about.description', servers=len(self.bot.guilds), commands=len(self.bot.commands))

        embed.add_field(name=ctx.l10n('about.links.title'), value=f'[{ctx.l10n("about.links.invite")}](https://discordapp.com/oauth2/authorize?client_id=689532005548949555&permissions=8&scope=bot)\n'
                                                                  f'[{ctx.l10n("about.links.support_server")}](https://discord.gg/Ac9SPXH)\n'
                                                                  f'[SD.C](https://bots.server-discord.com/689532005548949555)\n'
                                                                  f'[{ctx.l10n("about.links.donate")}](https://qiwi.com/n/artem6191)')

        embed.add_field(name=ctx.l10n('about.special_thanks.title'), value=f'[{self.bot.get_user(407524032292847624)}](https://github.com/tuxlabore) — {ctx.l10n("about.special_thanks.hosting")}\n'
                                                                           f'[{self.bot.get_user(476423984045359115)}](https://github.com/MrAniv) — {ctx.l10n("about.special_thanks.sponsor")}\n'
                                                                           f'**{self.bot.get_user(535178231666573322)}** — {ctx.l10n("about.special_thanks.promotion")}')

        creator = self.bot.get_user(319050081795964928)
        embed.set_footer(text=ctx.l10n('about.developer', developer=str(creator), python_version=platform.python_version()), icon_url=creator.avatar_url)

        await ctx.send(embed=embed)

    @commands.command(name='emoji', aliases=['emote'])
    async def emoji(self, ctx: commands.Context, emoji):
        if match(r'<a?:(.*):(.*)>', emoji):
            try:
                name = emoji.split(':')[1].split(':')[0]
                ID = int(emoji.split(':')[-1].split('>')[0])
                embed = discord.Embed(title=name, description=ctx.l10n('emoji.created_at', humanize.naturaldate(discord.utils.snowflake_time(ID))))
                embed.set_footer(text=f'ID: {ID}')
                embed.set_image(url=f'https://cdn.discordapp.com/emojis/{ID}.png')
                await ctx.send(embed=embed)
            except:
                return await ctx.send(ctx.l10n('emoji.unknown_emote'))
        else:
            found = False
            for emote in self.bot.emojis:
                if emoji in emote.name or str(emote.id) == emoji:
                    found = True
                    break
            
            if not found:
                return await ctx.send(ctx.l10n('emoji.unknown_emote'))
            
            await ctx.send(embed=discord.Embed(title=emote.name, description=ctx.l10n('emoji.created_at', humanize.naturaldate(emote.created_at))) \
                                        .set_footer(text=f'ID: {emote.id}') \
                                        .set_image(url=emote.url))

    @commands.command(name='avatar')
    async def avatar(self, ctx: commands.Context, user: User = None):
        if not user:
            user = ctx.author
        await ctx.send(embed = discord.Embed(description=f'**[PNG]({user.avatar_url_as(format="png")})** | **[JPEG]({user.avatar_url_as(format="jpeg")})** | **[WEBP]({user.avatar_url_as(format="webp")})**' +
                                                          (f' | **[GIF]({user.avatar_url_as(format="gif")})**' if user.is_avatar_animated() else "")) \
                                    .set_author(name=str(user), icon_url=user.avatar_url, url=user.avatar_url) \
                                    .set_image(url=user.avatar_url))

    @commands.command(name='bug')
    @commands.cooldown(1, 10, commands.BucketType.user)
    async def bug(self, ctx: commands.Context, *, text: commands.clean_content):
        await ctx.send(ctx.l10n('bug.sent'))
        await (await self.bot.fetch_channel(766740907437326346)).send(embed=discord.Embed(description=text) \
                                                                                   .set_author(name=f'{ctx.author.name} ({ctx.author.id})', icon_url=ctx.author.avatar_url) \
                                                                                   .set_footer(text=f'{ctx.guild.name} ({ctx.guild.id}) | в канаде {ctx.channel.name} ({ctx.channel.id})', icon_url=ctx.guild.icon_url))

def setup(bot: commands.Bot):
    bot.add_cog(General(bot))
