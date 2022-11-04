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
from humanize import precisedelta
from time import time as timestamp
from PIL import (Image, ImageFont, ImageDraw)
from jishaku.codeblocks import codeblock_converter

from cbot.main import CBot as Bot
from cbot.services.Emojis import GetEmoji
from cogs.config.ideas import Config as Ideas
from cogs.tools.general import Utils as General
from cbot.services.Decorators import usage, example
from cbot.core.Converters import User, Arguments, Number
from cbot.services import GoogleSearchClient, GistClient, CurrencyConverter, Paginator, DiscordAPI

class Utils(commands.Cog):
    """Различные полезные утилиты которые сильно упростят вам жизнь"""
    name = "Утилиты"
    def __init__(self, bot: Bot):
        self.bot = bot
        if hasattr(self.bot, 'reminders'):
            try:
                [x.cancel() for x in self.bot.reminders.values()]
            except:
                pass
        self.bot.reminders = {}
        self.bot.loop.create_task(self.load_listeners())
    
    async def load_listeners(self):
        for reminder in await self.bot.db.query('SELECT * FROM reminders', return_list=False):
            self.bot.reminders[f'{reminder["user_id"]}_{reminder["id"]}'] = self.bot.loop.create_task(self.reminder_task(reminder))

    async def reminder_task(self, reminder):
        await sleep(reminder['ends_at'] - timestamp())
        await self.bot.db.query('DELETE FROM reminders WHERE user_id=$1 AND id=$2', [reminder['user_id'], reminder['id']])
        del self.bot.reminders[f'{reminder["user_id"]}_{reminder["id"]}']
        channel = await self.bot.fetch_channel(reminder['channel_id'])
        if not channel.guild.get_member(reminder['user_id']):
            await self.bot.get_user(reminder['user_id']).send(f'Вы просили меня напомнить о **{reminder["text"]}**')
        else:
            await channel.send(f'<@{reminder["user_id"]}>, {precisedelta(reminder["ends_at"] - reminder["created_at"]).replace("and", "").replace(",", "")} назад: **{reminder["text"]}**')

    @commands.command(name='remind')
    @usage('remind <время> <напоминание>')
    @example('remind 1h 30m Сделать ДЗ')
    @example('remind 1d Исправить ошибку в коде')
    async def remind(self, ctx: commands.Context, *, text: commands.clean_content):
        '''Создать напоминание'''
        seconds = 0
        for i, arg in enumerate(text.split()):
            parsed = General.parse_date(arg)
            if not parsed:
                text = ' '.join(text.split()[i:])
                break
            seconds += parsed
        
        if seconds < 10:
            return await ctx.send(f'Минимальное время напоминания — 10 секунд')
        if seconds > 4*7*24*60*60:
            return await ctx.send(f'Максимальное время напоминания — 4 недели')
        
        reminder_id = (await ctx.Counter(f'reminders_{ctx.author.id}').add(1))['value']
        reminder = await self.bot.db.query('INSERT INTO reminders VALUES ($1, $2, $3, $4, $5, $6) RETURNING *', [reminder_id, ctx.author.id, ctx.channel.id, text, timestamp()+seconds, timestamp()])
        self.bot.reminders[f'{ctx.author.id}_{reminder_id}'] = self.bot.loop.create_task(self.reminder_task(reminder))
        await ctx.send(f'Я напомню вам о **{text}** через {precisedelta(seconds).replace("and", "").replace(",", "")} :ok_hand: (ID напоминания: **{reminder_id}**)')
    
    @commands.command(name='reminders')
    async def reminders(self, ctx: commands.Context):
        '''Список ваших напоминаний'''
        reminders = await self.bot.db.query('SELECT * FROM reminders WHERE user_id=$1', [ctx.author.id], return_list=False)
        if not reminders:
            return await ctx.send(f'У вас пока-что нету напоминаний.')
        paginator = Paginator(self.bot, ctx.author)
        reminders = [f'**#{reminder["id"]}:** {reminder["text"]} (через {precisedelta(reminder["ends_at"] - timestamp()).replace("and", "").replace(",", "")})' for reminder in reminders]
        pages = ["\n".join(reminders[i:i+5]) for i in range(0, len(reminders), 5)]
        for page in pages:
            paginator.pages.append(f'**Список ваших напоминаний:**\n\n{page}')
        await paginator.send_controller(ctx)
    
    @commands.command(name='unremind')
    @usage('unremind <ID напоминания>')
    async def unremind(self, ctx: commands.Context, ID: int):
        '''Отменить напоминание'''
        id_ = f'{ctx.author.id}_{ID}'
        if id_ not in self.bot.reminders:
            return await ctx.send(f'Неизвестное напоминание')
        self.bot.reminders[id_].cancel()
        del self.bot.reminders[id_]
        await self.bot.db.query('DELETE FROM reminders WHERE user_id=$1 AND id=$2', [ctx.author.id, ID])
        await ctx.send(f'Напоминание **#{ID}** было удалено :ok_hand:')

def setup(bot: commands.Bot):
    bot.add_cog(Utils(bot))