import io
import re
import json
import os
import sys
import shutil
import discord

from time import time
from PIL import Image
from io import BytesIO
from random import randint
from psutil import Process
from datetime import datetime
from discord.ext import commands

from jishaku.modules import ExtensionConverter
from jishaku.codeblocks import codeblock_converter

from cbot.core.Converters import User
from cbot.services import Paginator, Logger
from cbot.services.Emojis import GetEmoji
from cbot.services.Utils import shell
from cbot.services.Module import Module

class Owner(commands.Cog):
    '''Овнер-онли команды'''
    def __init__(self, bot: commands.Bot):
        self.bot = bot

    async def request_user(self, ctx: commands.Context, user_id: int):
        try:
            code = ''.join(str(randint(i, 9)) for i in range(5))
            await ctx.send(f'{self.bot.get_user(user_id)}, please send code `{code}` to confirm this action')
            await self.bot.wait_for('message', check=lambda m: m.channel.id == ctx.channel.id and m.author.id == user_id and m.content == code, timeout=60)
            return True
        except:
            await ctx.send('Timeout')
            return False

    async def cog_check(self, ctx: commands.Context):
        if not await self.bot.is_owner(ctx.author):
            raise commands.NotOwner('Not a owner')
        return True
    
    @commands.command(name='eval', aliases=['e'])
    async def e(self, ctx: commands.Context, *, src: codeblock_converter):
        '''Сокращение команды `jishaku python`'''
        await ctx.invoke(self.bot.get_command('jishaku python'), argument=src)
    
    @commands.command(name='reload', aliases=['load', 'rel'])
    async def reload(self, ctx: commands.Context, *extensions: ExtensionConverter):
        '''Сокращение команды `jishaku load`'''
        await ctx.invoke(self.bot.get_command('jishaku load'), *extensions)
        try:
            self.bot.reload_locales()
        except:
            pass

    @commands.command(name='sql', aliases=['psql'])
    async def sql(self, ctx: commands.Context, *, src: codeblock_converter):
        '''Выполнить SQL-запрос'''
        lines = [x for x in re.split(r';+', src.content.replace('\n', ';')) if x]
        paginator = Paginator(self.bot, ctx.author)

        for page, line in enumerate(lines):
            if not line.replace(' ', ''):
                continue
            try:
                output = await ctx.bot.db.query(line)
                if type(output) == list:
                    output = json.dumps([dict(x) for x in output])
                else:
                    output = json.dumps(dict(output))
            except Exception as e:
                output = str(e)
            paginator.pages.append(f'```json\n{output[:1990]}\n```\nPage {page+1}/{len(lines)}')

        await paginator.send_controller(ctx.channel)
    
    @commands.command(name='restart', aliases=['reboot'])
    async def restart(self, ctx: commands.Context):
        '''Перезапустить бота'''
        if not await self.request_user(ctx, 319050081795964928):
            return
        await ctx.send('Перезапуск... <a:loading:744966192975839343>')
        open('.restart', 'w').write(json.dumps({"channel": ctx.channel.id, "author": ctx.author.id}))
        await self.bot.change_presence(activity=discord.Game(f'{GetEmoji("no_entry")} restarting...'), status=discord.Status.dnd)
        os.execl(sys.executable, sys.executable, *sys.argv)

    @commands.command(name='give-bonus')
    async def givebonus(self, ctx: commands.Context, user: User, amount: int):
        '''Выдать бонус пользователю (изумруды)'''
        emeralds = await self.bot.db.query('INSERT INTO emeralds VALUES ($1, $2) ON CONFLICT(user_id) DO UPDATE SET emeralds = emeralds.emeralds + EXCLUDED.emeralds RETURNING *', [user.id, amount])
        await ctx.send(f'Я выдал {user} {amount} изумруда(ов) | Теперь {emeralds["emeralds"]} изумрудов')

    @commands.command(name='status')
    async def status(self, ctx: commands.Context, *, status):
        '''Сменить статус бота'''
        await self.bot.change_presence(activity=discord.Activity(name=status, type=discord.ActivityType.playing))
        await ctx.send(f'Статус сменён :ok_hand:')

    @commands.command(name='logs', aliases=['l'])
    async def logs(self, ctx: commands.Context, count: int = None):
        '''Просмотреть логи бота'''
        filename = str(datetime.utcfromtimestamp(Process().create_time())).split('.')[0].replace(':', '-')
        path = f'logs/{filename}.log'
        if not os.path.exists(path):
            return await ctx.send(f':no_entry: Файл логов не найден (``{path}``)')
        
        with io.open(path, mode='r', encoding='utf-8') as stream:
            paginator = Paginator(self.bot, ctx.author)
            lines = stream.read().split('\n')[::-1]
            if count:
                lines = lines[:count]
            pages = ["\n".join(lines[i:i+10]) for i in range(0, len(lines), 10)]
            for i, page in enumerate(pages):
                paginator.pages.append(f'`{path}`\n```css\n{page}\n```\nPage {i+1}/{len(pages)}')
            await paginator.send_controller(ctx)

    @commands.command(name='update')
    async def update(self, ctx: commands.Context,):
        '''Обновить бота'''
        if self.bot.user.id == 748586966236397730: # 748586966236397730 -- CBot Nightly
            return await ctx.send(f'`update` может быть использован только на основной версии бота')
        
        await ctx.send(f'<a:loading:744966192975839343> Обновляюсь...')
        out, exit_code = await shell('git pull --allow-unrelated-histories')
        
        if exit_code != 0:
            prefix = f':bangbang: Произошла ошибка при обновлении (exit code: {exit_code})'
            paginator = Paginator(self.bot, ctx.author)
            out = '\n'.join(out)
            chunks = [out[i:i+500] for i in range(0, len(out), 500)]
            for i, chunk in enumerate(chunks):
                paginator.pages.append(f'{prefix}\n```\n{chunk}\n```\nСтраница {i+1}/{len(chunks)}')
            return await paginator.send_controller(ctx)
        
        else:
            if 'Already up-to-date.' in out:
                return await ctx.send(f':warning: Бот уже обновлён до самой новой версии')
            
            updated = []
            for line in out:
                if os.path.exists(line.strip().split()[0]):
                    updated.append(line.strip().split()[0])

            await ctx.send(f'Бот был успешно обновлён :ok_hand:\n' +
                           (f'Обновлённые файлы:\n- ' + '\n- '.join(updated))[:1024] if updated else '')
            
            log = []

            for filename in updated:
                if not filename.endswith('.py'):
                    continue
                
                module = Module(path=filename).id
                if module.startswith('cogs.') or module.startswith('extensions.'):
                    self.bot.reload_extension(module)
                    log.append(f'Модуль ``{module}`` был перезагружен')
                else:
                    await ctx.send(f'Были изменены главные файлы бота, перезапуск...')
                    open('.restart', 'w').write(json.dumps({"channel": ctx.channel.id, "author": ctx.author.id}))
                    await self.bot.change_presence(activity=discord.Game(f'{GetEmoji("no_entry")} restarting...'), status=discord.Status.dnd)
                    os.execl(sys.executable, sys.executable, *sys.argv)

            if log:
                await ctx.send('\n'.join(log))
        
    @commands.command(name='blacklist')
    async def blacklist(self, ctx: commands.Context, user: int, *, reason=None):
        '''Внести пользователя в ЧС'''
        
        if not await self.bot.db.query('SELECT * FROM blacklist WHERE user_id=$1', [user]):
            await self.bot.db.query('INSERT INTO blacklist VALUES ($1, $2)', [user, reason])
            await ctx.send(f'**{await self.bot.fetch_user(user)}** внесён в ЧС :ok_hand:')
        else:
            await self.bot.db.query('DELETE FROM blacklist WHERE user_id=$1', [user])
            await ctx.send(f'**{await self.bot.fetch_user(user)}** убран из ЧС :ok_hand:')

def setup(bot: commands.Bot):
    bot.add_cog(Owner(bot))