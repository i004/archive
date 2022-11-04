const discord = require('discord.js');
const BaseCommand = require('../core/BaseCommand');
const { createCanvas, loadImage, registerFont } = require('canvas');

registerFont('assets/font/impact.ttf', { family: 'Impact' });

module.exports = class Coincidence extends BaseCommand {
    constructor (client) {
        super({
            client,
            name: 'coincidence',
            description: 'Coincidence?',
            descriptionLocalizations: { ru: 'Совпадение?' },
            options: [{
                name: 'label',
                type: 'STRING',
                description: 'Label',
                descriptionLocalizations: { ru: 'Подпись', uk: 'Підпис' },
                required: true
            }]
        });
    }

    /**
     * 
     * @param {discord.CommandInteraction} i 
     */
    async run (i) {
        const canvas = createCanvas(712, 848);
        const ctx = canvas.getContext('2d');

        ctx.drawImage(await loadImage('assets/template/coincidence.png'), 0, 0, 712, 848);
        
        ctx.fillStyle = '#fff';
        ctx.font = '40px "Impact"';
        ctx.textAlign = 'right';

        ctx.fillText(i.options.getString('label'), 708, 41);

        await i.reply({ files: [{
            attachment: canvas.toBuffer(),
            name: `coincidence-${i.user.id}-${Date.now()}.png`
        }] })
    }
}