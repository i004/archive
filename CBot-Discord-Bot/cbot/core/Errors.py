from discord.ext import commands

class IncorrectBalance(commands.CheckFailure):
    pass

class WavelinkNotConnected(commands.CheckFailure):
    pass

class ClosedBeta(Exception):
    pass

class UserIsBlacklisted(commands.CheckFailure):
    pass

class NumberErrors:
    class BiggerThan(Exception):
        def __init__(self, number):
            super().__init__()
            self.number = number
    class LowerThan(Exception):
        def __init__(self, number):
            super().__init__()
            self.number = number
    class NotInRange(Exception):
        def __init__(self, min, max):
            super().__init__()
            self.min = min
            self.max = max