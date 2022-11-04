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
from urbandict import define

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
        self.owm = OWM('api-token')
        self.owm.config['language'] = 'ru'

    @commands.command(name='weather')
    @usage('weather <Город или страна>')
    @example('weather Россия')
    @example('weather Москва')
    async def weather(self, ctx: commands.Context, *, place):
        '''Получить погоду в указанном городе'''
        if not self.owm:
            return await ctx.send('Произошла ошибка при подключении к API, повторите запрос позже.')
        
        try:
            observation = self.owm.weather_manager().weather_at_place(place)
        except:
            return await ctx.send(':warning: Неизвестный город')
        
        weather = observation.weather
        embed = discord.Embed(title=f'Погода в {observation.location.country}, {observation.location.name}')
        icon_url = f'http://openweathermap.org/img/wn/{weather.weather_icon_name}@2x.png'
        embed.set_thumbnail(url=icon_url)

        temperature = weather.temperature(unit='celsius')
        embed.add_field(name='Температура',
                        value=f'**Температура:** {temperature["temp"]}°C\n'
                              f'**Ощущается как:** {temperature["feels_like"]}°C\n\n'
                              f'**Минимальная температура:** {temperature["temp_min"]}°C\n'
                              f'**Максимальная:** {temperature["temp_max"]}°C\n')

        wind = weather.wind()
        embed.add_field(name='Ветер',
                        value=f'**Скорость:** {wind["speed"]} км/ч\n'
                              f'**Направление:** {wind["deg"]}°')
        
        embed.set_footer(text=weather.detailed_status.capitalize(), icon_url=icon_url)

        await ctx.send(embed=embed)

    @commands.command(name='http')
    @usage('http <HTTP-код>')
    @example('http 200')
    @example('http 404')
    async def http(self, ctx: commands.Context, code):
        '''Информация про указанный HTTP-код'''
        categories = {
            'info': {
                'emoji': 'https://cdn.discordapp.com/emojis/732567856713170975.png?v=1',
                'name': 'Informational (информационные)',
                'color': 0x8d96a1
            },
            'ok': {
                'emoji': 'https://cdn.discordapp.com/emojis/732568000070418473.png?v=1',
                'name': 'Success (успешно)',
                'color': 0x43b581
            },
            'redirect': {
                'emoji': 'https://cdn.discordapp.com/emojis/732567956050935859.png?v=1',
                'name': 'Redirection (перенаправление)',
                'color': 0xfaa61a
            },
            'client_error': {
                'emoji': 'https://cdn.discordapp.com/emojis/732567911348043777.png?v=1',
                'name': 'Client Error (ошибка клиента)',
                'color': 0xf04747
            },
            'server_error': {
                'emoji': 'https://cdn.discordapp.com/emojis/732567911348043777.png?v=1',
                'name': 'Server Error (ошибка сервера): ',
                'color': 0xf04747
            },
        }
        codes = {}
        def add_codes(t, d):
            for k in d.split('\n'):
                l = k.lstrip()
                if not l:
                    print('!l')
                    continue
                code = l.split('—')[0]
                desc = '—'.join(l.split('—')[1:]).lstrip()
                if not desc or not code:
                    print('!d || !c')
                    continue
                codes[code.split()[0]] = {
                    "name": ' '.join(code.split()[1:]),
                    "type": t,
                    "desc": desc[0].upper() + desc[1:]
                }

        d = json.loads(io.open('data/http-codes.json', mode='r', encoding='utf-8').read())
        for k in list(d):
            add_codes(k, d[k])

        if code not in codes:
            return await ctx.send(f':warning: Указанный HTTP-код не был найден')
        
        data = codes[code]
        category = categories[data["type"]]
        await ctx.send('~~:warning: Указанный HTTP-код не был найден~~' if code == '404' else '',
                        embed=discord.Embed(title=f'{code} {data["name"]}', description=codes[code]['desc'], color=category["color"]) \
                                     .set_author(name=category["name"], icon_url=category["emoji"]))

    @commands.command(name='wikipedia', aliases=['wiki'])
    @commands.cooldown(1, 15, commands.BucketType.user)
    async def wikipedia(self, ctx: commands.Context, *query: str):
        '''Найти статью в Википедии
        
        **Параметры:**
        `--lang <язык>` - Установить язык, на котором будет происходить поиск'''
        query = Arguments(*query).arguments
        lang = query.get('lang', 'ru')
        if lang not in wiki.languages():
            await ctx.send(f':warning: Укзаанный язык не является доступным. Будет использован язык по-умолчанию (`ru`)')
            lang = 'ru'
        wiki.set_lang(lang)
        results = wiki.search(query.get('text'))
        if len(results) == 0:
            return await ctx.send(f':warning: Ничего не найдено')
        
        result = results[0]

        if len(results) > 1:
            results = results[:5]
            msg = await ctx.send(f'Найдено несколько ответов, выберите один из них нажав на соответствующею реакцию под этим сообщением.',
                            embed = discord.Embed(description='\n'.join(f'**{i+1}.** {results[i]}' for i in range(len(results)))) \
                                                .set_footer(text=f'Нажмите на {GetEmoji("x")}, чтобы закрыть это сообщение'))
            reactions = [GetEmoji(x) for x in ['one', 'two', 'three', 'four', 'five']][:len(results)] + ['❌']
            async def clear():
                for reaction in reactions:
                    try: await msg.remove_reaction(reaction, ctx.guild.me)
                    except: pass

            for reaction in reactions:
                await msg.add_reaction(reaction)            
            try:
                reaction = await self.bot.wait_for('reaction_add', check=lambda r, u: (r.message.id == msg.id
                                                                                       and u.id == ctx.author.id
                                                                                       and str(r) in reactions), timeout=120)
            except:
                return await clear()
            
            reaction = reaction[0]
            if str(reaction) == GetEmoji('x'):
                return await clear()

            result = results[reactions.index(str(reaction))]
            
        page = wiki.page(result)
        try: await msg.delete()
        except: pass
        paginator = Paginator(self.bot, ctx.author)
        summary = page.summary
        pages = [summary[i:i+750] for i in range(0,len(summary),750)]
        i = 0

        for page_summary in pages:
            embed = discord.Embed(title=page.title, url=page.url, description=page_summary)
            if len(page.images) > 0:
                embed.set_thumbnail(url=page.images[i % len(page.images)])
            embed.set_footer(text=f'Страница {i+1}/{len(pages)}')
            paginator.pages.append(embed)
            i += 1
        
        await paginator.send_controller(ctx.channel)

    @commands.command(name='google')
    @commands.cooldown(1, 5, commands.BucketType.user)
    async def google(self, ctx: commands.Context, *, query: str):
        '''Искайте что-то в Google, не выходя из Discord'''
        results = (await GoogleSearchClient(query).search(query, limit=5))
        if len(results) == 0:
            return await ctx.send('Мне не удалось ничего найти по вашему запросу :no_entry:')
        
        await ctx.send(embed=discord.Embed(description='\n\n'.join(f'**[{result.title or "<No title>"}]({result.link or "https://google.com"})**\n{result.description or "<No description>"}' for result in results)) \
                                    .set_author(name='Поиск Google', icon_url='https://cdn.discordapp.com/emojis/765894846346297405.png?v=1'))

    @commands.command(name='urban', aliases=['dictonary', 'dict'])
    async def urban(self, ctx: commands.Context, *, term):
        """Найти определение в Urban Dictonary"""
        definitions = define(term)
        if not definitions:
            return await ctx.send(f'Ничего не найдено')
        
        paginator = Paginator(self.bot, ctx.author)
        
        for i, definition in enumerate(definitions):
            paginator.pages.append(discord.Embed(title=definition['word']) \
                                          .add_field(name='Определение', value=definition['def']) \
                                          .add_field(name='Пример', value=definition['example']) \
                                          .set_footer(text=f'Страница {i+1}/{len(definitions)}'))

        await paginator.send_controller(ctx)

def setup(bot: commands.Bot):
    bot.add_cog(Utils(bot))
