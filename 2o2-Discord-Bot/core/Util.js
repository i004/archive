const discord = require('discord.js');
const needle = require('needle');
const config = require('../config.json');

module.exports = class ClientUtils {
    /**
     * 
     * @param {import('./Client')} client 
     */
    constructor (client) {
        this.client = client;
        this.namespaceComponentCollectors = [];
        
        this.client.on('interactionCreate', async (i) => {
            if (i.isButton() || i.isSelectMenu() || i.isModalSubmit()) {
                const args = i.customId.split("::");
                const collector = this.namespaceComponentCollectors.find(x => x.namespace == args[0])

                if (collector)
                    collector.fn(args[1], i, args.slice(2));
            }
        })
    }

    /**
     * @type {import('../modules/ImageUtils')}
     */
    get image () {
        return this.client.module('ImageUtils');
    }

    counter(id) {
        const p = {
            get: async () => (await this.client.db.fetch("SELECT * FROM counters WHERE id=$1", [id]))?.value ?? 0,
            set: async (i) => await this.client.db.exec("INSERT INTO counters VALUES ($1, $2) ON CONFLICT(id) DO UPDATE SET value=EXCLUDED.value", [id, i]),
        }

        return {
            ...p,
            add: async (i) => await p.set(await p.get() + i),
            sub: async (i) => await p.set(await p.get() - i)
        }
    }

    /**
     * 
     * @callback namespaceComponentCollectorCallback
     * @param {string} x
     * @param {discord.ButtonInteraction | discord.SelectMenuInteraction | discord.ModalSubmitInteraction} interaction
     * @param {string[]} args
     */

    /**
     * 
     * @param {string} namespace 
     * @param {namespaceComponentCollectorCallback} fn 
     */
    namespaceComponentCollector (namespace, fn) {
        this.namespaceComponentCollectors.push({ namespace, fn });
    }

    /**
     * @param {number} channelId
     * @param {number} messageId
     * @returns {Promise<discord.Message?>}
     */
     async fetchMessage(channelId, messageId) {
        try {
            return await this.client.channels.cache.get(channelId).messages.fetch(messageId);
        } catch (err) {
            return null;
        }
    }

    /**
     * 
     * @param {discord.User} user 
     * @returns {Promise<number>}
     */
    async totalKarma(user) {
        const karma = await this.client.db.fetch("select * from karma where uid=$1", [user.id]);
        return ~~(karma ? karma.message + karma.reputation + karma.extra : 0);
    }

    findCluster () {
        const CLUSTERS = [
            '959122208507183109',
        ];

        return CLUSTERS.find(x => this.client.channels.cache.get(x).children.size < 50);
    }

    formatTime (ms, includeSeconds=false, formatOnly=null) {
        const daysFmt = {
            '0': 'дней', '1': 'день', '2': 'дня', '3': 'дня', '4': 'дня', '5': 'дней', '6': 'дней', '7': 'дней', '8': 'дней', '9': 'дней',
        };
        const hoursFmt = {
            '0': 'ов', '1': '', '2': 'а', '3': 'а', '4': 'а', '5': 'ов', '6': 'ов', '7': 'ов', '8': 'ов', '9': 'ов',
        };
        const minutesFmt = {
            '0': '', '1': 'а', '2': 'ы', '3': 'ы', '4': 'ы', '5': '', '6': '', '7': '', '8': '', '9': ''
        };
        const fmt = (n, o) => o[n.toString().slice(-1)[0]];

        const seconds = ~~((ms / 1000) % 60),
              minutes = ~~((ms / (1000 * 60)) % 60),
              hours = ~~((ms / (1000 * 60 * 60)) % 24),
              days = ~~(ms / (1000 * 60 * 60 * 24));
        
        if (formatOnly)
            return {
                days: `${days} ${fmt(days, daysFmt)}`,
                hours: `${hours} час${fmt(hours, hoursFmt)}`,
                minutes: `${minutes} минут${fmt(minutes, minutesFmt)}`,
                seconds: `${seconds} секунд${fmt(seconds, minutesFmt)}`,
            }[formatOnly];
        
        return [
            days ? `${days} ${fmt(days, daysFmt)}` : "",
            hours ? `${hours} час${fmt(hours, hoursFmt)}` : "",
            minutes ? `${minutes} минут${fmt(minutes, minutesFmt)}` : "",
            seconds && includeSeconds ? `${seconds} секунд${fmt(seconds, minutesFmt)}` : ""
        ].filter(x => x).join(' ').trim() || '0 минут';
    }

    /**
     * 
     * @param {string} cid 
     * @returns {Promise<{
     *  repost_from: boolean,
     *  repost_to: boolean
     * }>}
     */
    async ditterOptions (cid) {
        return (await this.client.db.fetch("select * from ditter_options where cid=$1", [cid])) ?? { repost_from: true, repost_to: true }
    }

    /**
     * 
     * @param {discord.CommandInteraction} i 
     */
    formatCommand (i) {
        return `${i.commandName}${i.options.getSubcommandGroup(false)?` ${i.options.getSubcommandGroup()}`:''}${i.options.getSubcommand(false)?` ${i.options.getSubcommand()}`:''}`
    }

    /**
     * 
     * @param {discord.UserResolvable} user 
     * @param {'message' | 'reputation' | 'extra'} type 
     * @param {number} change 
     * @param {string?} reason
     * @param {string?} rId
     * @param {boolean?} log
     */
    async changeKarma (user, type, change, reason=null, rId=null, log=true) {
        const uid = this.client.users.resolveId(user);
        const oldKarma = (await this.client.db.fetch("select * from karma where uid=$1", [uid])) ?? { message: 0, reputation: 0, extra: 0 };

        await this.client.db.exec("insert into karma values ($1, $2, $3, $4) on conflict (uid) do update set message=karma.message+excluded.message, reputation=karma.reputation+excluded.reputation, extra=karma.extra+excluded.extra", [
            uid,
            type == 'message' ? change : 0,
            type == 'reputation' ? change : 0,
            type == 'extra' ? change : 0,
        ])

        if (log)
            await this.client.db.exec("insert into karma_change values (default, $1, $2, $3, $4, $5, $6, $7)", [uid, type, oldKarma[type], change, Date.now(), reason, rId]);
    }
    
    log (message, extra=null) {
        this.client.channels.cache.get('968607151851466812').send({ content: message, files: extra ? [{ name: 'extra.js', attachment: Buffer.from(extra) }] : [], allowedMentions: { parse: [] } }).catch(() => {});
    }

    /**
     * 
     * @param {discord.UserResolvable} user 
     */
    async fetchUserProfile (user) {
        const uid = this.client.users.resolveId(user);
        await this.client.users.fetch(uid, { cache: true, force: false });

        if (!this.client.users.cache.get(uid).$profile)
            this.client.users.cache.get(uid).$profile = (await needle(
                'get', `https://discord.com/api/v9/users/${uid}/profile?with_mutual_guilds=true&guild_id=${config.guildId}`,
                {
                    headers: { Authorization: config.tokens._s }
                }
            )).body;
        
        return this.client.users.cache.get(uid).$profile;        
    }

    /**
     * 
     * @param {string} id 
     */
    cooldown (id) {
        const $get = async () => (await this.client.db.fetch("select * from cooldown where id=$1", [id]))?.timestamp ?? 0;

        return {
            active: async () => (await $get()) > Date.now(),
            duration: async () => ~~((await $get()) / 1000),
            set: async (ms) => await this.client.db.exec("insert into cooldown values ($1, $2) on conflict (id) do update set timestamp=excluded.timestamp", [id, Date.now() + ms]),
            add: async (ms) => await this.client.db.exec("insert into cooldown values ($1, $2) on conflict (id) do update set timestamp=cooldown.timestamp+excluded.timestamp", [id, ms]),
        };
    }
}