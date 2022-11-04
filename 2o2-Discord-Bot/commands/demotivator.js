const discord = require('discord.js');
const BaseCommand = require('../core/BaseCommand');
const { createCanvas, loadImage, registerFont } = require('canvas');

registerFont('assets/font/times.ttf', { family: 'Times New Roman' });

function getLines(ctx, text, maxWidth) {
    const words = text.split(/\s+/g);
    const lines = [];
    let currentLine = words[0];

    for (let i = 1; i < words.length; i++) {
        const word = words[i];
        const width = ctx.measureText(`${currentLine} ${word}`).width;
        if (width < maxWidth) currentLine += " " + word;
        else {
            lines.push(currentLine);
            currentLine = word;
        }
    }

    lines.push(currentLine);
    return lines;
}

function fillText (ctx, text, x, y, fontSize, maxWidth) {
    const lines = getLines(ctx, text, maxWidth);

    for (let i = 0; i < lines.length; i++)
        ctx.fillText(lines[i], x, y + i*fontSize);
}

module.exports = class Uncanny extends BaseCommand {
    constructor (client) {
        super({
            client,
            name: 'demotivator',
            description: 'Demotivator',
            descriptionLocalizations: { ru: 'Демотиватор', uk: 'Демотиватор' },
            options: [
                {
                    name: 'image',
                    type: 'ATTACHMENT',
                    description: 'Image',
                    descriptionLocalizations: { ru: 'Изображение', uk: 'Зображення' },
                    required: true
                },
                {
                    name: 'label',
                    type: 'STRING',
                    description: 'Label',
                    descriptionLocalizations: { ru: 'Подпись', uk: 'Підпис' },
                    required: true
                }
            ]
        });
    }

    /**
     * 
     * @param {discord.CommandInteraction} i 
     */
    async run (i) {
        const image = i.options.getAttachment('image');
        const text = i.options.getString('label');

        const canvas = createCanvas(image.width + 100, image.height + 200);
        const ctx = canvas.getContext('2d');

        ctx.fillStyle = '#000';
        ctx.fillRect(0, 0, canvas.width, canvas.height);

        ctx.strokeStyle = '#fff';
        ctx.strokeRect(46, 36, image.width+9, image.height+9);
        ctx.strokeRect(45, 35, image.width+12, image.height+12);
        ctx.strokeRect(44, 34, image.width+13, image.height+13);

        ctx.drawImage(await loadImage(image.attachment), 50, 40, image.width, image.height);
        
        ctx.fillStyle = '#fff';
        ctx.font = '40px "Times New Roman"';
        ctx.textAlign = 'center';

        fillText(ctx, text, canvas.width/2, image.height + 110, 40, canvas.width/1.25)

        await i.reply({ files: [{
            attachment: canvas.toBuffer(),
            name: `demotivator-${i.user.id}-${Date.now()}.png`
        }] })
    }
}