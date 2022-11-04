const discord = require('discord.js');
const glob = require('glob');
const BaseCommand = require('./BaseCommand');
const Database = require('./Database');
const ClientUtils = require('./Util');
const { parse: parsePath } = require('path');
const Internal = require('./Internal');

module.exports = class Client extends discord.Client {
    /**
     * 
     * @param {discord.ClientOptions} opt 
     */
    constructor (opt) {
        super(opt);

        /**
         * @type {discord.Collection<string, BaseCommand>}
         */
        this.commands = new discord.Collection();
        this.modules = new discord.Collection();

        this.db = new Database();
        this.db.setup();
        
        this.$ = new ClientUtils(this);
        this.$internal = new Internal(this);

        this.on('interactionCreate', async (i) => {
            if ((i.isCommand() || i.isContextMenu()) && this.command(i.commandName, i.command?.type ?? 'ANY')) {
                const command = this.command(i.commandName, i.command?.type ?? 'ANY');

                await command.$exec(i);
            } else if ((i.isButton() || i.isSelectMenu() || i.isModalSubmit())) {
                const arrow = i.customId.split("->"); // command->arg1::arg2::arg3::...

                if (this.command(arrow[0]))
                    this.command(arrow[0]).$processComponent(i, arrow.slice(1).map(x => x.split('::')));
            } else if (i.isAutocomplete() && this.command(i.commandName))
                this.command(i.commandName).$processComponent(i);
        });
    }

    module (name) {
        return this.modules.get(name);
    }

    command (name, type='ANY') {
        if (type == 'ANY')
            return this.commands.find(x => x.name == name);

        return this.commands.get(`${name}:${type}`) || this.commands.find(x => x.name == name && x.type == type);
    }

    waitUntilReady() {
        if (this.isReady()) return;
        return new Promise(res => {
            this.once('ready', res);
        })
    }

    registerGlobalCommands(path) {
        (async () => {
            const commands = await this.$internal.loadCommands(path);
            await this.waitUntilReady();
            await this.application.commands.set(commands.map(x => x.data));
            console.info(`Registered ${commands.length} global commands from ${parsePath(path).dir.gray}`);
        })();
        return this;
    }

    registerGuildCommands(guildId, path) {
        (async () => {
            const commands = await this.$internal.loadCommands(path);
            await this.waitUntilReady();
            await this.application.commands.set(commands.map(x => x.data), guildId);
            console.info(`Registered ${commands.length} commands from ${parsePath(path).dir.gray} for guild ${guildId}`);
        })();
        return this;
    }

    loadModules(path) {
        glob(path, (err, m) => {
            if (err) return console.error(err);
            let c = 0;

            m.forEach(f => {
                const req = require(require('path').join('../', f));
                if (!req || !req.constructor || req.disabled) return;

                const mod = new req(this);

                this.modules.set(req.name, mod);
                c++;
            });

            console.info(`Loaded ${c} modules from ${parsePath(path).dir.gray}`);
        })
        

        return this;
    }
}
