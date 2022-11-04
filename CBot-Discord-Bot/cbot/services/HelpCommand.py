import discord
from discord.ext import commands
from cbot.services.Emojis import GetEmoji

class HelpCommand:
    ''''Class that will be used for `help` command'''
    def __init__(self, ctx: commands.Context):
        self.ctx = ctx
        self.bot = ctx.bot
        self.l10n = self.ctx.l10n
    
    @property
    def base_embed(self):
        return discord.Embed(color=self.bot.colour).set_author(name=self.bot.user.name, icon_url=self.bot.user.avatar_url)

    async def IsExecutable(self, function):
        try:
            c = function(self.ctx)
            if type(c).__name__ == 'coroutine':
                c = await c
        except:
            return False
        return c

    async def GetRunnableCategories(self) -> list:
        categories = []
        for cog in self.bot.cogs.values():
            if not await self.IsExecutable(cog.cog_check):
                continue
            s = False
            for command in cog.get_commands():
                if not command.hidden and await self.IsExecutable(command.can_run):
                    s = True
                    break
            if s:
                categories.append(cog)
        
        return categories

    async def GetCategoryHelp(self, category) -> discord.Embed:
        embed = self.base_embed
        embed.title = category.__class__.__name__
        embed.description = ', '.join([f'``{x}``' for x in category.get_commands() if not x.hidden and await self.IsExecutable(x.can_run)])
        embed.set_footer(text=self.l10n('help.tips.0', prefix=self.ctx.prefix))
        return embed

    async def GetCommandHelp(self, command) -> discord.Embed:
        embed = self.base_embed
        cname = command.qualified_name
        embed.title = f'{cname} {command.signature}'
        embed.description = self.l10n(f'commands.{cname}.description', return_none=True) or self.l10n('help.no_description')
        if usage := self.l10n(f'commands.{cname}.usage', return_none=True):
            embed.add_field(name=self.l10n('help.command.usage'), value='\n'.join(f'• {x}' for x in usage), inline=False)
        if examples := self.l10n(f'commands.{cname}.examples', return_none=True):
            embed.add_field(name=self.l10n('help.command.usage'), value='\n'.join(f'• {x}' for x in examples), inline=False)
        if hasattr(command, 'commands'):
            commands = [x for x in command.commands if not x.hidden and await self.IsExecutable(x.can_run)]
            if commands:
                embed.add_field(name=self.l10n('help.command.subcommands'), value=', '.join(f'``{x}``' for x in commands), inline=False)
        return embed

    async def GetCategoryList(self) -> discord.Embed:
        embed = self.base_embed
        embed.title = self.l10n('help.categories.title')
        embed.description = self.l10n('help.categories.description')
        embed.add_field(name=self.l10n('help.categories.categories'), value=', '.join(f'``{x.__class__.__name__}``' for x in await self.GetRunnableCategories()))
        return embed
    

    async def execute(self, command=None):
        if not command:
            await self.ctx.send(embed=await self.GetCategoryList())
        
        else:
            categories = await self.GetRunnableCategories()
            categories = [x for x in categories if command.lower() in x.__class__.__name__.lower()]
            if command := self.bot.get_command(command.lower()):
                await self.ctx.send(embed=await self.GetCommandHelp(command))
            elif categories:
                await self.ctx.send(embed=await self.GetCategoryHelp(categories[0]))
            else:
                await self.ctx.send(self.l10n('help.unknown_command_or_category'))