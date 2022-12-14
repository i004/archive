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
    '''???????????????????????? ????????'''
    name = "??????????????????"  
    def __init__(self, bot: Bot):
        self.bot = bot

    @commands.group(name='leaver', invoke_without_command=True)
    async def leaver(self, ctx: commands.Context):
        '''?????????????????? ?????????????????? ?? ????????????'''
        embed = discord.Embed(title='?????????????????? ?? ????????????')
        status = []

        enabled = await leaver.is_enabled(ctx.guild, self.bot)
        status.append(f'{leaver.emojis["enabled"]} ?????????????????? ?? ???????????? ???????????? **????????????????**'
                      if enabled
                      else f'{leaver.emojis["disabled"]} ?????????????????? ?? ???????????? ???????????? **??????????????????**')

        embedded = await leaver.is_embedded(ctx.guild, self.bot)
        status.append(f'{leaver.emojis["enabled"]} ???????????? ?? ?????????????????? ?????? ?????????????????? ?? ???????????? ???????????? **????????????????**'
                      if embedded
                      else f'{leaver.emojis["disabled"]} ???????????? ?? ?????????????????? ?????? ?????????????????? ?? ???????????? ???????????? **??????????????????**')

        channel = await leaver.get_channel(ctx.guild, self.bot, fetch=False)
        status.append(f'{leaver.emojis["channel"]} ?????????????? ?????????? ?????? ?????? ?????????????????? ?? ????????????: **' + (f'<#{channel}>' if channel else "???? ??????????????????????") + "**")

        embed.description = '\n'.join(status)
        embed.add_field(name='??????????????', value='????????????????/?????????????????? ?????????????????? ?? ???????????? ???? ???????????? ?? ?????????????? ?????????????? `leaver toggle`\n'
                                              '?????????????? ?????????? ?????? ?????????????????? ?? ???????????? ???? ???????????? ?? ?????????????? `leaver channel set <??????????>` ?????? `leaver channel reset` ?????????? ?????? ????????????????\n\n'
                                              '?????????????? ?????????????????? ?????? ?????????????????? ?? ???????????? ???? ???????????? ?? ?????????????? `leaver message <?????????? ??????????????????>`. ?? ?????????????????? ?????????? ?????????????????? ?????????????????????? ?????????????????? ?? ???????????????? ?????????????? (`{}`)')
        embed.add_field(name='?????????????????? ????????????????????', value=f'**{{user}}** - ?????????????? ????????????????????????\n'
                                                           f'**{{user.tag}}** - ??????+?????? ????????????????????????\n'
                                                           f'**{{user.created}}** - ???????? ???????????????? ????????????????????????\n'
                                                           f'**{{server}}** - ?????? ??????????????\n'
                                                           f'**{{server.members}}** - ??????-???? ???????????????????? ??????????????\n')

        embed.add_field(name='??????????????????????????', value='???? ???????????? ???????????????? ???????????????????????? ?????????????????? ?? ???????????? ?? ?????????????? `leaver preview`\n\n'
                                                    '?????????? ????????????????/?????????????????? ?????????? ???????????? ???????????????????????????? `leaver embed toggle`', inline=False)
        embed.set_footer(text=ctx.guild.name, icon_url=ctx.guild.icon_url)

        await ctx.send(embed = embed)
    
    @leaver.command(name='toggle')
    @commands.has_permissions(manage_guild=True)
    async def toggle(self, ctx: commands.Context):
        '''????????????????/?????????????????? ?????????????????? ?? ????????????'''
        enabled = await leaver.is_enabled(ctx.guild, self.bot)

        if not enabled:
            await self.bot.db.query('INSERT INTO leaver_status VALUES ($1, true, false) ON CONFLICT(guild_id) DO UPDATE SET status = excluded.status', [ctx.guild.id])
            await ctx.send('?????????????????? ?? ???????????? ???????? ?????????????? ???????????????? :ok_hand:')

            if not await leaver.get_channel(ctx.guild, self.bot, fetch=False):
                await ctx.send(':warning: ?????????? ?????? ?????????????????? ?? ???????????? **???? ????????????????????**, ???????????????????? ?????? ?????????? `leaver channel set <??????????>`')
        
        else:
            await self.bot.db.query('INSERT INTO leaver_status VALUES ($1, false, false) ON CONFLICT(guild_id) DO UPDATE SET status = excluded.status', [ctx.guild.id])
            await ctx.send('?????????????????? ?? ???????????? ???????? ?????????????? ?????????????????? :ok_hand:')

    @leaver.group(name='embed', invoke_without_command=True)
    async def embed(self, ctx: commands.Context):
        '''???????????????????? ?????????????? ?? ?????????????????? ?? ????????????'''
        await ctx.invoke(self.bot.get_command('help'), command='leaver embed')
    
    @embed.command(name='toggle')
    @commands.has_permissions(manage_guild=True)
    async def toggle_embed(self, ctx: commands.Context):
        '''????????????????/?????????????????? ???????????? ?? ?????????????????? ?? ????????????'''
        enabled = await leaver.is_embedded(ctx.guild, self.bot)

        if not enabled:
            await self.bot.db.query('INSERT INTO leaver_status VALUES ($1, false, true) ON CONFLICT(guild_id) DO UPDATE SET embedded = excluded.embedded', [ctx.guild.id])
            await ctx.send('???????????? ?? ?????????????????? ?????? ?????????????????? ?? ???????????? ???????? ?????????????? ???????????????? :ok_hand:')
        
        else:
            await self.bot.db.query('INSERT INTO leaver_status VALUES ($1, false, false) ON CONFLICT(guild_id) DO UPDATE SET embedded = excluded.embedded', [ctx.guild.id])
            await ctx.send('???????????? ?? ?????????????????? ?????? ?????????????????? ?? ???????????? ???????? ?????????????? ?????????????????? :ok_hand:')

    @leaver.command(name='message', aliases=['msg'])
    @commands.has_permissions(manage_guild=True)
    async def message(self, ctx: commands.Context, *, new_message = None):
        '''?????????????? ?????????????????? ?????? ?????????????????? ?? ????????????
        
        ???????? ???? ?????????????? ???????????????? `new_message`, ?????? ?????????????? ?????? ?????????????? ?????????????????? ?????? ?????????????????? ?? ????????????.'''
        if not new_message:
            message = await leaver.get_message(ctx.guild, self.bot)
            await ctx.send('?????????????? ?????????????????? ?????? ?????????????????? ?? ????????????:', embed = discord.Embed(description=message))
            
        else:
            if len(new_message) > 1650:
                return await ctx.send(f'????????. ?????????? ?????????????????? - **1650** ????????????????. ?????????????? ?????????????????? ???????? ?????????????????? ?????? ?????????????? ???? **{len(new_message)-1650}** ????????????????.')
            
            await self.bot.db.query('INSERT INTO leaver_message VALUES ($1, $2) ON CONFLICT(guild_id) DO UPDATE SET message = excluded.message', [ctx.guild.id, new_message])
            await ctx.send(f'?????????????????? ?? ???????????? ???????? ?????????????? ???????????????? :ok_hand:')

    @leaver.command(name='preview')
    @commands.has_permissions(manage_guild=True)
    async def preview(self, ctx: commands.Context):
        '''???????????????????????? ?????????????????? ?? ????????????'''
        if not await leaver.get_message(ctx.guild, self.bot):
            return await ctx.send(f':warning: ?????????????????? ?? ???????????? ???? ??????????????????????')

        await leaver.send_message(ctx.author, ctx.channel, self.bot)

        warning = []
        if not await leaver.is_enabled(ctx.guild, self.bot):
            warning.append(':warning: ?????????????????? ?? ???????????? ???? ????????????????, ???????????????? ?????? ?????????? `leaver toggle`')
        
        if not await leaver.get_channel(ctx.guild, self.bot, fetch=False):
            warning.append(':warning: ?????????? ?????? ?????????????????? ?? ???????????? **???? ????????????????????**, ???????????????????? ?????? ?????????? `leaver channel set <??????????>`')
        
        if warning:
            await ctx.send('\n'.join(warning))
        
    @leaver.group(name='channel', invoke_without_command=True)
    async def channel(self, ctx: commands.Context):
        '''?????????????????? ???????????? ?????? ?????????????????? ?? ????????????'''
        channel = await leaver.get_channel(ctx.guild, self.bot, fetch=False)
        if not channel:
            channel = '???? ??????????????????????'
        else:
            channel = f'<#{channel}>'
        
        await ctx.send(f'?????????????? ?????????? ?????? ?????????????????? ?? ????????????: **{channel}**\n\n'
                        '???? ???????????? ?????? ?????????????? ?? ?????????????? `leaver channel set <??????????>` ?????? ???????????? ?????? ?? ?????????????? `leaver channel reset`')

    @channel.command(name='reset', aliases=['remove'])
    @commands.has_permissions(manage_guild=True)
    async def reset_channel(self, ctx: commands.Context):
        '''???????????????? ?????????? ?????? ?????? ?????????????????? ?? ????????????'''
        deleted = await self.bot.db.query('DELETE FROM leaver_channel WHERE guild_id=$1 RETURNING *', [ctx.guild.id])
        if not deleted:
            return await ctx.send(':warning: ?????????? ?????? ?????? ?????????????????? ?? ???????????? ???? ????????????????????')
        
        await ctx.send('?????????? ?????? ?????? ?????????????????? ?? ???????????? ?????? ?????????????? ?????????????? :ok_hand:')
    
    @channel.command(name='set')
    @commands.has_permissions(manage_guild=True)
    async def set_channel(self, ctx: commands.Context, channel: discord.TextChannel):
        '''???????????????????? ?????????? ?????? ?????? ?????????????????? ?? ????????????'''
        perms = channel.permissions_for(ctx.guild.me)
        if not perms.send_messages or not perms.embed_links:
            return await ctx.send(f':warning: ???? ?????????????? ???????????????????? ?????????? ?????? ?????? ?????????????????? ?? ???????????? ???? **{channel.name}**: '
                                  f'?? ???????? ?????????????????????? ?????????????????? ??????????!\n'
                                  f'?????????????? ???????? ?????? ?????????????????? ?????????? ?? ???????????? ????????????:\n'
                                  f'??? ???????????????????? ??????????????????\n'
                                  f'??? ?????????????????????? ???????????? (????????????)')

        if await leaver.get_channel(ctx.guild, self.bot, fetch=False) == channel.id:
            return await ctx.send(f'?????????? ?????? ?????? ?????????????????? ?? ???????????? ?????? ???????????????????? ???? {channel.mention} :no_entry:')

        await self.bot.db.query('INSERT INTO leaver_channel VALUES ($1, $2) ON CONFLICT(guild_id) DO UPDATE SET channel_id = excluded.channel_id', [ctx.guild.id, channel.id])
        await ctx.send(f'?????????? ?????? ?????? ?????????????????? ?? ???????????? ?????? ?????????????? ???????????? ???? {channel.mention} :ok_hand:')

def setup(bot: Bot):
    bot.add_cog(Config(bot))