import emoji

def GetEmoji(name):
    return emoji.emojize(f':{name}:', use_aliases=True)