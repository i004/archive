import sys
import psutil
import discord
import platform
import humanize
import datetime as dt

from re import match
from asyncio import sleep
from random import shuffle
from datetime import datetime
from discord.ext import commands
from humanize import precisedelta
from time import time as timestamp

from cbot.main import CBot as Bot
from cogs.tools.general import Utils
from cbot.core.Converters import User
from cbot.services.Checks import closed_beta
from cbot.services.Emojis import GetEmoji
from cbot.services import Paginator, HelpCommand

class Giveaways(commands.Cog):
    def __init__(self, bot: Bot):
        self.bot = bot
        if hasattr(self.bot, 'giveaway_tasks'):
            [x.cancel() for x in self.bot.giveaway_tasks.values()]
        self.bot.giveaway_tasks = {}
        self.lock = []
        self.bot.loop.create_task(self.initialize())

    def format_delta(self, delta):
        return str(dt.timedelta(seconds=delta)).split('.')[0]

    async def giveaway_task(self, giveaway):
        giveaway = dict(giveaway)
        await sleep(giveaway['ends_at'] - timestamp())
        await self.bot.db.query('DELETE FROM giveaways WHERE giveaway_id=$1', [giveaway['giveaway_id']])
        del self.bot.giveaway_tasks[f'{giveaway["guild_id"]}_{giveaway["giveaway_id"]}']
        channel = await self.bot.fetch_channel(giveaway['channel_id'])
        message = await channel.fetch_message(giveaway['message_id'])
        reaction = [x for x in message.reactions if str(x.emoji) == GetEmoji('tada')][0]
        winners = [x for x in await reaction.users().flatten() if not x.bot]
        shuffle(winners)
        winners = winners[:giveaway['winners']]
        embed = message.embeds[0]

        server_locale = ((await self.bot.db.query('SELECT * FROM locales WHERE id=$1', [channel.guild.id])) or {"locale": "ru"})['locale']
        l10n = lambda *args, **kwargs: self.bot.localizator.get_locale(server_locale).format(*args, **kwargs)

        if len(winners) == 0:
            await channel.send(f'<{message.jump_url}>\n' +
                               l10n('giveaway.noone_entered'))
            embed.timestamp = discord.Embed.Empty
            embed.set_footer(text=l10n('giveaway.ended'))
            embed.description = f'{l10n("giveaway.noone_entered")}\n\n{embed.description}'
            await message.edit(embed=embed)
        else:
            await channel.send(l10n("giveaway.winned", ' '.join(x.mention for x in winners), giveaway['text']))
            embed.timestamp = discord.Embed.Empty
            embed.set_footer(text=l10n('giveaway.ended'))
            embed.description = f'**{l10n("giveaway.winners")}:** {" ".join([x.mention for x in winners])}\n\n{embed.description}'
            await message.edit(embed=embed)

    async def initialize(self):
        for giveaway in await self.bot.db.query('SELECT * FROM giveaways', return_list=False):
            self.bot.giveaway_tasks[f'{giveaway["guild_id"]}_{giveaway["giveaway_id"]}'] = self.bot.loop.create_task(self.giveaway_task(giveaway))

    @commands.group(name='gstart', aliases=['gsetup', 'gcreate'])
    @commands.has_permissions(manage_roles=True)
    async def gstart(self, ctx: commands.Context):
        async def setup():
            await ctx.send(ctx.l10n('giveaway.setup.channel'))
            channel = None
            while not channel:
                try:
                    msg = await self.bot.wait_for('message', check=lambda m: m.author.id == ctx.author.id and m.channel.id == ctx.channel.id, timeout=60)
                except:
                    return await ctx.send(f'Timed out')
                if msg.content == 'cancel':
                    return await ctx.send(f'Cancelled')
                
                if msg.channel_mentions:
                    chn          = msg.channel_mentions[0]
                    author_perms = chn.permissions_for(ctx.author)
                    bot_perms    = chn.permissions_for(ctx.guild.me)
                    if not author_perms.send_messages or not author_perms.read_messages:
                        await ctx.send(ctx.l10n('giveaway.setup.user_missing_perms'))
                    elif not bot_perms.send_messages or not bot_perms.read_messages or not bot_perms.add_reactions:
                        await ctx.send(ctx.l10n('giveaway.setup.bot_missing_perms'))
                    else:
                        channel = chn

            await ctx.send(ctx.l10n('giveaway.setup.winners'))
            winners = None
            while not winners:
                try:
                    msg = await self.bot.wait_for('message', check=lambda m: m.author.id == ctx.author.id and m.channel.id == ctx.channel.id, timeout=60)
                except:
                    return await ctx.send(f'Timed out')
                if msg.content == 'cancel':
                    return await ctx.send(f'Cancelled')
                
                if msg.content.isnumeric():
                    w = int(msg.content)
                    if w not in range(1, 31):
                        await ctx.send(ctx.l10n('giveaway.setup.incorrect_winner_count'))
                    else:
                        winners = w
            
            await ctx.send(ctx.l10n('giveaway.setup.duration'))
            time = None
            while not time:
                try:
                    msg = await self.bot.wait_for('message', check=lambda m: m.author.id == ctx.author.id and m.channel.id == ctx.channel.id, timeout=60)
                except:
                    return await ctx.send(f'Timed out')
                if msg.content == 'cancel':
                    return await ctx.send(f'Cancelled')
                
                seconds = [Utils.parse_date(x) for x in msg.content.split()]
                if None not in seconds:
                    seconds = sum(seconds)
                    if seconds < 1 or seconds > 2*7*24*60*60:
                        await ctx.send(ctx.l10n('giveaway.setup.incorrect_duration'))
                    else:
                        time = seconds
            
            await ctx.send(ctx.l10n('giveaway.setup.text'))
            text = None
            while not text:
                try:
                    msg = await self.bot.wait_for('message', check=lambda m: m.author.id == ctx.author.id and m.channel.id == ctx.channel.id, timeout=120)
                except:
                    return await ctx.send(f'Тайм-аут.')
                
                if len(msg.content) > 250:
                    await ctx.send(ctx.l10n('giveaway.setup.message_is_too_big', len(msg.content)-250))
                else:
                    text = msg.content

            server_locale = ((await self.bot.db.query('SELECT * FROM locales WHERE id=$1', [channel.guild.id])) or {"locale": "ru"})['locale']
            l10n = lambda *args, **kwargs: self.bot.localizator.get_locale(server_locale).format(*args, **kwargs)

            embed = discord.Embed(title=text, description=f'**{l10n("giveaway.hoster")}** » {ctx.author.mention}\n'
                                                          f'**{l10n("giveaway.winners")}** » {winners}\n\n'
                                                          f'{l10n("giveaway.how_to_enter")}')
            embed.set_footer(text=l10n('giveaway.ends'))
            embed.timestamp = datetime.utcfromtimestamp(timestamp()+seconds)
            giveaway_id = (await ctx.Counter(f'giveaways_{ctx.guild.id}').add(1))['value']
            ends_at = datetime.utcfromtimestamp(timestamp()+seconds)
            embed.timestamp = ends_at
            embed.title += f' ({l10n("giveaway.giveaway_id", giveaway_id)})'
            msg = await channel.send(embed=embed)
            await msg.add_reaction(GetEmoji('tada'))
            giveaway = await self.bot.db.query('INSERT INTO giveaways VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING *', [channel.id, msg.id, giveaway_id, winners, text, ends_at.timestamp(), ctx.guild.id])
            self.bot.giveaway_tasks[f'{ctx.guild.id}_{giveaway_id}'] = self.bot.loop.create_task(self.giveaway_task(giveaway))
            await ctx.send(ctx.l10n('giveaway.started', channel.mention, giveaway_id))

        if f'{ctx.channel.id}->{ctx.author.id}' in self.lock:
            return
        self.lock.append(f'{ctx.channel.id}->{ctx.author.id}')
        try:
            await setup()
        finally:
            self.lock.remove(f'{ctx.channel.id}->{ctx.author.id}')
        
    @commands.command(name='gend', aliases=['gcancel', 'gstop'])
    @commands.has_permissions(manage_roles=True)
    async def gend(self, ctx: commands.Context, ID: int):
        if f'{ctx.guild.id}_{ID}' not in self.bot.giveaway_tasks:
            return await ctx.send(ctx.l10n('giveaway.unknown_giveaway'))
        giveaway = await self.bot.db.query(f'UPDATE giveaways SET ends_at = 0 WHERE giveaway_id=$1 AND guild_id=$2 RETURNING *', [ID, ctx.guild.id])
        self.bot.giveaway_tasks[f'{ctx.guild.id}_{ID}'].cancel()
        self.bot.giveaway_tasks[f'{ctx.guild.id}_{ID}'] = self.bot.loop.create_task(self.giveaway_task(giveaway))
        await ctx.message.add_reaction(GetEmoji('ok_hand'))

    @commands.command(name='glist', aliases=['giveaways'])
    async def glist(self, ctx: commands.Context):
        giveaways = await self.bot.db.query('SELECT * FROM giveaways WHERE guild_id=$1', [ctx.guild.id], return_list=False)
        if not giveaways:
            return await ctx.send(ctx.l10n('giveaway.list.none'))
        paginator = Paginator(self.bot, ctx.author)
        giveaways = [f'**#{giveaway["giveaway_id"]}:** {giveaway["text"]} ({self.format_delta(giveaway["ends_at"] - timestamp())})' for giveaway in giveaways]
        pages = ["\n".join(giveaways[i:i+5]) for i in range(0, len(giveaways), 5)]
        for page in pages:
            paginator.pages.append(f'**{ctx.l10n("giveaway.list.active_giveaways")}**\n\n{page}')
        await paginator.send_controller(ctx)

def setup(bot: commands.Bot):
    bot.add_cog(Giveaways(bot))