from discord.ext import commands
from difflib import SequenceMatcher
import discord
from re import match
from cbot.core.Errors import IncorrectBalance, NumberErrors

class User(commands.Converter):
    '''Simple discord.ext.commands user converter'''
    def __init__(self, case_sensive=False, min_length_dividier=4, guild_only=False):
        self.case_sensive = case_sensive
        self.min_length_dividier = min_length_dividier
        self.guild_only = guild_only
    
    def match(self, one: str, two: str) -> bool:
        '''Match two nicknames'''
        return ((one.lower() in two.lower()) if self.case_sensive else (one in two)) and (len(one)+self.min_length_dividier > len(two)/self.min_length_dividier)

    def match_level(self, one: str, two: str) -> float:
        '''Match level between two nicknames (from 0.0 to 1.0)'''
        return SequenceMatcher(None, one, two).ratio()

    async def convert(self, ctx, user):
        if user.isnumeric() and int(user) >= 0 and int(user) <= 9223372036854775807:
            try:
                user = await ctx.bot.fetch_user(int(user))
                if self.guild_only and not ctx.guild.get_member(user.id):
                    user = ctx.guild.get_member(user.id)
                    if not user:
                        raise discord.errors.NotFound()
                return user
            except discord.errors.NotFound: # If user not found
                raise commands.UserInputError(f'Missing required argument `user`')
        else:
            if (mention := match(r'\<\@(\!)?\d+\>', user)):
                return await self.convert(ctx, ''.join(x for x in mention[0] if x.isnumeric()))

            users = {x: self.match_level(user, str(x)) for x in ctx.guild.members if self.match(user, str(x))}
            
            if len(users) == 0:
                raise commands.UserInputError(f'Missing required argument `user`')
            
            return sorted(users, key=lambda x: users[x], reverse=True)[0]

class Arguments:
    '''Argument converter'''
    def __init__(self, *raw_args):
        arguments = {"text": []}
        current_arg = [False, '']

        for arg in raw_args:
            if arg.startswith('--'):
                current_arg = [True, arg[2:]]
            elif arg.startswith('-') and len(arg) == 2:
                current_arg = [True, arg[1:]]
            elif current_arg[0]:
                arguments[current_arg[1]] = arg
                current_arg = [False, '']
            else:
                arguments['text'].append(arg)
        
        self.arguments = {x: ' '.join(arguments[x]) if type(arguments[x]) == list else arguments[x] for x in arguments}
    
    def get(self, key, default=None):
        return self.arguments.get(key, default)

class Balance(commands.Converter):
    '''Balance amount conveter'''
    def __init__(self, bal_type: 'balance' or 'bank'):
        self.type = bal_type
    
    async def convert(self, ctx: commands.Context, argument):
        data = await ctx.bot.db.query('SELECT * FROM balance WHERE guild_id=$1 AND user_id=$2', [ctx.guild.id, ctx.author.id])
        if not data:
            raise IncorrectBalance()
        bal = data[self.type]

        if argument.endswith('%'):
            percent = argument[:len(argument)-1]
            if not percent.isnumeric():
                raise IncorrectBalance(ctx.l10n('errors.incorrect_balance.incorrect_argument'))
            percent = int(percent)
            if percent < 1 or percent > 100:
                raise IncorrectBalance(ctx.l10n('errors.incorrect_balance.incorrect_percent'))
            coins = round(bal * (percent/100))
            if coins > bal:
                raise IncorrectBalance(ctx.l10n('errors.incorrect_balance.not_enough_money'))
            if coins < 1:
                raise IncorrectBalance(ctx.l10n('errors.incorrect_balance.incorrect_amount'))
            return coins
        
        elif argument.isnumeric():
            coins = int(argument)
            if coins > bal:
                raise IncorrectBalance(ctx.l10n('errors.incorrect_balance.not_enough_money'))
            if coins < 1:
                raise IncorrectBalance(ctx.l10n('errors.incorrect_balance.incorrect_amount'))
            return coins
        
        elif argument in ('all', '*'):
            return bal
        
        else:
            raise IncorrectBalance(ctx.l10n('errors.incorrect_balance.help'))

class Number(commands.Converter):
    '''Number converter'''
    def __init__(self, min=None, max=None):
        self.min = min
        self.max = max

    def parse_number(self, number):
        if [x for x in number if x not in '-1234567890.']:
            raise commands.UserInputError()
        try:
            number = float(number)
            return int(number) if int(number) == number else number
        except:
            raise commands.UserInputError()

    def parse_ending(self, number, multiplier=1):
        mul = {
            'k': 1000,
            'm': 1000000,
            'b': 1000000000,
            't': 1000000000000
        }
        if number[-1] in mul:
            multiplier = multiplier * mul[number[-1]]
            return self.parse_ending(number[:len(number)-1], multiplier)
        else:
            return number, multiplier

    async def convert(self, ctx: commands.Context, number):
        parsed = self.parse_ending(number)
        number = self.parse_number(parsed[0])*parsed[1]
        if self.max and self.min and (number > self.max or number < self.min):
            raise NumberErrors.NotInRange(self.min, self.max)
        if self.max and number > self.max:
            raise NumberErrors.BiggerThan(self.max)
        if self.min and number < self.min:
            raise NumberErrors.LowerThan(self.min)
        return number