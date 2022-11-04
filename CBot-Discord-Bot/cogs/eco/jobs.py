import discord

from discord.ext import commands
from random import randint

from cbot.main import CBot as Bot
from cbot.services.Checks import cooldown
from cbot.core.Converters import User, Balance
from cogs.eco.general import Economy as General

class Job:
    def __init__(self, name, emoji = None, variant_2 = None):
        self.name = name
        self.emoji = f':{emoji}:'
        self.variant_2 = variant_2

jobs = {
    'programmer': Job('Программист', emoji='computer', variant_2='Программистом'),
    'scientist': Job('Ученый', emoji='mag', variant_2='Ученым'),
    'mechanic': Job('Механик', emoji='tools', variant_2='Механиком'),
    'teacher': Job('Учитель', emoji='man_teacher', variant_2='Учителем'),
    'miner': Job('Шахтёр', emoji='pick', variant_2='Шахтёром')
}

class Economy(commands.Cog):
    '''Команды экономики'''
    name = 'Экономика'
    def __init__(self, bot: Bot):
        self.bot = bot

    @staticmethod
    async def GetJob(ctx: commands.Context):
        job = await ctx.bot.db.query('SELECT * FROM jobs WHERE user_id=$1', [ctx.author.id])
        if not job:
            return None
        return job['job']

    @commands.group(name='job', invoke_without_command=True)
    async def job(self, ctx: commands.Context):
        '''Управление работами'''
        await ctx.invoke(self.bot.get_command('help'), command='job')
    
    @job.command(name='list')
    async def job_list(self, ctx: commands.Context):
        '''Список работ'''
        embed = discord.Embed(title='Список работ', description='\n'.join(f'• **{jobs[job].name}**' for job in jobs))
        embed.set_footer(text=f'Информация про определённую работу — job info <работа>\n' \
                              f'Вступить в работу — job join <работа>')
        await ctx.send(embed=embed)

    @job.command(name='info')
    async def job_info(self, ctx: commands.Context, job):
        '''Информация про определённую работу'''
        names = {jobs[x].name.lower(): x for x in jobs}
        if job.lower() not in names:
            return await ctx.send(f':warning: Неизвестная работа')
        job_name = names[job.lower()]
        job = jobs[job_name]
        currency = await General.get_currency(ctx)

        embed = discord.Embed(title=f'{job.emoji} {job.name}')
        embed.add_field(name='Ваш скилл', value=f'0')
        embed.add_field(name='Заработок', value=f'50{currency}')
        embed.add_field(name='Людей на этой работе', value=f'0')

        await ctx.send(embed=embed)
    
    @job.command(name='join')
    async def join_job(self, ctx: commands.Context, job):
        '''Вступить в работу'''
        if (user_job := await Economy.GetJob(ctx)):
            return await ctx.send(f'Вы не можете вступить в эту работу: Вы уже работаете {str(jobs[user_job].variant_2).lower()}!\n'
                                  f'Чтобы сменить работу вам нужно сначала уволится с текущей работы — `job leave`')
        names = {jobs[x].name.lower(): x for x in jobs}
        if job.lower() not in names:
            return await ctx.send(f':warning: Неизвестная работа')
        job_name = names[job.lower()]
        job = jobs[job_name]
        await ctx.send(f'{job}')        

def setup(bot: Bot):
    bot.add_cog(Economy(bot))