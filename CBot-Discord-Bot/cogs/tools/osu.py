import io
import json
import discord
import pycountry
import wikipedia as wiki

from io import BytesIO
from typing import Union
from asyncio import sleep
from random import choice
from pyowm import OWM, owm
from bs4 import BeautifulSoup
from datetime import datetime
from urllib.parse import quote
from discord.ext import commands
from humanize import naturaldelta
from PIL import (Image, ImageFont, ImageDraw)

from cbot.main import CBot as Bot
from cbot.services.Emojis import GetEmoji
from cogs.config.ideas import Config as Ideas
from jishaku.codeblocks import codeblock_converter
from cbot.core.Converters import User, Arguments, Number
from cbot.services import GoogleSearchClient, GistClient, CurrencyConverter, Paginator, DiscordAPI

class Utils(commands.Cog):
    """Различные полезные утилиты которые сильно упростят вам жизнь"""
    name = "Утилиты"
    def __init__(self, bot: Bot):
        self.bot = bot
    
    def buildUri(self, endpoint: str, args: str) -> str:
        return f'https://osu.ppy.sh/api/{endpoint}?k=api_token&{args}'

    @commands.command(name='osu!', aliases=['osu'])
    async def osu(self, ctx: commands.Context, user):
        '''Получить информацию про игрока osu!'''
        async with self.bot.session.get(self.buildUri('get_user', f'u={user}')) as res:
            user = await res.json()
            if len(user) == 0:
                raise commands.CommandError(f'{ctx.author.id} нашёл баг!')

                return await ctx.send(f':warning: Неизвестный игрок')
            user = user[0]
            embed = discord.Embed()
            embed.set_author(name=user['username'], icon_url=f'https://a.ppy.sh/{user["user_id"]}', url=f'https://osu.ppy.sh/u/{user["user_id"]}')
            embed.set_thumbnail(url=f'https://a.ppy.sh/{user["user_id"]}')
            embed.add_field(name='Аккуратность', value=str(round(float(user['accuracy']), 2)) + '%')
            embed.add_field(name='Performance Points', value=user['pp_raw'])
            embed.add_field(name='Игр сыграно', value=user['playcount'])
            embed.add_field(name='Ранг (страны)', value=user['pp_country_rank'])
            embed.add_field(name='Ранг (глобальный)', value=user['pp_rank'])
            embed.add_field(name='Страна', value=f':flag_{user["country"].lower()}: {pycountry.countries.get(alpha_2=user["country"]).name}')
            embed.add_field(name='Уровень', value=user['level'])
            embed.add_field(name='Всего времени сыграно', value=naturaldelta(int(user['total_seconds_played'])))
            embed.add_field(name='Присоеденился к osu!', value=user['join_date'])
            
            await ctx.send(embed=embed)

def setup(bot: commands.Bot):
    bot.add_cog(Utils(bot))
