const { MessageActionRow } = require('discord-buttons');

module.exports = class ButtonMenu {
    constructor(ctx) {
        this.ctx = ctx;
        this.msg = null;
        this.currentPage = '0';
        this.pages = {};
        this.buttons = [];
        this.btnRef = {};
    }

    newRow () {
        this.buttons.push(new MessageActionRow());
    }

    addPage (button, embed) {
        if (this.buttons.length == 0)
            this.newRow()

        const pageId = Object.keys(this.pages).length.toString();
        
        button.setID(pageId);
        
        if (!embed)
            button.setDisabled(true);

        this.pages[pageId] = embed;
        this.buttons[this.buttons.length-1].addComponent(button);
        let ccount = this.buttons[this.buttons.length-1].components.length;
        this.btnRef[pageId] = this.buttons[this.buttons.length-1].components[ccount-1];
    }

    async onCollect (_) {}

    async sendMenu () {
        this.msg = await this.ctx.send({
            embed: this.pages[this.currentPage],
            components: this.buttons
        });

        const filter = (e) => e.clicker.user.id === this.ctx.author.id;
        const collector = this.msg.createButtonCollector(filter, { time: 60*1000 });

        collector.on('collect', async (e) => {
            e.defer();

            this.currentPage = e.id;
            await this.onCollect(e);
            
            await this.msg.edit({
                embed: this.pages[this.currentPage],
                components: this.buttons
            });
        });
    }
}