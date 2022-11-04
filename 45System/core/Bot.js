const Discord = require('discord.js');
const ButtonClient = require('discord-buttons');
const { CommandHandler } = require('./CommandHandler');
const { Database } = require('./Database');
const { Localizator } = require('./Locales');

module.exports = class Bot extends Discord.Client {
    constructor(options) {
        super(options);
        this.config = options.config;

        this.buttonClient = ButtonClient(this);
        this.handler = new CommandHandler(this);
        this.db = new Database(this.config.connection_uri);
        this.locale = new Localizator('locale');

        this.startedAt = Date.now();
        
        this.isBusy = [];
        this.energy = {};
    }
    useEnergy (user_id, amount) {
        amount = Math.abs(Math.floor(Math.random()*((amount+10) - (amount-10))+(amount-10)));
        if (!this.energy[user_id])
            this.energy[user_id] = 100;
        this.energy[user_id] = Math.abs(this.energy[user_id] - amount);

        setTimeout(() => {
            this.energy[user_id] += amount;
            if (this.energy[user_id] > 100) this.energy[user_id] = 100;
        }, Math.floor(Math.random()*3600)*1000);
    }
    getEnergy (user_id) {
        return this.energy[user_id] || 100
    }
    addBusy (user_id, expires) {
        this.isBusy.push(user_id);
        setTimeout(() => this.removeBusy(user_id), expires*1000);
    }
    removeBusy (user_id) {
        if (this.isBusy.includes(user_id))
            this.isBusy.splice(this.isBusy.indexOf(user_id), 1)
    }
    async setCooldown (name, user_id, cooldown) {
        await this.db.query("INSERT INTO cooldown VALUES ($1, $2, $3) ON CONFLICT (name, user_id) DO UPDATE SET ends_at = EXCLUDED.ends_at", [name, user_id, Date.now() + cooldown * 1000]);
    }
    async checkCooldown (name, user_id) {
        const cd = await this.db.query("SELECT * FROM cooldown WHERE name = $1 AND user_id = $2", [name, user_id]);
        if (!cd || parseInt(cd.ends_at) < Date.now())
            return null;
        return parseInt(cd.ends_at) - Date.now();
    }
}