import discord

from io import BytesIO
from typing import Union
from datetime import datetime
from discord.ext import commands
from PIL import (Image, ImageFont, ImageDraw)

from cbot.main import CBot as Bot
from cbot.core.Converters import User
from cbot.services.Checks import is_in_guild

class Images(commands.Cog):
    """Команды для работы с картинками"""
    name = "Картинки"
    def __init__(self, bot: Bot):
        self.bot = bot
    
    @commands.command(name='dbots')
    @is_in_guild(110373943822540800)
    async def dbots(self, ctx: commands.Context):
        '''Generate banner for discord.bots.gg'''
        if len(ctx.message.attachments) == 0:
            return await ctx.send(f'Please attach a file :no_entry:')
        async with self.bot.session.get(ctx.message.attachments[0].url) as resp:
            content = await resp.content.read()
        img = Image.open(BytesIO(content)).convert('RGB').resize((1216, 684), Image.BILINEAR)
        overlay = Image.open('assets/dbots-overlay.png')
        img.paste(overlay, (0,0), overlay)
        byte = BytesIO()
        img.save(byte, 'PNG')
        byte.seek(0)
        await ctx.send(file=discord.File(fp=byte, filename='dbots.png'))

def setup(bot: commands.Bot):
    bot.add_cog(Images(bot))