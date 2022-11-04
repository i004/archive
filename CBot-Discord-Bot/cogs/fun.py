import discord

from random import Random
from discord.ext import commands
from string import ascii_letters
from googletrans import Translator

from cbot.main import CBot as Bot
from cbot.core.Converters import User
from cbot.services.Decorators import usage, example

class Fun(commands.Cog):
    """Команды для развлечения"""
    name = "Развлечения"
    def __init__(self, bot: Bot):
        self.bot = bot

    async def Request(self, url: str, api_url: str = 'some-random-api.ml') -> dict or list:
        async with self.bot.session.get(f'https://{api_url}{url if url.startswith("/") else "/" + url}') as resp:
            return await resp.json()

    @commands.command(name='dog')
    async def dog(self, ctx: commands.Context):
        data = await self.Request('/img/dog')
        await ctx.send(embed = discord.Embed(title=':dog:').set_image(url=data['link']))

    @commands.command(name='cat')
    async def cat(self, ctx: commands.Context):
        data = await self.Request('/img/cat')
        await ctx.send(embed = discord.Embed(title=':cat:').set_image(url=data['link']))

    @commands.command(name='panda')
    async def panda(self, ctx: commands.Context):
        data = await self.Request('/img/panda')
        await ctx.send(embed = discord.Embed(title=':panda_face:').set_image(url=data['link']))

    @commands.command(name='fox')
    async def fox(self, ctx: commands.Context):
        data = await self.Request('/img/fox')
        await ctx.send(embed = discord.Embed(title=':fox:').set_image(url=data['link']))

    @commands.command(name='bird')
    async def bird(self, ctx: commands.Context):
        data = await self.Request('/img/birb')
        await ctx.send(embed = discord.Embed(title=':bird:').set_image(url=data['link']))

    @commands.command(name='koala')
    async def koala(self, ctx: commands.Context):
        data = await self.Request('/img/koala')
        await ctx.send(embed = discord.Embed(title=':koala:').set_image(url=data['link']))

    @commands.command(name='wink')
    async def wink(self, ctx: commands.Context):
        data = await self.Request('/animu/wink')
        await ctx.send(embed = discord.Embed().set_image(url=data['link']))

    @commands.command(name='pat')
    async def pat(self, ctx: commands.Context, user: User):
        data = await self.Request('pat', 'nekos.life/api/v2/img')
        await ctx.send(embed = discord.Embed(title=ctx.l10n('reactions.pat', ctx.author.display_name, user.display_name)).set_image(url=data['url']))
    
    @commands.command(name='hug')
    async def hug(self, ctx: commands.Context, user: User):
        data = await self.Request('hug', 'nekos.life/api/v2/img')
        await ctx.send(embed = discord.Embed(title=ctx.l10n('reactions.hug', ctx.author.display_name, user.display_name)).set_image(url=data['url']))
    
    @commands.command(name='kiss')
    async def kiss(self, ctx: commands.Context, user: User):
        data = await self.Request('kiss', 'nekos.life/api/v2/img')
        await ctx.send(embed = discord.Embed(title=ctx.l10n('reactions.kiss', ctx.author.display_name, user.display_name)).set_image(url=data['url']))

def setup(bot: commands.Bot):
    bot.add_cog(Fun(bot))