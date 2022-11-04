from aiohttp import ClientSession
from discord import AsyncWebhookAdapter, Webhook
import urllib.parse, json

class GistClient:
    def __init__(self, token):
        self.token = token
    
    async def create_gist(self, description, files: dict, public: bool = True):
        async with ClientSession() as session:
            async with session.post('https://api.github.com/gists',
                    headers={'Authorization': f'token {self.token}', 'Content-Type': 'application/json'},
                    data=json.dumps({"public": public, "description": description, "files": files})) as resp:
                return (await resp.json())['id']

    async def delete_gist(self, id):
        async with ClientSession() as session:
            async with session.delete(f'https://api.github.com/gists/{id}',
                headers={'Authorization': f'token {self.token}', 'Content-Type': 'application/json'}) as resp:
                return (await resp.text())

class DiscordAPI:
    def __init__(self, token):
        self.token = token
    
    async def get_user(self):
        async with ClientSession() as session:
            async with session.get(f'https://discordapp.com/api/users/@me', headers={'Authorization': f'Bot {self.token}'}) as data:
                return await data.json()

class WebhookClient:
    def __init__(self, url, loop=None):
        self.url = url
        self.session = ClientSession(loop=loop)
        self.hook = Webhook.from_url(url, adapter=AsyncWebhookAdapter(self.session))
    
    async def send(self, *args, **kwargs):
        message = await self.hook.send(*args, **kwargs)
        await self.session.close()
        return message