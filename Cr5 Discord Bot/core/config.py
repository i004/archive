import discord


class Config:
    token = 'n3V3Rg0NnAG1v3Y0uuPnEVeR.g0nnal.3ty0udOwNneV3Rg0NNarUnAR0un'

    extensions = [
        'jishaku',
        'cogs.*',
        'cogs.internal.*',
        'cogs.utils.*',
        'cogs.eco.*'
    ]

    channels = {
        'bugs': 805486153578709083,
        'backups': 805486214001328218,
        'exceptions': 805486184654176337,
        'server_log': 805499683866017792
    }

    database = {
        'url': 'postgresql://amogus:amogus@127.0.0.1:5432/amogus'
    }

    environ = {
        'JISHAKU_NO_UNDERSCORE': 'true',
        'JISHAKU_NO_DM_TRACEBACK': 'true',
        'JISHAKU_HIDE': 'true'
    }

    activity = discord.Activity(type=discord.ActivityType.listening,
                                name='c.help')

    tokens = {
        'OWM': '',
        'google_search': '',
        'osu!': '',
        'wolfram': ''
    }

    webhooks = {
        'status': ''
    }
