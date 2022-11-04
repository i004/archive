import sys
sys.dont_write_bytecode = True

from os import environ
from cbot.main import CBot
from discord.ext import commands
from cbot.core.BotConfig import BotConfig
environ['JISHAKU_NO_UNDERSCORE'] = 'true'
environ['JISHAKU_NO_DM_TRACEBACK'] = 'true'
environ['JISHAKU_HIDE'] = 'true'

if __name__ == "__main__":
    bot = CBot(BotConfig,
               case_insensitive      = True,
               fetch_offline_members = True,
               guild_subscriptions   = True,
               shard_count           = BotConfig.shards)
    bot.run()