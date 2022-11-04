from aiohttp import ClientSession

async def ConvertCurrency(a: float, f: str, t: str) -> float:
    key = f'{f.upper()}_{t.upper()}'
    async with ClientSession() as session:
        async with session.get(f'https://free.currconv.com/api/v7/convert?q={key}&compact=ultra&apiKey=8d76fbabec3f8d1c5249') as resp:
            data = await resp.json()
            if key not in data:
                return data
            return data[key]*a