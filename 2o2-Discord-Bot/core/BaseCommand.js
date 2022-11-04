const discord = require('discord.js');
const { glob } = require('glob');

/**
 * @typedef {{
 *    client: import('./Client'),
 *    subcommands?: string[]
 * }} BaseCommandData
 *  
 * @typedef {discord.ApplicationCommandData & BaseCommandData} CommandData
 * @typedef {discord.ButtonInteraction | discord.SelectMenuInteraction | discord.ModalSubmitInteraction | discord.AutocompleteInteraction} ComponentInteraction
 */

module.exports = class BaseCommand {
    /**
     * @param {CommandData} data
     */
    constructor (data) {
        this.client = data.client;
        this.data = data;

        /**
         * @readonly
         * @type {string}
         */
        this.name = data.name;
        
        /**
         * @readonly
         * @type {string | null}
         */
        this.description = data.description;
        
        /**
         * @readonly
         * @type {discord.ApplicationCommandType}
         */
        this.type = data.type || 'CHAT_INPUT';
        
        /**
         * @readonly
         * @type {discord.ApplicationCommandOption[]}
         */
        this.options = data.options || [];

        this.$subcommands = new discord.Collection();
        this.$subcommandGroups = new discord.Collection();

        if (data.subcommands)
            data.subcommands.forEach(x => this.addSubcommands(x));
    }
    
    addSubcommands (pattern) {
        glob(pattern, (err, m) => {
            if (err) throw new Error(err);

            for (let f of m)
                this.addSubcommand(f);
        })
    }

    addSubcommand (path) {
        const command = path instanceof BaseCommand ? path : this.client.$internal.importCommand(path);
        if (command.$subcommands.size > 0 || command.options.find(x => x.type == 'SUB_COMMAND'))
            return this.addSubcommandGroup(command);
        
        if (!this.data.options) this.data.options = [];
            
        this.$subcommands.set(command.name, command);
        this.data.options.push({
            name: command.name,
            description: command.description,
            type: 'SUB_COMMAND',
            options: command.options
        });

        return true;
    }

    addSubcommandGroup(path) {
        const command = path instanceof BaseCommand ? path : this.client.$internal.importCommand(path);
        if (command.$subcommandGroups.size > 0 || command.options.find(x => x.type == 'SUB_COMMAND_GROUP'))
            return false;
        
        if (!this.data.options) this.data.options = [];

        this.$subcommandGroups.set(command.name, command);
        this.data.options.push({
            name: command.name,
            description: command.description,
            type: 'SUB_COMMAND_GROUP',
            options: command.options
        });

        return true;
    }

    /**
     * 
     * @param {ComponentInteraction} interaction 
     * @param {string[][]?} args
     */
    async $processComponent(interaction, args) {
        if (interaction.isAutocomplete()) {
            if (this.$subcommandGroups.has(interaction.options.getSubcommandGroup(false)))
                return this.$subcommandGroups.get(interaction.options.getSubcommandGroup()).$subcommands.get(interaction.options.getSubcommand()).component(interaction);
            else if (this.$subcommands.has(interaction.options.getSubcommand(false)))
                return this.$subcommands.get(interaction.options.getSubcommand()).component(interaction);
            
            return this.component(interaction);
        } else if (args.length == 1) {
            [
                this,
                ...this.$subcommands.map(x => x),
                ...this.$subcommandGroups.map(x => x.$subcommands.map(y => y)).flat(),
            ].filter(x => x.component)
             .map(x => x.component(interaction, args[0]));

            return;
        }

        // this.cutocomplete(interaction);
    }

    // /**
    //  * 
    //  * @param {ComponentInteraction} interaction 
    //  * @param {string[]} args
    //  */
    // async component(interaction, args) { }

    /**
     * 
     * @param {discord.CommandInteraction} interaction 
     * @returns {Promise<boolean>}
     */
    async canRun(interaction) {
        return true;
    }

    /**
     * 
     * @param {discord.CommandInteraction} interaction 
     * @returns {Promise<boolean>}
     */
    async $prerun(interaction) {
        if (this.$subcommandGroups.has(interaction.options.getSubcommandGroup(false))) {
            this.$subcommandGroups.get(interaction.options.getSubcommandGroup(false)).$exec(interaction);
            return false;
        }
        if (this.$subcommands.has(interaction.options.getSubcommand(false))) {
            this.$subcommands.get(interaction.options.getSubcommand(false)).$exec(interaction);
            return false;
        }
        return true;
    }

    /**
     * 
     * @param {discord.CommandInteraction} i 
     */
    async $exec(i, ...args) {
        if (await this.canRun(i, ...args) && await this.$prerun(i, ...args))
            return await this.run(i, ...args)
    }

    /**
     * 
     * @param {discord.CommandInteraction} interaction 
     */
    async run(interaction) {
        
    }
}