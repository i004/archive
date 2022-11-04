import discord

from discord.ext import commands
from time import time
from datetime import datetime
from humanize import naturaldate

from cbot.main import CBot as Bot
from cbot.core.Converters import User
from cbot.services import Paginator

class Moderation(commands.Cog):
    """Команды модерации"""
    name = "Модерация"
    def __init__(self, bot: Bot):
        self.bot = bot
        self.bot.config.disabled_commands.append('warn')
        self.bot.config.disabled_commands.append('warns')
        self.bot.config.disabled_commands.append('ban')
    
    @commands.command(name='warn')
    @commands.has_permissions(manage_messages=True)
    async def warn(self, ctx: commands.Context, user: User(guild_only=True), *, reason):
        if len(reason) > 250:
            return await ctx.send(ctx.l10n('warn.max_length'))
        user = ctx.guild.get_member(user.id)

        if user.top_role.position >= ctx.author.top_role.position:
            return await ctx.send(ctx.l10n('warn.errors.0'))
        if user.guild_permissions > ctx.author.guild_permissions:
            return await ctx.send(ctx.l10n('warn.errors.1'))

        await self.bot.db.query('INSERT INTO warns VALUES ($1, $2, $3, $4, $5)', [ctx.guild.id, user.id, ctx.author.id, reason, time()])
        warns = (await self.bot.db.query('SELECT * FROM warns WHERE user_id=$1 AND guild_id=$2', [user.id, ctx.guild.id], return_list=False)) or 0
        try:
            user_locale = ((await self.bot.db.query('SELECT * FROM locales WHERE id=$1', [user.id])) or {"locale": "ru"})['locale']
            l10n = lambda *args, **kwargs: self.bot.localizator.get_locale(user_locale).format(*args, **kwargs)
            await user.send(embed=discord.Embed() \
                                         .set_author(name=l10n('warn.you_have_been_warned', ctx.guild.name),
                                                     icon_url=ctx.guild.icon_url) \
                                         .add_field(name=l10n('warn.moderator'), value=str(ctx.author), inline=False) \
                                         .add_field(name=l10n('warn.reason'), value=reason, inline=False)
                                         .set_footer(text=l10n('warn.warn_id', len(warns))))
        except:
            pass
        await ctx.send(ctx.l10n('warn.successful', str(user), len(warns)))

    @commands.command(name='warns')
    async def warns(self, ctx: commands.Context, user: User(guild_only=True) = None):
        if not user:
            user = ctx.author
        warns = await self.bot.db.query('SELECT * FROM warns WHERE guild_id=$1 AND user_id=$2', [ctx.guild.id, user.id], return_list=False)
        if not warns:
            return await ctx.send(ctx.l10n('warns.none', str(user)))
        paginator = Paginator(self.bot, ctx.author)
        pages = [warns[i:i+3] for i in range(0,len(warns),3)]
        zero_padded = lambda num: (lambda s: s if len(s) >= 2 else f'0{s}')(f'{num}')

        for num, page in enumerate(pages):
            embed = discord.Embed()
            embed.set_author(name=ctx.l10n('warns.title', str(user)), icon_url=user.avatar_url)
            for warn in page:
                date = datetime.utcfromtimestamp(warn["warned_at"] or 0)
                embed.add_field(name=warn['reason'], value=f'**{ctx.l10n("warn.moderator")}:** {ctx.guild.get_member(warn["moderator_id"]) or "Unknown User"}\n'
                                                           f'**Выдан в:** {naturaldate(date).capitalize()}, {date.hour}:{zero_padded(date.minute)}:{zero_padded(date.second)} UTC', inline=False)
            embed.set_footer(text=f'Page {num+1}/{len(pages)} | {ctx.l10n("warns.total", len(warns))}')
            paginator.pages.append(embed)
            
        await paginator.send_controller(ctx)

    @commands.command(name='ban')
    @commands.has_permissions(ban_members=True)
    async def ban(self, ctx: commands.Context, user: User(guild_only=True), *, reason = None):
        '''Забанить пользователя'''
        user = ctx.guild.get_member(user.id)

        if user.top_role.position >= ctx.author.top_role.position:
            return await ctx.send(f'Вы не можете забанить этого пользоввателя, так как его роль является выше вашей.')
        if user.guild_permissions > ctx.author.guild_permissions:
            return await ctx.send(f'Вы не можете забанить этого пользователя, так как его права выше чем ваши')
        if user.top_role.position >= ctx.guild.me.top_role.position:
            return await ctx.send(f'Я не могу забанить этого пользователя, так как его роль выше моей!')
        if not ctx.guild.me.guild_permissions.ban_members:
            return await ctx.send(f'Я не могу забанить этого пользователя: У меня недостаточно прав!')
        
        try:
            await user.send(embed=discord.Embed() \
                                  .set_author(name=f'Вы были забанены на {ctx.guild.name}', icon_url=ctx.guild.icon_url) \
                                  .add_field(name='Модератор', value=str(ctx.author), inline=False) \
                                  .add_field(name='Причина', value=reason or 'Не установлена', inline=False))
        except:
            pass
        await user.ban(reason=f'[Забанен {ctx.author}] {reason or "Причина не установлена"}')
        await ctx.send(f'Пользователь **{user}** был забанен :ok_hand:')

    @commands.command(name='kick')
    @commands.has_permissions(kick_members=True)
    async def kick(self, ctx: commands.Context, user: User(guild_only=True), *, reason = None):
        '''Выгнать пользователя'''
        user = ctx.guild.get_member(user.id)

        if user.top_role.position >= ctx.author.top_role.position:
            return await ctx.send(f'Вы не можете выгнать этого пользователя, так как его роль является выше вашей.')
        if user.guild_permissions > ctx.author.guild_permissions:
            return await ctx.send(f'Вы не можете выгнать этого пользователя, так как его права выше чем ваши')
        if user.top_role.position >= ctx.guild.me.top_role.position:
            return await ctx.send(f'Я не могу выгнать этого пользователя, так как его роль выше моей!')
        if not ctx.guild.me.guild_permissions.kick_members:
            return await ctx.send(f'Я не могу выгнать этого пользователя: У меня недостаточно прав!')
        
        try:
            await user.send(embed=discord.Embed() \
                                  .set_author(name=f'Вы были выгнаны с {ctx.guild.name}', icon_url=ctx.guild.icon_url) \
                                  .add_field(name='Модератор', value=str(ctx.author), inline=False) \
                                  .add_field(name='Причина', value=reason or 'Не установлена', inline=False))
        except:
            pass
        await user.kick(reason=f'[Выгнан {ctx.author}] {reason or "Причина не установлена"}')
        await ctx.send(f'Пользователь **{user}** был выгнан :ok_hand:')

def setup(bot: commands.Bot):
    bot.add_cog(Moderation(bot))