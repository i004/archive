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
from pycountry import countries
from discord.ext import commands
from urllib.parse import quote, urlparse
from PIL import (Image, ImageFont, ImageDraw)
from googletrans import Translator, LANGUAGES, LANGCODES
from jishaku.codeblocks import codeblock_converter

from cbot.main import CBot as Bot
from cbot.services.Emojis import GetEmoji
from cogs.config.ideas import Config as Ideas
from cbot.services.Decorators import usage, example
from cbot.core.Converters import User, Arguments, Number
from cbot.services import GoogleSearchClient, GistClient, CurrencyConverter, Paginator, DiscordAPI, WolframAlphaClient

class Utils(commands.Cog):
    """Различные полезные утилиты которые сильно упростят вам жизнь"""
    name = "Утилиты"
    def __init__(self, bot: Bot):
        self.bot = bot
        self.wolfram = WolframAlphaClient('api-token')

    @staticmethod
    def parse_date(date):
        values = {
            's': 1,
            'm': 60,
            'h': 60*60,
            'd': 24*60*60
        }
        if date[-1] not in values or not date[:len(date)-1].isnumeric():
            return None
        return int(date[:len(date)-1])*values[date[-1]]

    @commands.command(name='calc')
    @usage('calc <математическое выражение>')
    @example('calc 2+2')
    @example('calc 2x+2y = 4 and 5y = sin(10)')
    async def calc(self, ctx: commands.Context, *, expr):
        '''Вычислить математическое выражение'''
        res = await self.wolfram.query(f'calculate {expr}')
        if not res.success:
            embed = discord.Embed()
            embed.set_author(name='Произошла непредвиденная ошибка при вычислении.')
            if res.tips:
                embed.add_field(name='Подсказка', value=Translator().translate(text=res.tips["tip"]["@text"], dest='ru').text)
            return await ctx.send(embed=embed)
        embed = discord.Embed()
        images = [x for x in res.pods if x.subpod.image and '|' in x.subpod.image.alt]
        if len(images) >= 1:
            embed.set_image(url=images[0].subpod.image.src)        
        if len(images) >= 2:
            embed.set_thumbnail(url=images[1].subpod.image.src)
        for pod in res.pods:
            title = pod.title or pod.subpod.title
            value = pod.subpod.plaintext or pod.subpod.image.alt
            if title == value:
                continue
            embed.add_field(name=title, value=value)
        await ctx.send(embed=embed)

    @commands.command(name='shorten', aliases=['short'])
    @usage('shorten <ссылка>')
    @example('shorten google.com')
    @example('shorten youtu.be')
    async def shorten(self, ctx: commands.Context, *, url):
        '''Сократить указанную ссылку'''
        if not url.startswith('http://') and not url.startswith('https://'):
            url = f'http://{url}'
        await ctx.message.add_reaction('<a:loading:744966192975839343>')
        async with self.bot.session.get(f'https://is.gd/create.php?format=simple&url={quote(url)}') as resp:
            link = await resp.text()
            if link == 'Error: Sorry, the URL you entered is on our internal blacklist. It may have been used abusively in the past, or it may link to another URL redirection service.':
                return await ctx.send(f'Извините, но данная ссылка находится в списке запрещённых ссылок.')
            try:
                await ctx.message.remove_reaction('<a:loading:744966192975839343>', ctx.guild.me)
            except:
                pass
            domain = urlparse(url).netloc.split('.')
            if len(domain) > 2:
                domain = domain[::-1][:-1][::-1]
            domain = '.'.join(domain)
            await ctx.send(f'{ctx.author.mention}, ваша сокращённая ссылка › {link}', embed=discord.Embed().set_footer(text=domain, icon_url=f'http://www.google.com/s2/favicons?domain={domain}'))

    @commands.command(name='translate', aliases=['tr', 'tl'])
    @usage('translate <язык> <текст>')
    @usage('translate ru Hello!')
    @usage('translate en Привет!')
    async def translate(self, ctx: commands.Context, dest, *, text):
        '''Переводчик'''
        if dest not in LANGUAGES:
            return await ctx.send(f'Неизвестный язык — {dest}',
                                  allowed_mentions=discord.AllowedMentions(users=None, roles=None, everyone=None))
        translator = Translator()
        data = translator.translate(text, dest=dest)
        extra = data.extra_data
        embed = discord.Embed(colour=discord.Colour(0x468af4),
                              title=f'{LANGUAGES[data.src].capitalize()} » {LANGUAGES[data.dest].capitalize()}',
                              description=data.text)
        embed.set_footer(text='Google Translate', icon_url='https://cdn.discordapp.com/emojis/739847694943649962.png?v=1')
        
        if extra['definitions']:
            embed.add_field(name='Определения', value='\n'.join(f'**{definition[0].capitalize()}**\n{definition[1][0][0].capitalize()}' for definition in extra['definitions'])[:1024])
        
        if extra['examples']:
            embed.add_field(name='Примеры', value='\n'.join('• ' + example[0].capitalize().replace('<b>', '**').replace('</b>', '**') for example in extra['examples'][0][:5])[:1024])

        await ctx.send(embed=embed)

    @commands.command(name='convert')
    @usage('convert <сумма> <из какой валюты> <в какую>')
    @example('convert 100 USD EUR')
    @example('convert 1k USD RUB')
    @example('convert 0.5k BTC RUB')
    async def convert(self, ctx: commands.Context, amount: Number, from_currency, to_currency):
        '''Конвертер валют'''
        converted = await CurrencyConverter.ConvertCurrency(amount, from_currency, to_currency)
        if type(converted) != float:
            return await ctx.send(f':warning: Указанные вами валюты не существуют')
        if amount > (1<<64-1):
            amount = None
        if converted > (1<<64-1):
            converted = None

        await ctx.send(f'**{("%.2f" % amount) if amount else "Infinity"} {from_currency.upper()}** » **{("%.2f" % converted) if converted else "Infinity"} {to_currency.upper()}**')

    @commands.command(name='idea', aliases=['suggest'])
    @usage('suggest <идея>')
    async def suggest(self, ctx: commands.Context, *, suggestion):
        '''Отправить идею в установленный канал для идей'''
        channel = await Ideas.get_idea_channel(ctx)
        if not channel:
            return await ctx.send(f'Канал для идей не установлен на этом сервере :no_entry:')
        msg = await channel.send(embed=discord.Embed(description=suggestion) \
                                              .set_author(name=str(ctx.author), icon_url=ctx.author.avatar_url))
        await msg.add_reaction(GetEmoji('+1'))
        await msg.add_reaction(GetEmoji('-1'))
        if channel.id != ctx.channel.id:
            await ctx.send(f'Я отправил идею в {channel.mention} :ok_hand:')

    @commands.command(name='vote', aliases=['poll'])
    @usage('vote <время опроса> <опрос> | <варианты разделённые через `|`*>')
    @example('vote 1h Какой пак эмодзи добавить? | Pepe | Blob')
    @example('vote 1d 12h 30m Кого принимаем на модератора? | {ctx.author} | {ctx.bot.user.name}')
    @commands.cooldown(1, 5, commands.BucketType.user)
    async def poll(self, ctx: commands.Context, *args):
        '''Запустить голосование
        
        Требуется указать время голосования; заголовок а также варианты (Разделять через `|`)
        Примеры:
        • `vote 30m Какой пак эмодзи лучше всех? | Pepe | Blob`
        • `vote 1d 12h Дать @user#001 админа? | Да | Нет

        :warning: Время должно быть от 5 секунд до 2 суток
        :warning: Макс. кол-во вариантов - 9
        '''
        if len(args) == 0:
            raise commands.UserInputError()
        parsed = [Utils.parse_date(x) for x in args]
        seconds = 0
        for v in parsed:
            if not v:
                break
            seconds += v
        variants = ' '.join(args[1:]).split(' | ')
        if len(variants) < 3 or seconds < 5 or seconds > 3600*24*2:
            raise commands.UserInputError()
        title = variants[0].replace('\n', ' ')
        variants = [x.replace('\n', ' ') for x in variants[1:]]
        if len(variants) > 9:
            raise commands.UserInputError()
        votes = {x: [] for x in variants}
        v_ = {i: variants[i] for i in range(len(variants))}
        def get_embed():
            embed = discord.Embed(title=title)
            embed.set_author(name=ctx.author.name, icon_url=ctx.author.avatar_url)
            total = sum([len(x) for x in votes.values()])
            embed.set_footer(text=f'Всего {total} голосов')
            embed.set_thumbnail(url='https://cdn.discordapp.com/emojis/748212184827428955.png?v=1')
            for vote_id, vote in enumerate(votes):
                percent = 0 if total == 0 else round((len(votes[vote])/total)*100)
                d = int(percent/10)
                embed.add_field(name=f'{vote_id+1}. {vote}',
                                value=f'{percent}% проголосовало ({len(votes[vote])} голосов)\n' +
                                      ("<:blankLineBlue:748458624434569277>"*d) +
                                      ("<:blankLine:748184889869992017>"*(10-d)),
                                inline=False)
            return embed
        msg = await ctx.send(embed=get_embed())
        emojis = [GetEmoji(x) for x in ['one', 'two', 'three', 'four', 'five', 'six', 'seven', 'eight', 'nine']]
        for i in range(len(variants)):
            await msg.add_reaction(emojis[i])
        async def listener_add():
            while True:
                try:
                    reaction, user = await self.bot.wait_for('reaction_add', check=lambda r,u: r.message.id == msg.id and str(r) in emojis and not u.bot)
                    if [x for x in votes.values() if user.id in x]:
                        continue
                    votes[v_[emojis.index(str(reaction))]].append(user.id)
                    await msg.edit(embed=get_embed())
                except:
                    pass
        async def listener_remove():
            while True:
                try:
                    reaction, user = await self.bot.wait_for('reaction_remove', check=lambda r,u: r.message.id == msg.id and str(r) in emojis and not u.bot)
                    if user.id not in votes[v_[emojis.index(str(reaction))]]:
                        continue
                    votes[v_[emojis.index(str(reaction))]].remove(user.id)
                    await msg.edit(embed=get_embed())
                except:
                    pass
        loop_1 = self.bot.loop.create_task(listener_add())
        loop_2 = self.bot.loop.create_task(listener_remove())
        await sleep(seconds)
        loop_1.cancel()
        loop_2.cancel()
        most_voted = sorted(votes, key=lambda x: len(votes[x]), reverse=True)[0]
        await ctx.send(embed=discord.Embed(description=f'**[Голосование закончилось]({msg.jump_url})**') \
                                    .set_author(name=f'{ctx.author.name}: {title}', icon_url=ctx.author.avatar_url) \
                                    .add_field(name=f'Большинство проголосовало за вариант', value=f'{most_voted}\n\n({len(votes[most_voted])} голосов)'))
        embed = get_embed()
        embed.set_author(name=f'{ctx.author.name} | Голосование закончилось', icon_url=ctx.author.avatar_url)
        await msg.edit(embed=embed)

    @commands.command(name='choose', aliases=['choice'])
    @usage('choose <варианты*>')
    async def choose(self, ctx: commands.Context, *variants: commands.clean_content):
        '''Выбрать случайный элемент из указанных вариантов
        
        :information_source: Вы можете указать несколько слов в варианте с помощью "" (`"Привет Мир"`)'''
        if len(variants) < 2:
            return await ctx.send(f'Пожалуйста, укажите как минимум два аргумента')
        await ctx.send(choice(variants), allowed_mentions=discord.AllowedMentions(everyone=False, users=False, roles=False))

    @commands.command(name='sandbox', aliases=['sb'])
    @usage('sandbox <язык программирования> <код>')
    @example('sandbox python print("Hello, World!")')
    @example('sandbox javascript console.log("Hello, World!")')
    async def sandbox(self, ctx: commands.Context, language = None, *, code: codeblock_converter = None):
        '''Выполнить код указанного языка программирования в песочнице'''
        languages = ['c', 'cpp', 'java', 'kotlin', 'scala', 'swift', 'csharp', 'go',
                     'haskell', 'erlang', 'perl', 'python', 'python3', 'ruby', 'bash',
                     'javascript', 'fsharp', 'd', 'clojure', 'elixir', 'rust']
        aliases = {
            'c++': 'cpp',
            'c#': 'csharp',
            'cs': 'csharp',
            'js': 'javascript',
            'py': 'python3',
            'py2': 'python',
            'python': 'python3',
            'python2': 'python',
            'rb': 'ruby',
            'fs': 'fsharp',
            'f#': 'fsharp'
        }
        if not language or not code:
            return await ctx.send(f'Укажите язык программирования и код, который вы хотите выполнить\nДоступные языки программирования:\n\n' + ', '.join(f'`{x}`' for x in languages))
        if language in aliases:
            language = aliases[language]
        if language not in languages:
            return await ctx.send(f'Указанный язык программирование не был найден или не поддерживается.\n'
                                  f'Доступные языки программирования:\n\n' + ', '.join(f'`{x}`' for x in languages))
        await ctx.message.add_reaction('<a:loading:744966192975839343>')
        async with self.bot.session.post(f'http://api.paiza.io:80/runners/create?source_code={quote(code.content)}&language={language}&api_key=guest&longpoll=true&longpoll_timeout=10&input={quote("<stdin>")}') as runner:
            sessionID = (await runner.json())['id']
            async with self.bot.session.get(f'http://api.paiza.io:80/runners/get_details?id={sessionID}&api_key=guest') as details:
                details = await details.json()
                try:
                    await ctx.message.remove_reaction('<a:loading:744966192975839343>', ctx.guild.me)
                except:
                    pass
                embed = discord.Embed()
                if (details['result'] or details['build_result']) == 'failure':
                    embed.title = 'Ошибка'
                    embed.color = 0xc0392b
                else:
                    embed.title = 'Выполнено'
                    embed.color = 0x229954
                out = (
                    (details['stderr'] or details['build_stderr'])
                    or (details['stdout'] or details['build_stdout'])
                    or '\u200b'
                )
                embed.description = f'```{language}\n{out[:1000]}\n```'
                emote = GetEmoji('put_litter_in_its_place')
                embed.set_footer(text=f'Вы можете удалить это сообщение нажав {emote} под ним')
                msg = await ctx.send(embed = embed)
                await msg.add_reaction(emote)
                try:
                    await self.bot.wait_for('reaction_add', check=lambda r, u: (
                            u.id == ctx.author.id
                            and r.message.id == msg.id
                            and str(r) == emote
                        ), timeout=60)
                except: # Timed out
                    try:
                        embed.set_footer(text='')
                        await msg.edit(embed = embed)
                        await msg.remove_reaction(emote, ctx.guild.me)
                    except: pass
                    return
                
                await msg.delete()

    @commands.command(name='snapshot', aliases=['ss', 'screenshot'])
    @usage('snapshot <сайт>')
    @example('snapshot google.com')
    @example('snapshot [https://youtube.com](https://www.youtube.com/watch?v=dQw4w9WgXcQ)')
    async def snapshot(self, ctx: commands.Context, *, url):
        '''Сделать скриншот сайта'''
        await ctx.message.add_reaction('<a:loading:744966192975839343>')
        async with self.bot.session.get(f'https://chromechain.herokuapp.com?url={quote(url)}') as resp:
            try:
                await ctx.message.remove_reaction('<a:loading:744966192975839343>', ctx.guild.me)
            except:
                pass
            if resp.status != 200:
                return await ctx.send(f':no_entry: Что-то пошло не так. (Код ответа: {resp.status})')
            data = BytesIO(await resp.content.read())
            emote = GetEmoji('put_litter_in_its_place')
            if not ctx.channel.nsfw:
                msg = await ctx.send(f':warning: • Данный канал не является NSFW-каналом, сообщение будет удалено через минуту\n'
                                     f'Нажмите на {emote}, чтобы удалить это сообщение',
                                        file = discord.File(fp=data, filename='screenshot.png', spoiler=True))
            else:
                msg = await ctx.send(f'Нажмите на {emote}, чтобы удалить это сообщение',
                                     file = discord.File(fp=data, filename='screenshot.png'))
            await msg.add_reaction(emote)
            try:
                await self.bot.wait_for('reaction_add', check=lambda r,u: r.message.id == msg.id and u.id == ctx.author.id and str(r) == emote, timeout=60)
            except:
                if ctx.channel.nsfw:
                    return await msg.remove_reaction(emote, ctx.guild.me) # Prevent message deletion on timeout if current channel is NSFW
            await msg.delete()

def setup(bot: commands.Bot):
    bot.add_cog(Utils(bot))
