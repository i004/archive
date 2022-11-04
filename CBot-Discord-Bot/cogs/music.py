import asyncio
import async_timeout
import copy
import datetime
import discord
import math
import random
import re
import typing
import wavelink

from discord.ext import commands, menus
from cbot.services import Paginator

URL_REG = re.compile(r'https?://(?:www\.)?.+')


class NoChannelProvided(commands.CommandError):
    pass


class IncorrectChannelError(commands.CommandError):
    pass


class Track(wavelink.Track):
    __slots__ = ('requester', )

    def __init__(self, *args, **kwargs):
        super().__init__(*args)
        self.requester = kwargs.get('requester')

class Player(wavelink.Player):
    def __init__(self, *args, **kwargs):
        super().__init__(*args, **kwargs)

        self.context: commands.Context = kwargs.get('context', None)
        if self.context:
            self.dj: discord.Member = self.context.author

        self.queue = asyncio.Queue()
        self.controller = None

        self.waiting = False
        self.updating = False

        self.pause_votes = set()
        self.resume_votes = set()
        self.skip_votes = set()
        self.shuffle_votes = set()
        self.stop_votes = set()

    async def do_next(self) -> None:
        if self.is_playing or self.waiting:
            return

        self.pause_votes.clear()
        self.resume_votes.clear()
        self.skip_votes.clear()
        self.shuffle_votes.clear()
        self.stop_votes.clear()

        try:
            self.waiting = True
            with async_timeout.timeout(20):
                track = await self.queue.get()
        except asyncio.TimeoutError:
            return await self.teardown()

        await self.play(track)
        self.waiting = False

        await self.context.send(self.context.l10n('music.playing', self.current, str(datetime.timedelta(milliseconds=int(self.current.length)))))

    def build_embed(self) -> typing.Optional[discord.Embed]:
        track = self.current
        if not track:
            return

        channel = self.bot.get_channel(int(self.channel_id))
        qsize = self.queue.qsize()

        embed = discord.Embed(title=str(track), colour=self.context.bot.colour)
        embed.set_thumbnail(url=track.thumb)

        embed.add_field(name=self.context.l10n('music.np.length'), value=str(datetime.timedelta(milliseconds=int(track.length))))
        embed.add_field(name=self.context.l10n('music.np.queue_size'), value=str(qsize))
        embed.add_field(name=self.context.l10n('music.np.volume'), value=f'**`{self.volume}%`**')
        embed.add_field(name=self.context.l10n('music.np.requester'), value=track.requester.mention)
        embed.add_field(name='DJ', value=self.dj.mention)
        embed.add_field(name='Video URL', value=f'{track.uri}')

        return embed

    async def teardown(self):
        try:
            await self.destroy()
        except KeyError:
            pass


class PaginatorSource(menus.ListPageSource):
    def __init__(self, entries, *, per_page=8):
        super().__init__(entries, per_page=per_page)

    async def format_page(self, menu: menus.Menu, page):
        embed = discord.Embed()
        embed.description = '\n'.join(f'**{index}:** [{track}]({track.uri})' for index, track in enumerate(page, 1))

        return embed

    def is_paginating(self):
        # We always want to embed even on 1 page of results...
        return True

