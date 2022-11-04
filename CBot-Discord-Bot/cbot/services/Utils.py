from jishaku.shell import ShellReader
from humanize import naturalsize
import json

async def shell(src, timeout=90, loop=None):
    out = []
    with ShellReader(src, timeout, loop) as reader:
        async for line in reader:
            out.append(line)
    return out, reader.process.returncode

class SpeedtestServer:
    def __init__(self, raw):
        self.host = raw.get('host')
        self.latency = raw.get('latency')
        self.name = raw.get('name')
        self.country = raw.get('country')
        self.id = raw.get('id')
        self.url = raw.get('url')
        self.lon = raw.get('lon')
        self.lat = raw.get('lat')
    
    def __repr__(self):
        return f'<SpeedtestServer host={self.host!r} latency={self.latency} name={self.name!r} country={self.country!r} id={self.id!r}>'
    __str__ = __repr__

class SpeedtestResult:
    def __init__(self, raw):
        self.download = raw.get('download')
        self.upload = raw.get('upload')
        self.ping = raw.get('ping')
        self.server = raw.get('server')

        if self.server:
            self.server = SpeedtestServer(self.server)

    def __repr__(self):
        return (f'<SpeedtestResult' +
                (f' download={naturalsize(self.download)}' if self.download else '') +
                (f' upload={naturalsize(self.upload)}' if self.upload else '') +
                (f' ping={self.ping}' if self.ping else '') +
                (f' server={self.server.host}' if self.server else '') +
                '>')
    __str__ = __repr__

async def speedtest(timeout=120, /, test_upload=True, test_download=True, single=False, pre_allocate=True):
    args = ['--json']
    if not test_upload:
        args.append('--no-upload')
    if not test_download:
        args.append('--no-download')
    if single:
        args.append('--single')
    if not pre_allocate:
        args.append('--no-pre-allocate')
    res = await shell(f'speedtest-cli {" ".join(args)}', timeout=timeout)
    return SpeedtestResult(json.loads(res[0]))

async def GitInfo():
    commits = (await shell('git rev-list --count master'))[0][0]
    latest  = (await shell(r'git show -n 1 -s --format="%h => %s"'))[0][0]
    return {"commits": commits, "latest": latest}