import re
import io
import inspect
from pathlib import Path
from psutil import Process
from datetime import datetime
from colorama import Fore, Style, init
init()

ansi_escape = re.compile(r'''
    \x1B  # ESC
    (?:   # 7-bit C1 Fe (except CSI)
        [@-Z\\-_]
    |     # or [ for CSI, followed by a control sequence
        \[
        [0-?]*  # Parameter bytes
        [ -/]*  # Intermediate bytes
        [@-~]   # Final byte
    )
''', re.VERBOSE)

def getTime():
    return datetime.now().strftime(r'%H:%M:%S %D')

def get_file(frame):
    try:
        return inspect.getmodule(frame[0]).__name__
    except:
        return 'unknown'

get_filename = lambda: str(datetime.utcfromtimestamp(Process().create_time())).split('.')[0].replace(':', '-')

def write(*args):
    msg = ' '.join(str(x) for x in args)
    with io.open(f'logs/{get_filename()}.log', mode='a', encoding='utf-8') as stream:
        stream.write(f'\n{ansi_escape.sub("", msg)}')

def fmt(t, m, frame):
    filename = get_file(frame)
    filename = filename + (' '*(25-len(filename)))
    return f'{Fore.LIGHTBLACK_EX}[{getTime()}]{Style.RESET_ALL} {filename}  :  {t}{Style.RESET_ALL}  :  {m}'

class Logger:
    @staticmethod
    def done(message):
        print(fmt(f'{Fore.GREEN}OK    ', message, inspect.stack()[1]))
        write(f'[{getTime()}] OK    | {message}')
    
    @staticmethod
    def log(message):
        print(fmt(f'{Fore.WHITE}Log   ', message, inspect.stack()[1]))
        write(f'[{getTime()}] Log   | {message}')
    
    @staticmethod
    def error(message):
        print(fmt(f'{Fore.RED}Error ', message, inspect.stack()[1]))
        write(f'[{getTime()}] Error | {message}')
    
    @staticmethod
    def debug(message):
        print(fmt(f'{Fore.LIGHTWHITE_EX}Debug ', message, inspect.stack()[1]))
        write(f'[{getTime()}] Debug | {message}')
    
    @staticmethod
    def info(message):
        print(fmt(f'{Fore.LIGHTCYAN_EX}Info  ', message, inspect.stack()[1]))
        write(f'[{getTime()}] Info  | {message}')
    
    @staticmethod
    def warn(message):
        print(fmt(f'{Fore.LIGHTYELLOW_EX}Warn  ', message, inspect.stack()[1]))
        write(f'[{getTime()}] Warn  | {message}')