class Music(commands.Cog, wavelink.WavelinkMixin):
    def __init__(self, bot: commands.Bot):
        self.bot = bot

        if not hasattr(bot, 'wavelink'):
            bot.wavelink = wavelink.Client(bot=bot)

        bot.loop.create_task(self.start_nodes())

    async def start_nodes(self) -> None:
        """Connect and intiate nodes."""
        await self.bot.wait_until_ready()

        if self.bot.wavelink.nodes:
            previous = self.bot.wavelink.nodes.copy()

            for node in previous.values():
                await node.destroy()

        nodes = {'MAIN': {'host': '127.0.0.1',
                          'port': 2333,
                          'rest_uri': 'http://127.0.0.1:2333',
                          'password': 'LavalinkWasMadeUsingJava',
                          'identifier': 'MAIN',
                          'region': 'us_central'
                          }}

        for n in nodes.values():
            await self.bot.wavelink.initiate_node(**n)

    @wavelink.WavelinkMixin.listener('on_track_stuck')
    @wavelink.WavelinkMixin.listener('on_track_end')
    @wavelink.WavelinkMixin.listener('on_track_exception')
    async def on_player_stop(self, node: wavelink.Node, payload):
        await payload.player.do_next()

    @commands.Cog.listener()
    async def on_voice_state_update(self, member: discord.Member, before: discord.VoiceState, after: discord.VoiceState):
        if member.bot:
            return

        player: Player = self.bot.wavelink.get_player(member.guild.id, cls=Player)

        if not player.channel_id or not player.context:
            player.node.players.pop(member.guild.id)
            return

        channel = self.bot.get_channel(int(player.channel_id))

        if member == player.dj and after.channel is None:
            for m in channel.members:
                if m.bot:
                    continue
                else:
                    player.dj = m
                    return
            await player.destroy()

        elif after.channel == channel and player.dj not in channel.members:
            player.dj = member

    async def cog_before_invoke(self, ctx: commands.Context):
        player: Player = self.bot.wavelink.get_player(ctx.guild.id, cls=Player, context=ctx)

        if player.context:
            if player.context.channel != ctx.channel:
                await ctx.send(ctx.l10n('music.wrong_text_channel', ctx.author.mention, player.context.channel.mention))
                raise IncorrectChannelError

        if ctx.command.name == 'connect' and not player.context:
            return
        elif self.is_privileged(ctx):
            return

        if not player.channel_id:
            return

        channel = self.bot.get_channel(int(player.channel_id))
        if not channel:
            return

        if player.is_connected:
            if ctx.author not in channel.members:
                await ctx.send(ctx.l10n('music.wrong_voice_channel', ctx.author.mention, channel.name))
                raise IncorrectChannelError()

    def required(self, ctx: commands.Context):
        player: Player = self.bot.wavelink.get_player(guild_id=ctx.guild.id, cls=Player, context=ctx)
        channel = self.bot.get_channel(int(player.channel_id))
        required = math.ceil((len(channel.members) - 1) / 2.5)

        if ctx.command.name == 'stop':
            if len(channel.members) - 1 == 2:
                required = 2

        return required

    def is_privileged(self, ctx: commands.Context):
        player: Player = self.bot.wavelink.get_player(guild_id=ctx.guild.id, cls=Player, context=ctx)

        return player.dj == ctx.author or ctx.author.guild_permissions.kick_members

    @commands.command()
    async def connect(self, ctx: commands.Context, *, channel: discord.VoiceChannel = None):
        player: Player = self.bot.wavelink.get_player(guild_id=ctx.guild.id, cls=Player, context=ctx)

        if player.is_connected:
            return

        channel = getattr(ctx.author.voice, 'channel', channel)
        if channel is None:
            raise NoChannelProvided

        await player.connect(channel.id)

    @commands.command(aliases=['p'])
    async def play(self, ctx: commands.Context, *, query: str):
        player: Player = self.bot.wavelink.get_player(guild_id=ctx.guild.id, cls=Player, context=ctx)

        query = query.strip('<>')
        if not URL_REG.match(query):
            query = f'ytsearch:{query}'

        tracks = await self.bot.wavelink.get_tracks(query)
        if not tracks:
            return await ctx.send(ctx.l10n('music.nothing_found'))

        if not player.is_connected:
            await ctx.invoke(self.connect)

        if isinstance(tracks, wavelink.TrackPlaylist):
            for track in tracks.tracks:
                track = Track(track.id, track.info, requester=ctx.author)
                await player.queue.put(track)

            await ctx.send(ctx.l10n('music.playlist_loaded', tracks.data["playlistInfo"]["name"], len(tracks.tracks)))
        else:
            track = Track(tracks[0].id, tracks[0].info, requester=ctx.author)
            await ctx.send(ctx.l10n('music.song_added', str(track)))
            await player.queue.put(track)

        if not player.is_playing:
            await player.do_next()

    @commands.command()
    async def pause(self, ctx: commands.Context):
        player: Player = self.bot.wavelink.get_player(guild_id=ctx.guild.id, cls=Player, context=ctx)

        if player.is_paused or not player.is_connected:
            return

        if self.is_privileged(ctx):
            await ctx.send(ctx.l10n('music.pause.paused'))
            player.pause_votes.clear()

            return await player.set_pause(True)

        required = self.required(ctx)
        player.pause_votes.add(ctx.author)

        if len(player.pause_votes) >= required:
            await ctx.send(ctx.l10n('music.pause.vote_passed'))
            player.pause_votes.clear()
            await player.set_pause(True)
        else:
            await ctx.send(ctx.l10n('music.pause.voted', str(ctx.author), len(player.pause_votes), required))

    @commands.command()
    async def resume(self, ctx: commands.Context):
        player: Player = self.bot.wavelink.get_player(guild_id=ctx.guild.id, cls=Player, context=ctx)

        if not player.is_paused or not player.is_connected:
            return

        if self.is_privileged(ctx):
            await ctx.send(ctx.l10n('music.resume.resumed'))
            player.resume_votes.clear()

            return await player.set_pause(False)

        required = self.required(ctx)
        player.resume_votes.add(ctx.author)

        if len(player.resume_votes) >= required:
            await ctx.send(ctx.l10n('music.resume.vote_passed'))
            player.resume_votes.clear()
            await player.set_pause(False)
        else:
            await ctx.send(ctx.l10n('music.resume.voted', str(ctx.author), len(player.resume_votes), required))

    @commands.command(aliases=['s'])
    async def skip(self, ctx: commands.Context):
        player: Player = self.bot.wavelink.get_player(guild_id=ctx.guild.id, cls=Player, context=ctx)

        if not player.is_connected:
            return

        if self.is_privileged(ctx):
            await ctx.send(ctx.l10n('music.skip.skipped'))
            player.skip_votes.clear()

            return await player.stop()

        if ctx.author == player.current.requester:
            await ctx.send(ctx.l10n('music.skip.skipped'))
            player.skip_votes.clear()

            return await player.stop()

        required = self.required(ctx)
        player.skip_votes.add(ctx.author)

        if len(player.skip_votes) >= required:
            await ctx.send(ctx.l10n('music.skip.vote_passed'))
            player.skip_votes.clear()
            await player.stop()
        else:
            await ctx.send(ctx.l10n('music.skip.voted', str(ctx.author), len(player.skip_votes), required))

    @commands.command(aliases=['quit', 'disconnect'])
    async def stop(self, ctx: commands.Context):
        player: Player = self.bot.wavelink.get_player(guild_id=ctx.guild.id, cls=Player, context=ctx)

        if not player.is_connected:
            return

        if self.is_privileged(ctx):
            await ctx.send(ctx.l10n('music.stopped'))
            return await player.teardown()

        await ctx.send(ctx.l10n('music.dj_only'))

    @commands.command(aliases=['v', 'vol'])
    async def volume(self, ctx: commands.Context, *, vol: int):
        player: Player = self.bot.wavelink.get_player(guild_id=ctx.guild.id, cls=Player, context=ctx)

        if not player.is_connected:
            return

        if not self.is_privileged(ctx):
            return await ctx.send(ctx.l10n('music.dj_only'))

        vol = min(max(vol, 0), 100)
        await player.set_volume(vol)
        await ctx.send(ctx.l10n('music.volume_changed', vol))

    @commands.command(aliases=['mix'])
    async def shuffle(self, ctx: commands.Context):
        player: Player = self.bot.wavelink.get_player(guild_id=ctx.guild.id, cls=Player, context=ctx)

        if not player.is_connected:
            return

        if self.is_privileged(ctx):
            await ctx.send(ctx.l10n('music.queue_shuffled'))
            player.shuffle_votes.clear()
            return random.shuffle(player.queue._queue)
        
        await ctx.send(ctx.l10n('music.dj_only'))

    # @commands.command(aliases=['eq'])
    # async def equalizer(self, ctx: commands.Context, *, equalizer: str = None):
    #     """Сменить эквалайзер"""
    #     player: Player = self.bot.wavelink.get_player(guild_id=ctx.guild.id, cls=Player, context=ctx)

    #     if not player.is_connected:
    #         return

    #     if not self.is_privileged(ctx):
    #         return await ctx.send(ctx.l10n('music.dj_only'))

    #     eqs = {'flat': wavelink.Equalizer.flat(),
    #            'boost': wavelink.Equalizer.boost(),
    #            'metal': wavelink.Equalizer.metal(),
    #            'piano': wavelink.Equalizer.piano()}

    #     eq = eqs.get(str(equalizer).lower(), None)

    #     if not eq:
    #         equalizers = []
    #         for eq in eqs:
    #             equalizers.append(f'• {eq}' + (' (текущий)' if eqs[eq].name == player.equalizer.name else ''))
    #         equalizers = '\n'.join(equalizers)
    #         return await ctx.send(f'Вы указали неверный эквалайзер. Доступные эквалайзеры:\n{equalizers}')

    #     await ctx.send(f'Эквалайзер сменён на {equalizer} :ok_hand:')
    #     await player.set_eq(eq)

    @commands.command(aliases=['q', 'que'])
    async def queue(self, ctx: commands.Context):
        player: Player = self.bot.wavelink.get_player(guild_id=ctx.guild.id, cls=Player, context=ctx)

        if not player.is_connected:
            return

        if player.queue.qsize() == 0:
            return await ctx.send(ctx.l10n('music.queue_is_empty'))

        queue = list(player.queue._queue)
        pages = [queue[i:i+8] for i in range(0, len(queue), 8)]
        paginator = Paginator(self.bot, ctx.author)
        for page in pages:
            paginator.pages.append(discord.Embed(title=ctx.l10n('music.queue'), description='\n'.join(f'**{i+1}** › [{track}]({track.uri})' for i, track in enumerate(page))))

        await paginator.send_controller(ctx)

    @commands.command(aliases=['np', 'now_playing', 'current'])
    async def nowplaying(self, ctx: commands.Context):
        player: Player = self.bot.wavelink.get_player(guild_id=ctx.guild.id, cls=Player, context=ctx)

        if not player.is_connected:
            return

        await ctx.send(embed=player.build_embed())

def setup(bot: commands.Bot):
    bot.add_cog(Music(bot))