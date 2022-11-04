import discord

from io import BytesIO
from datetime import datetime
from discord.ext import commands
from PIL import (Image, ImageFont, ImageDraw)

from cbot.main import CBot as Bot
from cbot.core.Converters import User, Arguments
from cbot.services.Decorators import usage, example

class Images(commands.Cog):
    """Команды для работы с картинками"""
    name = "Картинки"
    def __init__(self, bot: Bot):
        self.bot = bot
    
    def get_font(self, size: int):
        return ImageFont.truetype("assets/Whitney.ttf", size=size)
    
    def prepare_mask(self, size, antialias = 2):
        mask = Image.new('L', (size[0] * antialias, size[1] * antialias), 0)
        ImageDraw.Draw(mask).ellipse((0, 0) + mask.size, fill=255)
        return mask.resize(size, Image.ANTIALIAS)

    def crop(self, im, s):
        w, h = im.size
        k = w / s[0] - h / s[1]
        if k > 0: im = im.crop(((w - h) / 2, 0, (w + h) / 2, h))
        elif k < 0: im = im.crop((0, (h - w) / 2, w, (h + w) / 2))
        return im.resize(s, Image.ANTIALIAS)
    
    @commands.command(name='discord')
    @usage('discord <пользователь> <сообщение>')
    @example('discord {ctx.author.name} Привет!')
    @example('discord {ctx.author.mention} Привет! --date "Сегодня, в 00:00"')
    async def discord(self, ctx, user: User, *args):
        '''Сгенерировать фейк. сообщение Discord\'a'''
        user = ctx.guild.get_member(user.id) or user
        args = Arguments(*args)
        message = args.get('text')
        if len(message.split('\n')) > 10:
            return ctx.send('Макс. кол-во переносов - 10')
        font = self.get_font(48)
        width = 750
        line = max(message.split('\n'), key=lambda x: len(x))

        if (size := font.getsize(line)[0]) > 750:
            width = 750 + size
        
        img = Image.new('RGBA', (width, 150+48*len(message.split('\n'))))
        draw = ImageDraw.Draw(img)
        draw.text((175, 5), user.display_name, font=font,
                                                fill=str(((user.color if user.color.value != 0 else None) if hasattr(user, 'color') else None) or '#fff'))
        draw.text((175, 65), message, font=font, fill='#fff')
        draw.text((190 + font.getsize(user.display_name)[0], 25), args.get('date', f'Сегодня в {datetime.now().strftime(r"%H:%M")}'), font=self.get_font(31), fill='#72767d')
        watermark = 'Made with CBot Discord Message Generator'
        smallfont = self.get_font(16)
        draw.text((img.size[0]-smallfont.getsize(watermark)[0], img.size[1]-18), watermark, font=smallfont, fill=(255,255,255,255))

        async with self.bot.session.get(str(user.avatar_url_as(format='png'))) as resp:
            content = await resp.content.read()
        avatar = Image.open(BytesIO(content)).convert('RGBA')
        avatar = self.crop(avatar, avatar.size)
        avatar.putalpha(self.prepare_mask(avatar.size, 4))
        avatar = avatar.resize((125,125), Image.ANTIALIAS).convert('RGBA')
        img.paste(avatar, (5,5))

        background = Image.new('RGB', (img.size[0]+30, img.size[1]+30))
        bg_draw = ImageDraw.Draw(background)
        bg_draw.rectangle(((0,0), background.size), fill=(54,57,63,255))
        background.paste(img, (15,15), img)

        byte = BytesIO()
        background.save(byte, 'PNG')
        byte.seek(0)
        await ctx.send(file=discord.File(fp=byte, filename='discord.png'))
    
def setup(bot: commands.Bot):
    bot.add_cog(Images(bot))