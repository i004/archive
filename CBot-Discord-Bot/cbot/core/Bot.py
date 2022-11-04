import os
import json
import wavelink
from glob import glob
from time import time
from asyncio import sleep
from base64 import b64decode
from traceback import format_exc
from discord.ext import commands
from aiohttp import ClientSession
from cbot.core.Context import Context
from cbot.core.BotConfig import BotConfig
from cbot.core.BotChecks import BotChecks
from cbot.services import Logger, Database, Module
from discord import AllowedMentions, Message, Streaming, Webhook, AsyncWebhookAdapter

class Bot(commands.AutoShardedBot):
    def __init__(self, config, **kwargs):
        self.config: BotConfig = config
        super().__init__(command_prefix=commands.when_mentioned_or(self.config.prefix), **kwargs)
        self.allowed_mentions = AllowedMentions(everyone=False, roles=False, users=True)
        self.check(BotChecks.MainCheck)
        self.connected = False
        self.ready = False
        self.cache = {}

    async def get_context(self, message, *, cls=None):
        return await super().get_context(message, cls=Context)

    async def on_ready(self):
        await self.change_presence(activity=Streaming(name=f'{self.config.prefix}help', url='https://twitch.tv/%none%'))
        Logger.info(f'Receieved user {self.user.name}#{self.user.discriminator} (ID: {self.user.id})')
        if os.path.exists('.restart'):
            try:
                restart = json.loads(open('.restart', 'r').read())
                channel = await self.fetch_channel(restart["channel"])
                await channel.send(f'<@{restart["author"]}> Бот перезапущен :ok_hand:')
            except:
                pass
            os.remove('.restart')

    def load_modules(self):
        Logger.info('Loading extensions...')
        loaded = 0
        total  = 0
        for extension in self.config.extensions:
                if extension.startswith('./'):
                    for filename in glob(extension, recursive=True):
                        if '__init__' in filename:
                            continue # Skip __init__ files
                        total += 1
                        try:
                            self.load_extension(Module(path=filename).id)
                        except:
                            Logger.error(f'Error when loading extension {filename}:\n{format_exc()}')
                        else:
                            loaded += 1
                    
                else:
                    total += 1
                    try:
                        self.load_extension(extension)
                    except:
                        Logger.error(f'Error when loading extension {extension}:\n{format_exc()}')
                    else:
                        loaded += 1

        Logger.done(f'Loaded {loaded} of {total} extensions')