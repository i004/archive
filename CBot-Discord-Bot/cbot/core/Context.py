from discord.ext import commands
from hashlib import md5
import discord

class Counter:
    def __init__(self, bot: commands.Bot, counter_id):
        self.bot = bot
        self.id  = counter_id
    
    async def get(self):
        res = await self.bot.db.query('SELECT value FROM counters WHERE id=$1', [self.id])
        if not res:
            res = await self.set(0)
        return res['value']
    
    async def set(self, value):
        return await self.bot.db.query('INSERT INTO counters VALUES ($1, $2) ON CONFLICT(id) DO UPDATE SET value = EXCLUDED.value RETURNING *', [self.id, value])

    async def add(self, amount = 1):
        return await self.set((await self.get()) + amount)

    async def remove(self, amount = 1):
        return await self.set((await self.get()) + amount)

    async def multiply(self, amount = 1):
        return await self.set((await self.get()) * amount)

    async def divide(self, amount = 1):
        return await self.set((await self.get()) / amount)

class Context(commands.Context):
    locale = 'ru'

    def i18n(self, key, *args, **kwargs):
        return self.bot.localizator.get_locale(self.locale).format(key, *args, **kwargs)
    l10n = i18n
    _    = i18n

    def Counter(self, counter_id):
        return Counter(self.bot, counter_id)
    
    async def get_profile(self, user_id=None, guild_id=None):
        return await self.bot.db.fetch_profile(guild_id or self.guild.id, user_id or self.author.id)

    @property
    def display(self):
        return f'{self.author.name}#{self.author.discriminator}'
    
    @property
    def cache(self):
        if self.command.qualified_name not in self.bot.cache:
            self.bot.cache[self.command.qualified_name] = {}
        return self.bot.cache[self.command.qualified_name]
    
    def clear_cache(self):
        if self.command.qualified_name not in self.bot.cache:
            return
        self.bot.cache[self.command.qualified_name] = {}

    async def confirm(self, *args, **kwargs):
        delete_on_confirm = kwargs.pop('delete_on_confirm')
        msg = await self.send(*args, **kwargs)
        reactions = '<:checkmark:757604941345980473>', '<:crossmark:757604957955293234>'
        for reaction in reactions:
            await msg.add_reaction(reaction)
                
        try:
            reaction = await self.bot.wait_for('reaction_add',
                                               check=lambda r, u: r.message.id == msg.id and u.id == self.author.id,
                                               timeout=30)
        except:
            if delete_on_confirm:
                await msg.delete()
            return
        
        if delete_on_confirm:
            await msg.delete()
        return str(reaction[0]) == reactions[0]
    
    async def get_help(self, command = None):
        await self.invoke(self.bot.get_command('help'), command=command or self.command.qualified_name)