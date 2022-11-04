const discord = require('discord.js');
const BaseCommand = require('../../core/BaseCommand');
const { createCanvas, loadImage } = require('canvas');

module.exports = class Profile extends BaseCommand {
    constructor (client) {
        super({
            client,
            name: 'banner',
            description: 'Change profile banner',
            descriptionLocalizations: { ru: 'Изменить баннер профиля', uk: 'Змінити банер профілю' },
            options: [
                {
                    name: 'new_banner',
                    description: 'New banner',
                    descriptionLocalizations: { ru: 'Новый баннер', uk: 'Новий банер' },
                    type: 'ATTACHMENT',
                    required: true
                }
            ]
        });
    }

    scale (canvas, ctx, img) {
        const scale = Math.max(canvas.width / img.width, canvas.height / img.height);
        const x = (canvas.width / 2) - (img.width / 2) * scale;
        const y = (canvas.height / 2) - (img.height / 2) * scale;
        ctx.drawImage(img, x, y, img.width * scale, img.height * scale);
    }

    fit (canvas, ctx, img) {
        const scale = Math.min(canvas.width / img.width, canvas.height / img.height);
        const x = (canvas.width / 2) - (img.width / 2) * scale;
        const y = (canvas.height / 2) - (img.height / 2) * scale;

        ctx.fillStyle = '#202225';
        ctx.fillRect(0, 0, canvas.width, canvas.height);

        ctx.drawImage(img, x, y, img.width * scale, img.height * scale);
    }

    stretch (canvas, ctx, img) {
        ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
    }

    /**
     * 
     * @param {discord.CommandInteraction} i 
     */
    async run (i) {
        if (!await this.client.db.any('select * from profile where uid=$1', [i.user.id]))
            return i.reply({ content: `У вас нет профиля.`, ephemeral: true })

        await i.deferReply({ ephemeral: true })
        const banner = i.options.getAttachment('new_banner');
        
        const sizes = [ [640, 480], [1280, 720], [1920, 1080] ];
        const [ w, h ] = sizes.find(x => x[0] >= banner.width && x[1] >= banner.height) || [ 1920, 1080 ];

        const canvas = createCanvas(w, h);
        const ctx = canvas.getContext('2d');

        this.scale(canvas, ctx, await loadImage(banner.attachment));

        const bannerURL = (await this.client.channels.cache.get('971382885347098704').send({
            files: [{ attachment: canvas.toBuffer(), name: `banner-${i.user.id}.png` }]
        })).attachments.first().url;

        await this.client.db.exec("update profile set banner=$1 where uid=$2", [bannerURL, i.user.id]);

        await i.editReply({
            ephemeral: true,
            content: 'Ваш баннер был успешно изменён.',
            files: [{
                attachment: bannerURL,
                name: 'preview.png'
            }],
            // components: [
            //     new discord.MessageActionRow()
            //         .addComponents(
            //             new discord.MessageSelectMenu({
            //                 customId: 'profileBanner::resizeMethod',
            //                 options: [
            //                     { label: 'Scale', value: 'scale', default: true },
            //                     { label: 'Stretch', value: 'stretch' },
            //                     { label: 'Fit', value: 'fit' },
            //                 ]
            //             })
            //         )
            // ]
        })
    }
}