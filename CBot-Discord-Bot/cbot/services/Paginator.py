from discord.ext import commands
from cbot.services.Emojis import GetEmoji
import discord

class Paginator:
    '''Basic discord.py paginator class'''
    def __init__(self, bot: commands.Bot, author: discord.User = None):
        '''Initalize paginator.
        If no user provided paginator will be available for everyone'''
        self.pages = []
        self.emojis = {
            'previous_page': GetEmoji('arrow_left'),
            'close': GetEmoji('stop_button'),
            'next_page': GetEmoji('arrow_right')
        }
        self.active = False
        self.bot = bot
        self.tasks = []
        self.events = ['reaction_add', 'reaction_remove']
        self.author = author
        self.timeout = 200
        self.current_page = 0

    def get_page(self, i: int) -> dict:
        '''Format kwargs for <abc.Messageable>.send or <Message>.edit'''
        page = self.pages[i]
        if type(page) == discord.Embed:
            return {"embed": page, "content": None}
        else:
            return {"embed": None, "content": page}

    def stop(self):
        '''Stop paginator and cancel all tasks'''
        self.active = False
        for task in self.tasks:
            task.cancel()

    def predicate(self, reaction, user):
        '''Event listener predicate'''
        user_matches = True
        reaction_matches = str(reaction) in self.emojis.values()
        message_matches = reaction.message.id == self.message.id
        if self.author and hasattr(self.author, 'id'):
            user_matches = self.author.id == user.id
        return user_matches and reaction_matches and message_matches

    async def task(self, event_name):
        '''Event listener task'''
        while self.active:
            try:
                reaction = await self.bot.wait_for(event_name,
                                                    check=self.predicate,
                                                    timeout=self.timeout)
            except:
                return self.stop()

            if reaction[0].emoji == self.emojis['close']:
                await self.message.delete()
                return self.stop()
            
            elif reaction[0].emoji == self.emojis['next_page']:
                self.current_page += 1
                if self.current_page >= len(self.pages):
                    self.current_page = 0
                await self.message.edit(**self.get_page(self.current_page))
            
            elif reaction[0].emoji == self.emojis['previous_page']:
                self.current_page -= 1
                if self.current_page < 0:
                    self.current_page = len(self.pages)-1
                await self.message.edit(**self.get_page(self.current_page))

    async def send_controller(self, destination: discord.abc.Messageable) -> bool:
        '''Send controller and start listening loop
        
        Returns True on successfull and False if bot cannot send message to specified destination'''
        try:
            self.message = await destination.send(**self.get_page(self.current_page))
            self.active = True
        except:
            return False
        
        if len(self.pages) > 1:
            for emoji in self.emojis.values():
                await self.message.add_reaction(emoji)
        else:
            await self.message.add_reaction(self.emojis['close'])

        for event in self.events:
            self.tasks.append(self.bot.loop.create_task(self.task(event)))
        
        return True

class WrappedPaginator(Paginator):
    '''Wrapped paginator'''
    def add_text(self, text: str, chunk_size: int = 'auto', prefix: str = '', suffix: str = ''):
        if chunk_size == 'auto':
            chunk_size = 2000 - len(prefix) - len(suffix)
        if chunk_size + len(prefix) + len(suffix) > 2000:
            raise ValueError(f'Chunk size extends maximum message size ({chunk_size + len(prefix) + len(suffix)} > 2000)')
        for chunk in [text[i:i+chunk_size] for i in range(0,len(text),chunk_size)]:
            self.pages.append(prefix + chunk + suffix)