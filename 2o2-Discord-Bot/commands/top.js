const discord = require('discord.js');
const BaseCommand = require('../core/BaseCommand');

module.exports = class Top extends BaseCommand {
    constructor (client) {
        super({
            client,
            name: 'top',
            description: 'Karma Leaderboard',
            descriptionLocalizations: {
                ru: 'Таблица лидеров по карме',
                uk: 'Таблиця лідерів з карми'
            }
        });
    }

    /**
     * 
     * @param {discord.CommandInteraction} i 
     */
    async run (i) {
        const rawusers = await this.client.db.all("select * from karma order by message+reputation+extra desc");
        const upos = rawusers.findIndex(x => x.uid == i.user.id);

        const users = rawusers.filter(x => x.message + x.reputation + x.extra > 15);

        const embedBase = () => new discord.MessageEmbed()
            .setAuthor({ name: 'Топ по карме' })
            .setFooter({ text: `Ваш ранг в топе: #${upos+1}` })
            .setThumbnail('https://cdn.discordapp.com/emojis/964088854124589076.png?size=1024&quality=lossless');
        
        const pages = [];
        let cpage = 0;

        for (let i = 0; i < users.length; i += 5)
            pages.push(users.slice(i, i + 5));

        const formatPage = async (page) => {
            const embed = embedBase();
            for (let x of pages[page]) {
                const user = await this.client.users.fetch(x.uid);
                await this.client.module('ImageUtils').registerAvatarEmoji(user);
    
                // :envelope: :newspaper: :star:
                embed.addField(
                    `${this.client.module('ImageUtils').resolveAvatarEmoji(user)} **${user.username}** — ${~~(x.comment + x.message + x.star + x.extra)}`, 
                    `${~~x.message} message, ${~~x.reputation} reputation, ${~~x.extra} extra`
                )
            }
            return embed;
        }

        /**
         * @type {discord.Message}
         */
        const message = await i.reply({
            fetchReply: true,
            embeds: [await formatPage(cpage)],
            components: [
                new discord.MessageActionRow()
                    .addComponents(
                        new discord.MessageButton({
                            style: 'PRIMARY',
                            emoji: { name: 'backward', id: '849896610833498112' },
                            customId: `backward`,
                            disabled: true
                        }),
                        new discord.MessageButton({
                            style: 'SECONDARY',
                            label: `1/${pages.length}`,
                            customId: `blank`,
                            disabled: true
                        }),
                        new discord.MessageButton({
                            style: 'PRIMARY',
                            emoji: { name: 'forward', id: '849896610997207040' },
                            customId: `forward`,
                            disabled: false
                        }),
                    )
            ]
        })

        const collector = message.createMessageComponentCollector({ time: 5*60*1000, componentType: 'BUTTON', filter: (x) => x.user.id == i.user.id });

        collector.on('collect', async (inter) => {
            if (inter.customId == 'backward') cpage--;
            if (inter.customId == 'forward') cpage++;

            if (cpage >= pages.length-1) message.components[0].components[2].setDisabled(true);
            else message.components[0].components[2].setDisabled(false);

            if (cpage < 1) message.components[0].components[0].setDisabled(true);
            else message.components[0].components[0].setDisabled(false);

            message.components[0].components[1].setLabel(`${cpage+1}/${pages.length}`);

            await inter.update({
                embeds: [await formatPage(cpage)],
                components: message.components
            })
        });
        
        collector.on('end', async () => {
            message.components[0].components.map(x => x.setDisabled(true));
            await i.editReply({
                components: message.components
            })
        })
    }
}