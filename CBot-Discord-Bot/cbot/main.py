import discord

from discord.ext import commands
from traceback import format_exc
from aiohttp import ClientSession

from cbot.core.Bot import Bot
from cbot.services import Logger
from cbot.services import Database
from cbot.core.Context import Context
from cbot.services import WebhookClient
from cbot.core.BotConfig import BotConfig
from cbot.services.Localizator import Localizator

class CBot(Bot):
    __version__ = '2.0.3-rewrite'
    def __init__(self, config, **kwargs):
        super().__init__(config, **kwargs)
        self.session = ClientSession(loop=self.loop)
        self.db = Database(self.config.database)
        self.connected = False
        self.localizator = Localizator(['ru'])
    
    def reload_locales(self):
        self.localizator = Localizator(['ru'])

    async def get_language(self, ctx: Context) -> str:
        guild_locale  = await self.db.query('SELECT * FROM locales WHERE id=$1', [ctx.guild.id])
        author_locale = await self.db.query('SELECT * FROM locales WHERE id=$1', [ctx.author.id])
        if not guild_locale and not author_locale:
            return 'ru'
        return (author_locale or guild_locale)['locale']

    async def get_context(self, message, *, cls=None):
        ctx = await super().get_context(message)
        ctx.locale = await self.get_language(ctx)
        return ctx

    async def get_prefix(self, msg: discord.Message):
        guild_prefix = await self.db.query('SELECT * FROM prefixes WHERE id=$1', [msg.guild.id])
        author_prefix = await self.db.query('SELECT * FROM prefixes WHERE id=$1', [msg.author.id])

        if not guild_prefix and not author_prefix:
            prefix = self.config.prefix
        
        else:
            prefix = (author_prefix or guild_prefix or {}).get('prefix') or BotConfig.prefix

        return commands.when_mentioned_or(prefix)(self, msg)

    async def on_error(self, event, *args, **kwargs):
        webhook = WebhookClient(self.config.webhooks['event_errors'])
        
        await webhook.send(f'Exception in event ``{event}``:\n```py\n{str(format_exc())[:1990]}\n```')

    async def on_connect(self):
        await self.db.connect()
        super().on_connect()

    def run(self):
        self.load_modules()
        Logger.log('Starting bot...')
        super().run(self.config.token)