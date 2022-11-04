import asyncpg
from asyncio import Event
from cbot.services import Logger
from traceback import format_exc

class UserProfileModel:
    def __init__(self, raw: dict, db):
        self.db = db
        self.balance = raw.pop('balance')
        self.bank = raw.pop('bank')
        self.reputation = raw.pop('reputation')
        self.user_id = raw.pop('user_id')
        self.guild_id = raw.pop('guild_id')

    def __str__(self):
        return (f'<UserProfileModel guild_id={self.guild_id!r} user_id={self.user_id!r} '
                f'balance={self.balance!r} bank={self.bank!r} reputation={self.reputation!r}>')
    
    async def save(self):
        await self.db.query('INSERT INTO balance VALUES ($1, $2, $3, $4, $5) ON CONFLICT(guild_id, user_id) DO UPDATE '
                            'SET balance = EXCLUDED.balance, bank = EXCLUDED.bank, reputation = EXCLUDED.reputation',
                            [self.guild_id, self.user_id, self.balance, self.bank, self.reputation])

    __repr__ = __str__

class Database:
    def __init__(self, config: dict):
        self.config = config
        self.connection: asyncpg.Connection = None
        self.get_psql_url = lambda: f'postgresql://{config["username"]}:{config["password"]}@{config.get("ip", "127.0.0.1")}:{config.get("port", 5432)}/{config.get("database")}'
        self.event = Event()
        self.connecting = False
        self.not_connected_warn = 0

    async def fetch_profile(self, guild_id: int, user_id: int):
        profile = await self.query('SELECT * FROM balance WHERE guild_id=$1 AND user_id=$2', [guild_id, user_id])
        if not profile:
            profile = await self.query('INSERT INTO balance VALUES ($1, $2, 0) RETURNING *', [guild_id, user_id])
        
        return UserProfileModel(dict(profile), self)

    async def connect(self):
        if self.connecting:
            Logger.error(f'[asyncpg] Database.connect was called twice at once, waiting for connection...')
            return await self.event.wait()
        self.connecting = True
        Logger.debug(f'[asyncpg] Connecting to database...')
        self.connection = await asyncpg.create_pool(self.get_psql_url())
        Logger.done(f'[asyncpg] Connected to database')
        self.connecting = False
        self.event.set()

    async def query(self, src: str, parrams: list = [], return_list: bool = True) -> list or dict:
        if not self.connection:
            self.not_connected_warn += 1
            Logger.warn(f'[asyncpg] (#{self.not_connected_warn}) Connection is not established, waiting for connection...')
            await self.event.wait()
            self.not_connected_warn = 0
        if self.connection._closed:
            Logger.warn('[asyncpg] Connection is closed, re-connecting...')
            await self.connect()
        
        output = None

        async with self.connection.acquire() as conn:
            output = await conn.fetch(src, *parrams)
            await self.connection.release(conn)
        
        if type(output) == list and len(output) == 1 and return_list:
            return output[0]

        return output