import asyncio
import discord

from discord.ext import commands
from cbot.main import CBot as Bot
from cbot.services.Decorators import usage, example

class Config(commands.Cog):
    '''Конфигурация бота'''
    name = "Настройки"  
    def __init__(self, bot: Bot):
        self.bot = bot

    async def permissions_check(self, ctx: commands.Context, channel: discord.TextChannel):
        perms = channel.permissions_for(ctx.author)
        if not perms.send_messages or not perms.read_messages or not perms.manage_messages:
            emote = lambda perm: '<:ic_confirm:734497059872440400>' if getattr(perms, perm) else '<:ic_cancel:734497060014784644>'
            return await ctx.send(f'У вас отувствуют следующие права для управления авто-реакциями в указанном канале:\n'
                                  f'{emote("send_messages")} • Отправлять сообщения\n'
                                  f'{emote("read_messages")} • Читать сообщения\n'
                                  f'{emote("manage_messages")} • Управлять сообщениями\n')

    @commands.group(name='autoreact', aliases=['auto-react', 'auto_react'], invoke_without_command=True)
    @usage('autoreact list <канал>')
    @usage('autoreact clear <канал>')
    @usage('autoreact add <канал> <эмодзи>')
    @usage('autoreact remove <канал> <эмодзи>')
    async def autoreact(self, ctx: commands.Context):
        '''Авто-реакции: Реакции которые автоматически будут ставится на каждое сообщение в определённом канале'''
        await ctx.get_help()
    
    @autoreact.command(name='list')
    @usage('autoreact list <канал>')
    @example('autoreact list {ctx.channel.mention}')
    async def autoreact_list(self, ctx: commands.Context, channel: discord.TextChannel):
        '''Список авто-реакций в определённом канале'''
        if not (reacts := await self.bot.db.query('SELECT * FROM autoreact WHERE channel_id=$1', [channel.id], return_list=False)):
            return await ctx.send(f'В канале **{channel}** нету авто-реакций :no_entry:')
        
        await ctx.send(embed=discord.Embed(title=f'Авто-реакции в **{channel}**', description=', '.join([x['reaction'] for x in reacts])))

    @autoreact.command(name='clear')
    @usage('autoreact clear <канал>')
    @example('autoreact clear {ctx.channel.mention}')
    async def clear_autoreacts(self, ctx: commands.Context, channel: discord.TextChannel):
        '''Удалить все авто-реакции в определённом канале'''
        await self.permissions_check(ctx, channel)

        reacts = await self.bot.db.query('SELECT * FROM autoreact WHERE channel_id=$1', [channel.id], return_list=False)
        if not await ctx.confirm(f'Вы уверены, что хотите удалить все авто-реакции в **{channel}**? ({len(reacts)})', delete_on_confirm=False):
            return await ctx.send(f'Отменено')
        
        await self.bot.db.query('DELETE FROM autoreact WHERE channel_id=$1', [channel.id])
        await ctx.send(f'Удалено {len(reacts)} авто-реакций из канала **{channel}** :ok_hand:')
    
    @autoreact.command(name='add')
    @usage('autoreact add <канал> <эмодзи>')
    @example('autoreact add {ctx.channel.name} :+1:')
    @example('autoreact add {ctx.channel.mention} :-1:')
    async def add_autoreact(self, ctx: commands.Context, channel: discord.TextChannel, emote):
        '''Добавить авто-реакцию в определённый канал'''
        await self.permissions_check(ctx, channel)
        if not channel.permissions_for(ctx.guild.me).add_reactions or not channel.permissions_for(ctx.guild.me).read_messages:
            return await ctx.send(f'Мне нужно иметь право **Добавлять реакции** и **Читать сообщения** в указанном вами канале, чтобы авто-реакции нормально работали!')
        
        if len(await self.bot.db.query('SELECT * FROM autoreact WHERE channel_id=$1', [channel.id], return_list=False)) >= 10:
            return await ctx.send(f'Максимальное кол-во авто-реакций в 1 канале — **10**.')
        
        try:
            chn = await self.bot.fetch_channel(764955347663323176)
            msg = await chn.send('AUTO-REACT EMOJI CHECK')
            await msg.add_reaction(emote)
        except:
            return await ctx.send(f'Некорректное эмодзи :no_entry:')
        
        await self.bot.db.query('INSERT INTO autoreact VALUES ($1, $2)', [channel.id, emote])
        await ctx.send(f'Реакция {emote} была добавлена к авто-реакциям канала **{channel}** :ok_hand:')

    @autoreact.command(name='remove')
    @usage('autoreact remove <канал> <эмодзи>')
    @example('autoreact remove {ctx.channel.name} :+1:')
    @example('autoreact remove {ctx.channel.mention} :-1:')
    async def remove_autoreact(self, ctx: commands.Context, channel: discord.TextChannel, emote):
        '''Удалить авто-реакцию из определённого канала'''
        await self.permissions_check(ctx, channel)
        if not await self.bot.db.query('SELECT * FROM autoreact WHERE channel_id=$1 AND reaction=$2', [channel.id, emote]):
            return await ctx.send(f'Канал **{channel}** не имеет данной авто-реакции')
        
        await self.bot.db.query('DELETE * FROM autoreact WHERE channel_id=$1 AND reaction=$2', [channel.id, emote])
        await ctx.send(f'Авто-реакция {emote} была убрана из канала **{channel}**')
    
    @commands.Cog.listener()
    async def on_message(self, msg: discord.Message):
        if (reactions := await self.bot.db.query('SELECT * FROM autoreact WHERE channel_id=$1', [msg.channel.id], return_list=False)):
            for reaction in reactions:
                try:
                    await msg.add_reaction(reaction['reaction'])
                except:
                    await self.bot.db.query('DELETE FROM autoreact WHERE channel_id=$1 AND reaction=$2', [msg.channel.id, reaction['reaction']])
                await asyncio.sleep(0.5)

def setup(bot: Bot):
    bot.add_cog(Config(bot))