import io
import yaml

def rec(obj, k):
    if not k:
        return obj
    
    if type(obj) == dict:
        if k[0] not in obj:
            return None
        return rec(obj[k[0]], k[1:])
    
    elif type(obj) == list:
        if not k[0].isnumeric():
            return None
        v = int(k[0])
        if v < 0 or v >= len(obj):
            return None
        return rec(obj[int(k[0])], k[1:])

    else:
        return obj

def rec_format(obj, *args, **kwargs):
    if type(obj) == list:
        return [rec_format(x, *args, **kwargs) for x in obj]
    elif type(obj) == dict:
        for k in obj:
            if type(obj[k]) in (list, dict):
                obj[k] = rec_format(obj[k], *args, **kwargs)
            else:
                obj[k] = str(obj[k]).format(*args, **kwargs)
        return obj
    else:
        return str(obj).format(*args, **kwargs)

class Locale:
    def __init__(self, locale, path):
        self.name = locale
        self.data = yaml.safe_load(stream=io.open(path, mode='r', encoding='utf-8'))
    
    def format(self, key, *args, return_none=False, **kwargs):
        value = rec(self.data, key.split('.'))
        if not value and not return_none:
            return f'[{self.name.upper()}.{key}: translation required]'
        elif not value:
            return None
        
        return rec_format(value, *args, **kwargs)

class Localizator:
    def __init__(self, locales: list, root: str = 'cbot/locales'):
        self.locales = {locale: Locale(locale, path=f'{root}/{locale}.yaml') for locale in locales}
    
    def get_locale(self, name):
        return self.locales[name]