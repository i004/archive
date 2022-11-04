import discord

from io import BytesIO
from typing import Union
from datetime import datetime
from discord.ext import commands
from PIL import (Image, ImageFont, ImageDraw, ImageFilter, ImageOps)

from cbot.main import CBot as Bot
from cbot.core.Converters import User

class Images(commands.Cog):
    """Команды для работы с картинками"""
    name = "Картинки"
    def __init__(self, bot: Bot):
        self.bot = bot
    
    def preview_color(self, rgb: tuple) -> BytesIO:
        img = Image.new('RGB', (100, 100))
        draw = ImageDraw.Draw(img)
        draw.rectangle(((0,0), (100,100)), fill=rgb)
        byte = BytesIO()
        img.save(byte, 'PNG')
        byte.seek(0)
        return byte
    
    def rgb_to_hsv(self, r, g, b):
        r, g, b = r/255.0, g/255.0, b/255.0
        mx = max(r, g, b)
        mn = min(r, g, b)
        df = mx-mn
        if mx == mn:
            h = 0
        elif mx == r:
            h = (60 * ((g-b)/df) + 360) % 360
        elif mx == g:
            h = (60 * ((b-r)/df) + 120) % 360
        elif mx == b:
            h = (60 * ((r-g)/df) + 240) % 360
        if mx == 0:
            s = 0
        else:
            s = (df/mx)*100
        v = mx*100
        return round(h, 2), round(s, 2), round(v, 2)

    @staticmethod
    def most_common_colour(img: Image.Image) -> tuple:
        img = img.resize((25, 25), Image.NEAREST)
        if img.mode == 'P':
            img.putalpha(0)
        colors = sorted(img.getcolors(img.size[0] * img.size[1]), key=lambda t: t[0])
        return colors[-1][1]

    @commands.command(name='color', aliases=['colour'])
    async def color(self, ctx: commands.Context, argument: Union[User, str] = None):
        '''Узнать цвет указанной картинки или получить предпросмотр указанного цвета
        
        Вы можете использовать картинку, упоминание/ID пользователя или HEX-цвет в качестве аргумента'''
        if not argument and len(ctx.message.attachments) == 0:
            return await ctx.invoke(self.bot.get_command('help'), command='color')
        
        
        if type(argument) == discord.User:
            url = str(argument.avatar_url_as(format='png'))
        
        elif len(ctx.message.attachments) > 0:
            url = str(ctx.message.attachments[0].url)
            if url.split('.')[-1] not in ('png', 'jpg', 'jpeg'):
                return await ctx.send(f'Указанный тип файла (`{url.split(".")[-1]}`) на данный момент не поддерживается.')

        elif argument:
            try:
                h = argument.lstrip('#')
                rgb = tuple(int(h[i:i+2], 16) for i in (0, 2, 4))
                embed = discord.Embed(color=discord.Colour(int(h, 16)))
                
                embed.add_field(name='HEX', value=f'#{h}')
                embed.add_field(name='RGB', value=f'{rgb}')
                embed.add_field(name='HSV', value=self.rgb_to_hsv(*rgb))
                embed.set_thumbnail(url='attachment://preview.png')

                return await ctx.send(embed = embed, file = discord.File(fp=self.preview_color(rgb), filename='preview.png'))
            except:
                return await ctx.invoke(self.bot.get_command('help'), command='color')

        try:
            async with self.bot.session.get(url) as resp:
                content = await resp.content.read()
            img = Image.open(BytesIO(content)).resize((25, 25), Image.NEAREST)
        except:
            return await ctx.send(f'Произошла ошибка при открытии файла, повторите позже.')

        if img.mode == 'P':
            img.putalpha(0)
        colors = sorted(img.getcolors(img.size[0] * img.size[1]), key=lambda t: t[0])
        rgba_color = colors[-1][1]
        rgb_color = rgba_color[:3]
        hex_color = '%02x%02x%02x' % rgb_color
        embed = discord.Embed(color=discord.Colour(int(hex_color, 16)))

        if type(argument) == discord.User:
            embed.set_author(name=str(argument), icon_url=argument.avatar_url)
        
        embed.add_field(name='HEX', value=f'#{hex_color}')
        embed.add_field(name='RGB', value=f'{rgb_color}')
        embed.add_field(name='HSV', value=self.rgb_to_hsv(*rgb_color))
        embed.set_thumbnail(url='attachment://preview.png')

        await ctx.send(embed = embed, file = discord.File(fp=self.preview_color(rgb_color), filename='preview.png'))

    @commands.command(name='invert')
    async def invert(self, ctx: commands.Context, user: User = None):
        '''Инвертировать картинку или аватарку пользователя'''
        if ctx.message.attachments:
            content = await ctx.message.attachments[0].read()
        else:
            content = await (user or ctx.author).avatar_url_as(format="png").read()
        
        img = ImageOps.invert(Image.open(BytesIO(content)).convert("RGB"))
        byte = BytesIO()
        img.save(byte, "PNG")
        byte.seek(0)
        await ctx.send(file=discord.File(fp=byte, filename="invert.png"))

    @commands.command(name='flip')
    async def flip(self, ctx: commands.Context, user: User = None):
        '''Перевернуть картинку вверх ногами'''
        if ctx.message.attachments:
            content = await ctx.message.attachments[0].read()
        else:
            content = await (user or ctx.author).avatar_url_as(format="png").read()
        
        img = ImageOps.flip(Image.open(BytesIO(content)).convert("RGB"))
        byte = BytesIO()
        img.save(byte, "PNG")
        byte.seek(0)
        await ctx.send(file=discord.File(fp=byte, filename="flip.png"))

    @commands.command(name='mirror')
    async def mirror(self, ctx: commands.Context, user: User = None):
        '''"Отзеркалить" картинку'''
        if ctx.message.attachments:
            content = await ctx.message.attachments[0].read()
        else:
            content = await (user or ctx.author).avatar_url_as(format="png").read()

        img = ImageOps.mirror(Image.open(BytesIO(content)).convert("RGB"))
        byte = BytesIO()
        img.save(byte, "PNG")
        byte.seek(0)
        await ctx.send(file=discord.File(fp=byte, filename="mirror.png"))

    @commands.command(name='grayscale', aliases=['greyscale'])
    async def grayscale(self, ctx: commands.Context, user: User = None):
        '''Сделать картинку чёрно-белой'''
        if ctx.message.attachments:
            content = await ctx.message.attachments[0].read()
        else:
            content = await (user or ctx.author).avatar_url_as(format="png").read()

        img = ImageOps.grayscale(Image.open(BytesIO(content)).convert("RGB"))
        byte = BytesIO()
        img.save(byte, "PNG")
        byte.seek(0)
        await ctx.send(file=discord.File(fp=byte, filename="grayscale.png"))

def setup(bot: commands.Bot):
    bot.add_cog(Images(bot))