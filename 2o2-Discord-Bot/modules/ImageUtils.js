const { createCanvas, loadImage } = require('canvas');
const fetch = require('node-fetch');
const discord = require('discord.js');
const getColors = require('get-image-colors');
const needle = require('needle');

module.exports = class ImageUtils {
    /**
     * 
     * @param {import('../core/Client')} client 
    */
    constructor (client) {
        this.client = client;
        this.mccCache = {};

        this.client.on('userUpdate', async (before, after) => {
            if (before.avatar != after.avatar && this.resolveAvatarEmoji(before.avatar)) {
                this.client.guilds.cache.get('960977599058808884').emojis.create(await this.roundAvatar(after), after.avatar);
                if (before.avatar)
                    this.client.guilds.cache.get('960977599058808884').emojis.cache.find(x => x.name == before.avatar).delete()
            }
        });
    }

    async mostCommonColor (imageUrl) {
        if (this.mccCache[imageUrl])
            return this.mccCache[imageUrl];
        
        const image = await needle('get', imageUrl);
        const colors = await getColors(image.body, 'image/png');
        this.mccCache[imageUrl] = colors;

        return colors;
    }
    
    rect (color, width, height) {
        const canvas = createCanvas(width, height);
        const ctx = canvas.getContext('2d');

        ctx.fillStyle = color;
        ctx.fillRect(0, 0, width, height);
        return canvas.toBuffer();
    }

    /**
     * 
     * @param {discord.User} user 
     */
    async registerAvatarEmoji (user) {
        if (!this.resolveAvatarEmoji(user.avatar))
            return Boolean(await this.client.guilds.cache.get('960977599058808884').emojis.create(await this.roundAvatar(user), user.avatar));
        return false;
    }

    /**
     * 
     * @param {discord.User | string} user 
     */
    resolveAvatarEmoji (user, raw=false) {
        if (!user || (typeof user != 'string' && !user.avatar))
            return raw ? { name: 'no_avatar', id: '968187531134894160' } : '<:no_avatar:968187531134894160>';

        const avatar = typeof user == 'string' ? user : user.avatar;
        const emoji = this.client.guilds.cache.get('960977599058808884').emojis.cache.find(x => x.name == avatar);

        if (raw) return emoji ? { name: emoji.name, id: emoji.id } : null;

        return emoji ? emoji.toString() : undefined;
    }

    /**
     * Draws a rounded rectangle using the current state of the canvas.
     * If you omit the last three params, it will draw a rectangle
     * outline with a 5 pixel border radius
     * @param {CanvasRenderingContext2D} ctx
     * @param {Number} x The top left x coordinate
     * @param {Number} y The top left y coordinate
     * @param {Number} width The width of the rectangle
     * @param {Number} height The height of the rectangle
     * @param {Number} [radius = 5] The corner radius; It can also be an object 
     *                 to specify different radii for corners
     * @param {Boolean} [fill = false] Whether to fill the rectangle.
     * @param {Boolean} [stroke = true] Whether to stroke the rectangle.
     */
    roundRect (ctx, x, y, width, height, radius, fill, stroke) {
        if (stroke === 'undefined') stroke = true;
        if (typeof radius === 'undefined') radius = 5;
        if (typeof radius === 'number')
            radius = {tl: radius, tr: radius, br: radius, bl: radius};
        ctx.save();
        ctx.beginPath();
        ctx.moveTo(x + radius.tl, y);
        if (radius.tl) {
            ctx.lineTo(x + width - radius.tr, y);
            ctx.quadraticCurveTo(x + width, y, x + width, y + radius.tr);
        }
        if (radius.br) {
            ctx.lineTo(x + width, y + height - radius.br);
            ctx.quadraticCurveTo(x + width, y + height, x + width - radius.br, y + height);
        }
        if (radius.bl) {
            ctx.lineTo(x + radius.bl, y + height);
            ctx.quadraticCurveTo(x, y + height, x, y + height - radius.bl);
        }
        if (radius.tl) {
            ctx.lineTo(x, y + radius.tl);
            ctx.quadraticCurveTo(x, y, x + radius.tl, y);
        }
        ctx.closePath();
        if (fill) ctx.fill();
        if (stroke) ctx.stroke();
        ctx.restore();
    }
    
    /**
     * 
     * @param {import('discord.js').User} user 
     */
    async fetchAvatar (user, size=128) {
        const req = await fetch(user.displayAvatarURL({format: 'png', dynamic: false, size }));
        return await req.buffer();
    }
    
    /**
     * 
     * @param {import('discord.js').User} user 
     */
    async fetchBanner (user, size=128) {
        if (!user.banner) return;
        const req = await fetch(user.bannerURL({format: 'png', dynamic: false, size }));
        return await req.buffer();
    }
    
    /**
     * 
     * @param {import('discord.js').User} user 
     * @param {number} size 
     * @returns {Promise<Buffer>}
     */
    async roundAvatar (user, size=128, avatarSize=null) {
        const canvas = createCanvas(size, size);
        const ctx = canvas.getContext('2d');
        const avatar = await loadImage(await this.fetchAvatar(user, avatarSize || size));
    
        ctx.save();
        ctx.beginPath();
        ctx.arc(size * 0.5, size * 0.5, size * 0.5, 0, Math.PI * 2, false);
        ctx.clip();
        ctx.drawImage(avatar, 0, 0, size, size);
        ctx.restore();
    
        return canvas.toBuffer();
    }
}

