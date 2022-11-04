const Discord = require('discord.js');
const getColors = require('get-image-colors');
const fetch = require('node-fetch');
const { createCanvas } = require('canvas');

function roundRect(im, x, y, width, height, radius=5) {
    im.beginPath();
    im.moveTo(x + radius, y);
    im.lineTo(x + width - radius, y);
    im.quadraticCurveTo(x + width, y, x + width, y + radius);
    im.lineTo(x + width, y + height - radius);
    im.quadraticCurveTo(x + width, y + height, x + width - radius, y + height);
    im.lineTo(x + radius, y + height);
    im.quadraticCurveTo(x, y + height, x, y + height - radius);
    im.lineTo(x, y + radius);
    im.quadraticCurveTo(x, y, x + radius, y);
    im.closePath();
    im.fill();
    im.stroke();
}

module.exports = {
    name: 'color',
    aliases: ['colors', 'colour', 'colours'],
    description: 'View most common colors of image',
    usage: '<(attachment | image URL)>',
    options: [
        {
            name: 'image',
            required: true,
            description: 'Image url (when using as default command you can upload a file instead of image url)',
            ctype: 'IMAGE',
            type: 'STRING'
        }
    ],
    run: async (ctx) => {
        if (!ctx._args && !ctx.options && ctx.msg.attachments.size == 0)
            return await ctx.sendDelete(ctx.i18n("color.noArgument"));
        
        const image_url = ctx._args || ctx.msg?.attachments?.first()?.url || ctx.options.get('image').value;

        if (!image_url.match(/^((https?:\/\/)(www\.)?([-a-zA-Z0-9@:%_\+.~#?&//=]+))\.(jpg|jpeg|gif|png|bmp)$/))
            return await ctx.sendDelete(ctx.i18n("color.invalidImage"));

        try {
            const req = await fetch(image_url);
            const buffer = await req.buffer();
            
            const colors = await getColors(buffer, `image/${image_url.split(".")[image_url.split(".").length-1]}`);
            const canvas = createCanvas(350, 55);
            const im = canvas.getContext('2d');
            const embed = new Discord.MessageEmbed()
                            .setImage('attachment://res.png');
            let x = 0;
    
            for (let color of colors.slice(0, 6)) {
                im.strokeStyle = im.fillStyle = color.hex();
                
                roundRect(im, x, 5, 50, 50);
                embed.addField(color.hex(), `RGB: ${color.rgb().join(", ")}`, true);
    
                x += 60;
            }
    
            embed.setColor(colors[0].hex());
    
            if (colors.length < 6 && colors.length > 3)
                for (let i = 0; i < 6-colors.length; i++)
                    embed.addField('\u200b', '\u200b', true);
    
            const attachment = new Discord.MessageAttachment(canvas.toBuffer(), 'res.png');
    
            await ctx.sendDelete({
                embeds: [embed],
                files: [attachment]
            });
        } catch (err) {
            return await ctx.sendDelete(ctx.i18n("color.invalidImage"));
        }
    }
}