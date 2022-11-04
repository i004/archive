import discord
from discord.ext import commands

from typing import Union
import re

from urllib.parse import quote
from io import BytesIO


url = re.compile(
        r'^https?://'  # http:// or https://
        r'(?:(?:[A-Z0-9](?:[A-Z0-9-]{0,61}[A-Z0-9])?\.)+[A-Z]{2,6}\.?|'  # domain...
        r'\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3})' # ...or ip
        r'(?::\d+)?'  # optional port
        r'(?:/?|[/?]\S+)$', re.IGNORECASE)


class Fun(commands.Cog, name='Развлечения'):
    """Команды для развлечения."""
    
    def __init__(self, bot: commands.Bot):
        self.bot = bot

    def get_url(self, ctx, arg):
        if ctx.message.attachments:
            return str(ctx.message.attachments[0].url)
        elif type(arg) in (discord.User, discord.ClientUser, discord.Member):
            return str(arg.avatar_url_as(format='png'))
        elif type(arg) == str and url.search(arg):
            return arg        
        return str(ctx.author.avatar_url_as(format='png'))


    @commands.command(name='pet',
                      aliases=['pat'],
                      usage='[пользователь, вложение или ссылка на изображение]')
    async def pet(self, ctx: commands.Context, arg: Union[discord.User, str] = None):
        arg = self.get_url(ctx, arg)
        async with self.bot.session.get(f'https://pet.moonlydays.com/pet.php?remote={quote(arg)}') as resp:
            if resp.status == 400:
                return await ctx.send('Пожалуйста, укажите изображение с типом `PNG` или `JPEG`.')
            await ctx.channel.send(file=discord.File(
                fp=BytesIO(await resp.content.read()),
                filename=f'pet-{ctx.message.id}.gif'
            ))

    @commands.command(name='bonk',
                      usage='[пользователь, вложение или ссылка на изображение]')
    async def bonk(self, ctx: commands.Context, arg: Union[discord.User, str] = None):
        arg = self.get_url(ctx, arg)
        async with self.bot.session.get(f'https://bonk.moonlydays.com/bonk.php?remote={quote(arg)}') as resp:
            if resp.status == 400:
                return await ctx.send('Пожалуйста, укажите изображение с типом `PNG` или `JPEG`.')
            await ctx.channel.send(file=discord.File(
                fp=BytesIO(await resp.content.read()),
                filename=f'bonk-{ctx.message.id}.gif'
            ))


def setup(bot: commands.Bot):
    bot.add_cog(Fun(bot))
