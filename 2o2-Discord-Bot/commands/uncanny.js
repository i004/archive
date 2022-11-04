const discord = require('discord.js');
const BaseCommand = require('../core/BaseCommand');
const { createCanvas, loadImage, registerFont } = require('canvas');

registerFont('assets/font/impact.ttf', { family: 'Impact' });

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

const VARIANTS = [
    [ 187, 371 ],
    [ 558, 378 ],
    [ 936, 458 ],
    [ 1394, 521 ],
    [ 1915, 542 ],
    [ 2457, 663 ],
    [ 3120, 357 ],
    [ 3477, 281 ],
    [ 3758, 286 ],
    [ 4044, 331 ],
    [ 4375, 329 ],
    [ 4704, 286 ],
    [ 4990, 235 ],
    [ 5225, 205 ],
    [ 5430, 361 ],
    [ 5791, 326 ],
    [ 6117, 228 ],
    [ 6345, 219 ],
]

module.exports = class Uncanny extends BaseCommand {
    constructor (client) {
        super({
            client,
            name: 'uncanny',
            description: 'Mr Incredible becoming uncanny meme',
            options: [
                {
                    name: 'title',
                    type: 'STRING',
                    description: 'Title',
                    descriptionLocalizations: {
                        ru: 'Заголовок',
                        uk: 'Заголовок'
                    },
                    required: true
                },
                {
                    name: 'label',
                    type: 'STRING',
                    description: 'Labels divided by "|". (min 2, max 18)',
                    descriptionLocalizations: {
                        ru: 'Подписи разделённые через "|". Минимум 2, максимум 18.',
                        uk: 'Підписи поділені через "|". Мінімум 2, максимум 18.'
                    },
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
        const title = i.options.getString('title');
        const texts = i.options.getString('label').split('|');

        if (texts.length < 2 || texts.length > 18) return i.reply({ ephemeral: true, content: 'Укажите *как минимум* 2 подписи, и не более 18-ти.' });

        const v = VARIANTS.slice(0, texts.length);
        const h = v[v.length-1][0] + v[v.length-1][1];

        const canvas = createCanvas(755, h);
        const ctx = canvas.getContext('2d');

        ctx.drawImage(await loadImage('assets/template/uncanny.png'), 0, 0, 755, 6564);
        
        ctx.fillStyle = '#fff';
        ctx.font = '75px "Impact"';
        ctx.textAlign = 'center';

        fillText(ctx, title, 755/2, 187/2.25, 75, 755/1.25);

        for (let i = 0; i < texts.length; i++)
            fillText(ctx, texts[i], 354+401/2, v[i][0] + v[i][1]/2, 75, 401/1.25)

        await i.reply({ files: [{
            attachment: canvas.toBuffer(),
            name: `uncanny-${i.user.id}-${Date.now()}.png`
        }] })
    }
}