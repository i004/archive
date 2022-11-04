from urllib.parse import quote
from bs4 import BeautifulSoup
from aiohttp import ClientSession
from random import choice

user_agents = [
    'Mozilla/5.0 (X11; Ubuntu; Linux x86_64; rv:44.0) Gecko/20100101 Firefox/44.01',
    'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/54.0.2840.71 Safari/537.36',
    'Mozilla/5.0 (Linux; Ubuntu 14.04) AppleWebKit/537.36 Chromium/35.0.1870.2 Safari/537.36',
    'Mozilla/5.0 (Windows NT 6.1) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/41.0.2228.0 Safari/537.36',
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/42.0.2311.135 '
    'Safari/537.36 Edge/12.246',
    'Mozilla/5.0 (X11; Ubuntu; Linux x86_64; rv:54.0) Gecko/20100101 Firefox/54.0',
]

class GoogleResult:
    def __init__(self, raw: dict):
        self.title = raw.pop('title')
        self.link = raw.pop('link')
        self.description = raw.pop('description')

async def get_html(url):
    async with ClientSession(headers={'User-Agent': choice(user_agents)}) as session:
        async with session.get(url) as resp:
            html = await resp.text()
        await session.close()
    return BeautifulSoup(html, 'html.parser')

def _get_name(li):
    a = li.find("h3", attrs={"class": "LC20lb DKV0Md"})
    if a is not None:
        return a.text.strip()
    return None

def _get_link(li):
    try:
        a = li.find("a")
        link = a["href"]
    except Exception:
        return None
    return link

def _get_description(li):
    a = li.find("span", attrs={"class": "aCOpRe"})
    if a is not None:
        return a.text.strip()
    return None
    
class GoogleSearchClient:
    def __init__(self, lang='en', region='us'):
        self.lang = lang
        self.region = region
    
    def get_search_url(self, query):
        return f'https://google.com/search?nl={self.lang}&q={quote(query)}&gl={self.region}&gws_rd=cr&pws=0'

    async def search(self, query, limit=10):
        parser = await get_html(self.get_search_url(query))
        results = []
        results_ = parser.select_one("div#rso").select("div.g")

        for result in results_:
            data = {}

            data['title'] = _get_name(result)
            data['link'] = _get_link(result)
            data['description'] = _get_description(result)
            
            results.append(data)
        
        return [GoogleResult(x) for x in results if x['title'] and x['link']][:limit]