from urllib.parse import quote
import aiohttp
import xmltodict

class WolframAlphaError(Exception):
    pass

class Image:
    def __init__(self, raw):
        self.src = raw.get('@src')
        self.alt = raw.get('@alt')
        self.title = raw.get('@title')
        self.width = raw.get('@width')
        self.height = raw.get('@height')
        self.type = raw.get('@type')
        self.themes = raw.get('@themes')
        self.colorinvertable = raw.get('@colorinvertable') == 'true'

    def __repr__(self):
        return self.src
    __str__ = __repr__

class Subpod:
    def __init__(self, raw):
        if type(raw) == list:
            raw = raw[0]
        
        self.title = raw.get('@title')
        self.plaintext = raw.get('@plaintext')
        self.primary = raw.get('@primary')

        if (image := raw.get('img')):
            self.image = Image(dict(raw.get('img')))
        else:
            self.image = None

    def __repr__(self):
        return f'<{self.__class__.__name__} title={self.title!r} plaintext={self.plaintext!r} image={self.image!r}>'
    __str__ = __repr__

class Pod:
    def __init__(self, raw):
        self.title = raw.get('@title')
        self.scanner = raw.get('@scanner')
        self.id = raw.get('@id')
        self.position = raw.get('@position')
        self.is_error = raw.get('@error') == 'true'
        
        if (subpod := raw.get('subpod')):
            self.subpod = Subpod(subpod)
        else:
            self.subpod = None

    def __repr__(self):
        return f'<{self.__class__.__name__} title={self.title!r} position={self.position}>'

class QueryResult:
    def __init__(self, raw):
        self.parsetiming = raw.get('@parsetiming')
        self.pod_count = raw.get('@numpods')
        self.timing = raw.get('@timing')
        self.id = raw.get('@id')
        self.host = raw.get('@host')
        self.related = raw.get('@related')
        self.version = raw.get('@version')
        self.server = raw.get('@server')
        self.version = raw.get('@version')
        self.tips = raw.get('tips')
        self.success = raw.get('@success') == 'true'
        self.pods = []

        for pod in (raw.get('pod') or []):
            self.pods.append(Pod(dict(pod)))

    def __repr__(self):
        return f'<{self.__class__.__name__} pod_count={self.pod_count} parsetimig={self.parsetiming} timing={self.timing} success={self.success}>'
    __str__ = __repr__

class WolframAlphaClient:
    def __init__(self, app_id, version=2):
        self.app_id = app_id
        self.version = version
    
    async def request(self, path, **options):
        opt = '&'.join(f'{quote(x)}={quote(options[x])}' for x in options.keys())
        async with aiohttp.ClientSession() as session:
            resp = await session.get(f'http://api.wolframalpha.com/v{self.version}/{path}?appid={self.app_id}&{opt}')
            out  = await resp.text()
            await session.close()
        return out
    
    async def query(self, i):
        out    = await self.request('query', input=i)
        data   = xmltodict.parse(out)
        result = data['queryresult']
        return QueryResult(result)