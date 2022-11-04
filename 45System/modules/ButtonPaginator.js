const { MessageButton, MessageActionRow } = require('discord-buttons');

module.exports = class ButtonPaginator {
    constructor(ctx) {
        this.ctx = ctx;
        this.msg = null;
        this.currentPage = 0;
        this.pages = [];
        this.components = [
            new MessageActionRow()
                .addComponent(new MessageButton({label: '\u200b', id: 'backward', style: 'blurple'})
                                .setEmoji('849896610833498112'))
                .addComponent(new MessageButton({label: '\u200b', id: 'forward', style: 'blurple'})
                                .setEmoji('849896610997207040'))
        ];
    }

    addPage (embed) {
        this.pages.push(embed);
    }

    async sendMenu () {
        this.msg = await this.ctx.send({
            embed: this.pages[this.currentPage],
            components: this.components
        });

        const filter = (e) => e.clicker.user.id === this.ctx.author.id;
        const collector = this.msg.createButtonCollector(filter, { time: 60*1000 });

        collector.on('collect', async (e) => {
            e.defer();

            if (e.id == 'backward') this.currentPage--;
            else if (e.id == 'forward') this.currentPage++;

            if (this.currentPage < 0) this.currentPage = this.pages.length-1;
            if (this.currentPage >= this.pages.length) this.currentPage = 0;

            await this.msg.edit({
                embed: this.pages[this.currentPage],
                components: this.components
            });
        });
    }
}