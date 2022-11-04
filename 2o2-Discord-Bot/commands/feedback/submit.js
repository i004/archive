const discord = require('discord.js');
const BaseCommand = require('../../core/BaseCommand');
const {$} = require('../../index');

const FEEDBACK_CHANNEL_ID = '960933085220843540';

module.exports = class Feedback extends BaseCommand {
    constructor (client) {
        super({
            client,
            name: 'submit',
            description: 'Submit Feedback',
            descriptionLocalizations: { ru: 'Оставить отзыв', uk: 'Залишити відгук' }
        });

        this.client.on('raw', async (packet) => {
            if (['MESSAGE_REACTION_ADD', 'MESSAGE_REACTION_REMOVE'].includes(packet.t) && ['ic_upvote', 'ic_downvote'].includes(packet.d.emoji.name)) {
                if (packet.d.channel_id != FEEDBACK_CHANNEL_ID) return;
                
                const feedback = await this.client.db.fetch('select * from feedback where mid=$1', [packet.d.message_id]);
                
                if (!feedback) return;

                const message = await $.fetchMessage(packet.d.channel_id, packet.d.message_id);
                
                if (feedback.uid == packet.d.user_id) return message.reactions.resolve(packet.d.emoji.id).users.remove(packet.d.user_id);
                
                const user = await this.client.users.fetch(packet.d.user_id, { cache: true, force: false });
                if (user.bot) return;

                const upvotes = message.reactions.resolve('973214275948671027')?.count ?? 0;
                const downvotes = message.reactions.resolve('973214298354634772')?.count ?? 0;

                message.embeds[0].footer.text = `${(upvotes - downvotes)}`;

                await message.edit({
                    embeds: [ message.embeds[0] ]
                });
            }
        })
    }

    /**
     * 
     * @param {BaseCommand.ComponentInteraction} i 
     * @param {string[]} a 
     */
    async component (i, a) {
        if (a[0] == 'submit')
            if (i.isButton())
                return await this.run(i);
            else if (i.isModalSubmit()) {
                await this.client.module('ImageUtils').registerAvatarEmoji(i.user);
                /**
                 * @type {discord.Message}
                 */
                const message = await this.client.channels.cache.get(FEEDBACK_CHANNEL_ID).send({
                    embeds: [
                        new discord.MessageEmbed({ color: '#2F3136', description: i.components[1].components[0].value || null })
                            .setAuthor({ name: i.user.username, iconURL: i.user.displayAvatarURL() })
                            .setFooter({ text: '0', iconURL: 'https://cdn.discordapp.com/emojis/973587233384845333.png?v=1' })
                            .setImage('https://cdn.discordapp.com/attachments/972423286401138728/972423316063281182/blankLike.png')
                            .setTitle(i.components[0].components[0].value)
                            // .addField('<:this:969992335381372938>\u200b', `${this.alignNumberWhitespace(0)}0\n<:that:969992642437992498>`, true)
                            // .addField(i.components[0].components[0].value, `${i.components[1].components[0].value}`, true)
                            // .addField(`${this.client.module('ImageUtils').resolveAvatarEmoji(i.user)} ${i.user.username.slice(0, 17)}`, '\u200b', true)
                    ]
                });

                await message.react('<:ic_upvote:973214275948671027>')
                await message.react('<:ic_downvote:973214298354634772>')

                const fbId = (await this.client.db.fetch("insert into feedback values (default, $1, $2) returning *", [message.id, i.user.id])).id;
                await message.startThread({ name: `Обсуждение (${fbId})` })

                await i.reply({
                    ephemeral: true,
                    content: `[Отзыв успешно оставлен!](${message.url}) Спасибо вам за помощь серверу.`
                })
            }
    }

    /**
     * 
     * @param {discord.CommandInteraction} i 
     */
    async run (i) {
        await i.showModal(
            new discord.Modal({
                title: 'Оставить отзыв',
                customId: 'feedback->submit',
                components: [
                    new discord.MessageActionRow()
                        .addComponents(
                            new discord.TextInputComponent({
                                customId: 'title',
                                label: 'Заголовок',
                                required: true,
                                maxLength: 100,
                                style: 'SHORT'
                            })
                        ),
                    new discord.MessageActionRow()
                        .addComponents(
                            new discord.TextInputComponent({
                                customId: 'content',
                                label: 'Содержание',
                                required: false,
                                minLength: 2,
                                maxLength: 2000,
                                style: 'PARAGRAPH',
                            })
                        ),
                ]
            })
        )
    }
}