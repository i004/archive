import io
import json
import discord
import wikipedia as wiki

from io import BytesIO
from typing import Union
from asyncio import sleep
from random import choice
from pyowm import OWM, owm
from cbot.main import CBot as Bot
from bs4 import BeautifulSoup
from datetime import datetime
from urllib.parse import quote
from discord.ext import commands
from PIL import (Image, ImageFont, ImageDraw)
from jishaku.codeblocks import codeblock_converter

from cbot.services.Emojis import GetEmoji
from cogs.config.ideas import Config as Ideas
from cbot.core.Converters import User, Arguments, Number
from cbot.services import GoogleSearchClient, GistClient, CurrencyConverter, Paginator, DiscordAPI

class Utils(commands.Cog):
    """Различные полезные утилиты которые сильно упростят вам жизнь"""
    name = "Утилиты"
    def __init__(self, bot: Bot):
        self.bot = bot
        self.bot.loop.create_task(self.initalize())

    async def initalize(self):
        await self.bot.wait_until_ready()
        await sleep(2.5)
        async with self.bot.session.get('https://www.minecraftcrafting.info/') as resp:
            html = await resp.text()
            soup = BeautifulSoup(html, 'html.parser')
            self.recipes = []
            def add_recipes(raw):
                for recipe_raw in raw:
                    recipe = {}
                    td = recipe_raw.select('td')
                    recipe['name'] = td[0].text
                    recipe['ingredients'] = td[1].text
                    recipe['image'] = 'https://www.minecraftcrafting.info/' + str(td[2].select_one('img').attrs['src'])
                    recipe['description'] = td[3].text
                    self.recipes.append(recipe)

            tables = soup.select_one('table').select('table')
            for table in tables:
                add_recipes(table.select('tr')[1:])

    @commands.command(name='skin')
    async def skin(self, ctx: commands.Context, player):
        '''Получить скин игрока'''
        await ctx.send(embed=discord.Embed() \
                                    .set_author(name=f'Скин {player}', icon_url=f'https://mc-heads.net/avatar/{player}/600') \
                                    .set_image(url=f'https://mc-heads.net/body/{player}/600'))

    @commands.command(name='mcplayer')
    async def mcplayer(self, ctx: commands.Context, player):
        '''Получить историю никнеймов игрока в Minecraft'''
        async with self.bot.session.get(f'https://mc-heads.net/json/get_user?search&u={player}') as resp:
            data = await resp.json()
            if not data.get('username'):
                return await ctx.send(f'Неверное имя пользователя или UUID')
            embed = discord.Embed()
            embed.set_author(name=f'История никнеймов {data["username"]}', icon_url=f'https://mc-heads.net/avatar/{player}/600')
            embed.set_thumbnail(url=f'https://mc-heads.net/head/{player}/600')
            data['previous_usernames'][0]['name'] += ' [Текущий]'
            for username in data['previous_usernames']:
                embed.add_field(name=username['name'], value=(datetime.utcfromtimestamp(username['changedToAt']/1000).strftime(r'%d.%m.%Y %H:%M:%S') if username.get('changedToAt') else 'Неизвестно'))
            embed.set_footer(text=f'Всего {data["previous_usernames_count"]} никнейма(-ов)')
            
            await ctx.send(embed=embed)
    
    @commands.command(name='mcserver')
    async def mcserver(self, ctx: commands.Context, address):
        '''Получить информацию о Minecraft-сервере'''
        async with self.bot.session.get(f'https://api.mcsrvstat.us/2/{address}') as resp:
            data = await resp.json()
            if not data['online']:
                return await ctx.send(f'Не удалось узнать информацию о сервере: Не удалось установить подключение с сервером.')
            
            embed = discord.Embed(title=data.get('hostname') or data.get('ip') or address,
                                  description='\n'.join(data['motd']['clean']))
            embed.add_field(name='Игроки', value=f'{data["players"]["online"]}/{data["players"]["max"]}')
            embed.add_field(name='Версия', value=data['version'])
            embed.set_thumbnail(url=f'https://eu.mc-api.net/v3/server/favicon/{data.get("hostname") or address}')
            embed.add_field(name='Ядро', value=data.get('software') or 'Vanilla')
            embed.set_footer(text=f'{data.get("ip") or "127.0.0.1"}:{data.get("port") or 0}')

            await ctx.send(embed=embed)
    
    @commands.command(name='craft', aliases=['recipe'])
    async def craft(self, ctx: commands.Context, *, item):
        '''Получить рецепт крафта какого-то предмета в Minecraft'''
        if not hasattr(self, 'recipes'):
            return
        found = [x for x in self.recipes if item.lower() in x['name'].lower()]
        if not found:
            return await ctx.send(f'Неизвестный предмет')
        recipe = found[0]
        await ctx.send(embed=discord.Embed(title=recipe['name'], description=recipe['description']) \
                                    .set_image(url=recipe['image']) \
                                    .add_field(name='Ингредиенты', value=recipe['ingredients']))

def setup(bot: commands.Bot):
    bot.add_cog(Utils(bot))