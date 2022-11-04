import discord

from json import dumps
from time import ctime
from asyncio import sleep
from os import system, remove
from discord.ext import commands
from humanize import naturaldelta

from cbot.main import CBot as Bot
from cbot.core.BotConfig import BotConfig

class Tasks(commands.Cog):
    def __init__(self, bot: Bot):
        self.bot = bot
        if hasattr(self.bot, 'tasks'):
           for task in self.bot.tasks:
               task.cancel() 
        self.bot.tasks = []
        self.bot.tasks.append(self.bot.loop.create_task(self.sql_backup()))
        self.bot.tasks.append(self.bot.loop.create_task(self.rename_task()))
        self.bot.tasks.append(self.bot.loop.create_task(self.post_servers_loop()))

    async def post_servers(self):
        data = dumps({'shards': self.bot.shard_count or 1, 'servers': len(self.bot.guilds)})
        async with self.bot.session.post(f'https://api.server-discord.com/v2/bots/689532005548949555/stats',
                                        headers={'Authorization': f'SDC {BotConfig.tokens["SDC"]}',
                                                 'User-Agent': f'sdc-api/1.1.5 (/bots/689532005548949555/stats)',
                                                 'Content-Type': 'application/x-www-form-urlencoded',
                                                 'Content-Length': str(len(data))},
                                        data=data) as resp:
            return await resp.json()


    async def post_servers_loop(self):
        await self.bot.wait_until_ready()
        if not hasattr(self.bot, 'session'):
            await sleep(10)
        while True:
            await self.post_servers()
            await sleep(60)

    async def sql_backup(self):
        await self.bot.wait_until_ready()
        await sleep(30)
        while True:
            system(f'pg_dump {self.bot.db.get_psql_url()} > backup.psql')
            channel = await self.bot.fetch_channel(BotConfig.channels['sql_backups'])
            await channel.send(file=discord.File('backup.psql'))
            remove('backup.psql')
            await sleep(3600)

    async def rename_task(self):
        await self.bot.wait_until_ready()
        while True:
            channel = await self.bot.fetch_channel(765994385099718678)
            await channel.edit(name=f'Пользователей • {len(channel.guild.members)}')
            await sleep(300)

def setup(bot: Bot):
    bot.add_cog(Tasks(bot))