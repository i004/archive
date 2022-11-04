import io
import json
import discord
import wikipedia as wiki

from io import BytesIO
from typing import Union
from asyncio import sleep
from random import choice
from pyowm import OWM, owm
from datetime import datetime
from urllib.parse import quote
from discord.ext import commands
from PIL import (Image, ImageFont, ImageDraw)
from jishaku.codeblocks import codeblock_converter

from cbot.main import CBot as Bot
from cbot.services.Emojis import GetEmoji
from cogs.config.ideas import Config as Ideas
from cbot.services.Decorators import usage, example
from cbot.core.Converters import User, Arguments, Number
from cbot.services import GoogleSearchClient, GistClient, CurrencyConverter, Paginator, DiscordAPI

class Utils(commands.Cog):
    """Различные полезные утилиты которые сильно упростят вам жизнь"""
    name = "Утилиты"
    def __init__(self, bot: Bot):
        self.bot = bot
        if hasattr(self.bot, 'awaiting'):
            [x.cancel() for x in self.bot.awaiting]
        self.bot.awaiting = []
        self.bot.loop.create_task(self.load_listeners())
    
    async def load_listeners(self):
        for user in await self.bot.db.query('SELECT * FROM awaiting', return_list=False):
            self.bot.awaiting.append(self.bot.loop.create_task(self.user_listener(user['author_id'], user['user_id'], user['status'])))

    async def user_listener(self, author_id: int, user_id: int, status: str):
        def check(before, after: discord.Member):
            return (after.status.name != 'offline'
                    and ((after.desktop_status.name != 'offline' or after.web_status.name != 'offline') if status == 'desktop' else True)
                    and ((after.mobile_status.name != 'offline') if status == 'mobile' else True))
        
        await self.bot.wait_for('member_update', check=lambda before, after: after.id == user_id and check(before, after))
        text = f'<:status_online:732568000070418473> **{self.bot.get_user(user_id)}** в сети'
        if status == 'desktop':
            text += ' с компьютера :desktop:'
        if status == 'mobile':
            text += ' с телефона <:status_mobile:745242527627608084>'
        await self.bot.get_user(author_id).send(text)
        await self.bot.db.query('DELETE FROM awaiting WHERE author_id=$1 AND user_id=$2 ANd status=$3', [author_id, user_id, status])

    @commands.command(name='await')
    @usage('await <пользователь> [устройство: desktop/mobile]')
    @example('await {ctx.author.name}')
    @example('await {ctx.author.id} desktop')
    @example('await {ctx.author.mention} mobile')
    async def await_user(self, ctx: commands.Context, user: User, status=None):
        '''Упоминает вас когда пользователь входит в сеть
        
        `await <user> desktop` - Упоминает вас когда пользователь входит в сеть с компьютера
        `await <user> mobile` - Упоминает вас когда пользователь входит в сеть с телефона'''

        if status and status not in ('desktop', 'mobile'):
            return await ctx.send(f'Доступные типы статуса - `desktop`, `mobile` :no_entry:')

        user = ctx.guild.get_member(user.id)
        if not user:
            return await ctx.invoke(self.bot.get_command('help'), command='await')

        if user.id == ctx.author.id:
            raise commands.CommandError(f'{ctx.author.id} нашёл баг!')

        if user.status.name != 'offline' and not status:
            return await ctx.send(f':warning: **{user}** уже в сети')
        if (user.desktop_status.name != 'offline' or user.web_status.name != 'offline') and status == 'desktop':
            return await ctx.send(f':warning: **{user}** уже в сети с компьютера')
        if user.mobile_status.name != 'offline' and status == 'mobile':
            return await ctx.send(f':warning: **{user}** уже в сети с телефона')
        
        action = 'зайдёт в сеть'
        if status == 'desktop':
            action += ' с компьютера :desktop:'
        if status == 'mobile':
            action += ' с телефона <:status_mobile:745242527627608084>'

        try:
            await self.bot.db.query('INSERT INTO awaiting VALUES ($1, $2, $3)', [ctx.author.id, user.id, status or 'any'])
        except:
            return await ctx.send(f'Вы уже ожидаете, пока **{user}** {action} :no_entry:')
        
        await ctx.send(f'Вы будете уведомлены, когда **{user}** {action} :ok_hand:')
        self.bot.awaiting.append(self.bot.loop.create_task(self.user_listener(ctx.author.id, user.id, status or 'any')))
    

def setup(bot: commands.Bot):
    bot.add_cog(Utils(bot))