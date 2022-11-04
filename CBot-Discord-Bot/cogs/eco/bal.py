import discord

from io import BytesIO
from discord.ext import commands
from PIL import (Image, ImageDraw, ImageFont)

from cbot.main import CBot as Bot
from cbot.core.Converters import User
from cbot.services.Images import rounded_rectangle
from cogs.eco.general import Economy as General
from cbot.services.Checks import closed_beta

class Economy(commands.Cog):
    '''Команды экономики'''
    name = 'Экономика'
    def __init__(self, bot: Bot):
        self.bot = bot
    
    def get_font(self, size: int, type_='Regular'):
        return ImageFont.truetype(f"assets/Exo2-{type_}.ttf", size=size)
    
    @commands.command(name='balance', aliases=['bal', 'money', 'coins', 'bank', 'profile', 'pf'])
    async def balance(self, ctx: commands.Context, user: User(guild_only=True) = None):
        '''Узнать чей-то баланс'''
        if not user:
            user = ctx.author
        user = ctx.guild.get_member(user.id)
        profile = await ctx.get_profile(user.id)
        emeralds = await self.bot.db.query('SELECT * FROM emeralds WHERE user_id=$1', [user.id])
        if not emeralds:
            emeralds = await self.bot.db.query('INSERT INTO emeralds VALUES ($1) RETURNING *', [user.id])

        await ctx.send(embed=discord.Embed() \
                                    .set_author(name=user.name, icon_url=user.avatar_url) \
                                    .add_field(name='Баланс', value=profile.balance) \
                                    .add_field(name='В банке', value=profile.bank) \
                                    .add_field(name='Репутация', value=profile.reputation) \
                                    .add_field(name='Изумрудов', value=emeralds['emeralds']))

def setup(bot: Bot):
    bot.add_cog(Economy(bot))