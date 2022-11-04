from discord.ext import commands

def usage(usage):
    def wrapper(ctx):
        if hasattr(ctx.command, 'usage') and type(ctx.command.usage) == list and usage not in ctx.command.usage:
            ctx.command.usage.append(usage)
        else:
            ctx.command.usage = [usage]
        return True
    return commands.check(wrapper)

def example(example):
    def wrapper(ctx):
        if hasattr(ctx.command, 'examples') and example not in ctx.command.examples:
            ctx.command.examples.append(example)
        else:
            ctx.command.examples = [example]
        return True
    return commands.check(wrapper)