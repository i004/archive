class BotConfig:
    token = '<Bot Token>' # Bot's token

    prefix = 'c.' # Main prefix
    extensions = [ # Extensions
        'jishaku', # Extension as module
        './cogs/**/*.py', # Extension as absolute path
        './extensions/**/*.py'
    ]
    database = { # PostgreSQL Database Config
        "username": "Username", 
        "password": "Password",
        "database": "Database name"
    }
    disabled_commands = ['example-1', 'example-2'] # Disabled commands

    shards = 1 # Amount of shards

    webhooks = {
        'event_errors': 'Exceptions in events',
        'command_errors': 'Exceptions in commands',
        'ws_logs': 'Websocket logs such as shard connected/disconnected/resumed',
        'server_logs': 'Server add/remove logs'
    }
    channels = {
        'sql_backups': 0 # ID of the channel to which bot will send database backup every hour
    }
    tokens = {
        'SDC': 'Server-Discord.com API token. Used to publish server and shard count',
    }