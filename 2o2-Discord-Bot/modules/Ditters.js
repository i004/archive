const discord = require('discord.js');
const unidecode = require('unidecode');
const nameBlacklist = require('../assets/nameBlacklist.json');
const {$} = require('../index');

module.exports = class Ditters {
    /**
     * 
     * @param {import('../core/Client')} client 
     */
    constructor (client) {
        this.client = client;

        this.channelEditCooldown = {};

        $.namespaceComponentCollector('ditter', async (x, i, a) => {
            if (x == '$') {
                const ditters = (await this.client.db.all("select * from ditters where uid=$1", [i.user.id]))
                    .map(x => ({ ...x, channel: this.client.channels.cache.get(x.cid) }))
                    .sort((a, b) => b.last_message_at - a.last_message_at);
                const totalKarma = await $.totalKarma(i.user);

                const externalDitters = (await this.client.db.all("select * from ditters where uid!=$1", [i.user.id]))
                    .map(x => ({ ...x, channel: this.client.channels.cache.get(x.cid) }))
                    .filter(x => x.channel.permissionOverwrites.resolve(i.user.id)
                                 && x.channel.permissionOverwrites.resolve(i.user.id).allow.has(discord.Permissions.FLAGS.MANAGE_ROLES))
                    .sort((a, b) => b.last_message_at - a.last_message_at);

                const list = ditters.concat(externalDitters).slice(0, 25);

                await i.reply({
                    content: `Управление диттерами${totalKarma < 15 ? `\n\n:warning: Создание диттера требует как минимум 15 кармы (у вас ${totalKarma})` : totalKarma < ditters.length * 50 ? `\n\n:warning: Создание нового диттера требует ${ditters.length*50} кармы (у вас ${totalKarma})` : ""}`,
                    ephemeral: true,
                    components: [
                        new discord.MessageActionRow()
                            .addComponents(
                                new discord.MessageSelectMenu({
                                    placeholder: `Ваши диттеры (${list.length})`,
                                    customId: 'ditter::select',
                                    options: list.length > 0 ? list.map(x => ({
                                        label: x.channel.name,
                                        description: x.channel.topic,
                                        value: x.cid,
                                        emoji: client.module('ImageUtils').resolveAvatarEmoji(this.client.users.cache.get(x.uid), true)
                                    })) : [{ label: '-', value: '-' }],
                                    disabled: !list.length
                                })
                            ),
                        new discord.MessageActionRow()
                            .addComponents(
                                new discord.MessageButton({
                                    // label: 'Создать диттер',
                                    emoji: { name: 'white_plus_sign', id: '966068608075698187' },
                                    customId: 'ditter::create',
                                    style: 'SUCCESS',
                                    disabled: totalKarma < 15 || totalKarma < ditters.length * 50
                                })
                            )
                    ]
                })
            } else if (x == 'create') {
                if (i.isModalSubmit()) {
                    const c = await this.client.db.count("select * from ditters where uid=$1", [i.user.id]);
                    const totalKarma = await $.totalKarma(i.user);
                    
                    if (totalKarma < 15)
                        return i.reply({ ephemeral: true, content: `У вас недостаточно кармы. Вам требуется как минимум **15** кармы, чтобы создавать диттеры. (у вас ${totalKarma})`, embeds: [], components: [] })
                    
                    if (totalKarma < c*50)
                        return i.reply({ ephemeral: true, content: `У вас недостаточно кармы. Для создания ${c+1}-го диттера нужно как минимум **${c*50}** кармы (у вас ${totalKarma})`, embeds: [], components: [] })
                    
                    const form = {
                        name: this.normalizeChannelName(i.components[0].components[0].value),
                        topic: i.components[1].components[0].value
                    }

                    if (!this.verifyName(form.name, i.guild)) return i.reply({ ephemeral: true, content: 'Это название запрещено.' });
                    
                    const cluster = $.findCluster();
                    if (!cluster) return i.reply({ content: 'Все слоты заполнены! (50/50 каналов во всех категориях). Обратитесь к администрации.', components: [] });
                    
                    const channel = await i.guild.channels.create(`dt-${form.name}`, { type: 'GUILD_TEXT', parent: cluster, topic: form.topic });
                    
                    if (channel.name == 'dt' || channel.name == 'dt-ditter' || channel.name == 'dt-dt') {
                        await i.reply({ content: 'Invalid Name', ephemeral: true });
                        return await channel.delete();
                    }

                    await channel.permissionOverwrites.edit(i.user.id, { VIEW_CHANNEL: true, MANAGE_CHANNELS: false, MANAGE_ROLES: true, MANAGE_WEBHOOKS: false, CREATE_INSTANT_INVITE: true, SEND_MESSAGES: true, SEND_MESSAGES_IN_THREADS: true, SEND_TTS_MESSAGES: true, CREATE_PUBLIC_THREADS: true, CREATE_PRIVATE_THREADS: true, EMBED_LINKS: true, ATTACH_FILES: true, ADD_REACTIONS: true, USE_EXTERNAL_EMOJIS: true, USE_EXTERNAL_STICKERS: true, MENTION_EVERYONE: false, MANAGE_MESSAGES: true, MANAGE_THREADS: true, READ_MESSAGE_HISTORY: true, USE_APPLICATION_COMMANDS: true });
                    
                    await this.client.module('ImageUtils').registerAvatarEmoji(i.user);

                    await this.client.db.exec("insert into ditters values ($1, $2, $3, $4)", [channel.id, i.user.id, form.name, form.topic])
                    await i.update({
                        ephemeral: true,
                        content: `Ваш диттер был успешно создан. <#${channel.id}>`,
                        components: []
                    })
                } else {
                    await i.showModal(
                        new discord.Modal({
                            title: 'Создать диттер',
                            customId: 'ditter::create',
                            components: [
                                new discord.MessageActionRow()
                                    .addComponents(
                                        new discord.TextInputComponent({
                                            customId: 'name',
                                            label: 'Название',
                                            style: 'SHORT',
                                            maxLength: 45,
                                            required: true
                                        }),
                                    ),
                                new discord.MessageActionRow()
                                    .addComponents(
                                        new discord.TextInputComponent({
                                            customId: 'topic',
                                            label: 'Описание',
                                            style: 'PARAGRAPH',
                                            maxLength: 999,
                                            required: false
                                        }),
                                    ),
                            ]
                        })
                    )
                }
            } else if (x == 'select') {
                const ditter = await this.client.db.fetch("select * from ditters where cid=$1", [i.values[0]]);

                await i.update(await this.ditterSettingsMessage(i, ditter));
            } else if (x == 'settings') {
                const ditter = await this.client.db.fetch("select * from ditters where cid=$1", [a[0]]);
                const channel = this.client.channels.cache.get(ditter.cid);
                const options = await $.ditterOptions(ditter.cid);

                if (a[1] == 'toggleNSFW')
                    await channel.setNSFW(!channel.nsfw);
                else if (a[1] == 'toggleRepostFrom')
                    await this.client.db.exec("insert into ditter_options values ($1, $2, default) on conflict (cid) do update set repost_from=excluded.repost_from", [ditter.cid, !options.repost_from]);
                else if (a[1] == 'toggleRepostTo')
                    await this.client.db.exec("insert into ditter_options values ($1, default, $2) on conflict (cid) do update set repost_to=excluded.repost_to", [ditter.cid, !options.repost_to]);
                else if (a[1] == 'editOverview') {
                    if (a[2] != '&')
                        return await i.update({
                            content: 'Внешний вид (название, описание) диттера можно менять только раз в **10 минут**. Вы уверены?',
                            embeds: [],
                            components: [
                                new discord.MessageActionRow()
                                    .addComponents(
                                        new discord.MessageButton({
                                            label: 'Да',
                                            customId: `ditter::settings::${a[0]}::editOverview::&`,
                                            style: 'SUCCESS'
                                        }),
                                        new discord.MessageButton({
                                            label: 'Отмена',
                                            customId: `ditter::settings::${a[0]}`,
                                            style: 'DANGER'
                                        }),
                                    )
                            ]
                        })

                    if (i.isModalSubmit()) {
                        if (this.channelEditCooldown[channel.id] > Date.now())
                            return await i.update({
                                content: `Вы уже изменяли название диттера. Повторите снова <t:${~~(this.channelEditCooldown[channel.id] / 1000)}:R>`,
                                components: [],
                                embeds: []
                            })
                        
                        const name = this.normalizeChannelName(i.components[0].components[0].value).replace(/^(dt-)+/, '');

                        if (!this.verifyName(name, i.guild, false)) return i.reply({ content: 'Invalid Name', ephemeral: true });

                        if (channel.name != name)
                            await channel.setName(`dt-${name.replace(/^(dt-)+/, '')}`)
                        
                        await channel.fetch();

                        if (channel.name == 'dt-ditter' || channel.name == 'dt' || channel.name == 'dt-dt' || channel.name == '') {
                            await channel.setName(`dt-invalid-name-${~~(Math.random()*99999)}`);
                            this.channelEditCooldown[channel.id] = Date.now() + 14 * 24 * 3600 * 1000;
                            return await i.update({
                                content: 'Допрыгались!'
                            })
                        }

                        if (channel.topic != i.components[1].components[0].value)
                            await channel.setTopic(i.components[1].components[0].value);
                        
                        this.channelEditCooldown[channel.id] = Date.now() + 600 * 1000;
                    } else return await i.showModal(
                        new discord.Modal({
                            title: 'Внешний вид',
                            customId: `ditter::settings::${a[0]}::editOverview::&`,
                            components: [
                                new discord.MessageActionRow()
                                    .addComponents(
                                        new discord.TextInputComponent({
                                            label: 'Название',
                                            value: channel.name,
                                            required: true,
                                            maxLength: 45,
                                            style: 'SHORT',
                                            customId: 'name'
                                        })
                                    ),
                                new discord.MessageActionRow()
                                    .addComponents(
                                        new discord.TextInputComponent({
                                            label: 'Описание',
                                            value: channel.topic,
                                            required: false,
                                            maxLength: 999,
                                            style: 'PARAGRAPH',
                                            customId: 'topic'
                                        })
                                    ),
                            ]
                        })
                    )
                } else if (a[1] == 'dangerZone') {
                    if (a[2] != 'delete')
                        return await i.update({
                            content: '**Danger Zone**\nВы можете удалить свой диттер, однако, учтите, что !!! ЭТО ДЕЙСТВИЕ НЕЛЬЗЯ ОТМЕНИТЬ !!!. ',
                            embeds: [],
                            components: [
                                new discord.MessageActionRow()
                                    .addComponents(
                                        new discord.MessageButton({
                                            label: 'Отмена',
                                            customId: `ditter::settings::${a[0]}`,
                                            style: 'SUCCESS'
                                        }),
                                        new discord.MessageButton({
                                            label: 'Удалить диттер',
                                            customId: `ditter::settings::${a[0]}::dangerZone::delete::{VerifyKey=${require('crypto').randomBytes(5).toString('hex')}}`,
                                            style: 'DANGER'
                                        }),
                                    )
                            ]
                        })
                    else {
                        await this.client.db.exec("delete from ditters where cid=$1", [channel.id]);

                        channel.setParent('972430941593153576', { lockPermissions: true });
                        channel.setName(`__scheduled_${Math.random()*99999}`);
                        channel.setTopic(`SCHEDULED FOR DELETION ${BigInt(i.user.id).toString(16)}`);

                        return await i.update({
                            content: 'Ваш диттер будет удалён в течении 48 часов. Если вы передумали, срочно обратитесь к админам, чтобы они не удаляли ваш диттер.',
                            embeds: [],
                            components: []
                        })
                    }
                }

                await i.update(await this.ditterSettingsMessage(i, ditter));
            }
        })
    }

    /**
     * 
     * @param {discord.Interaction} i 
     * @param {{
     *  cid: string,
     *  uid: string,
     *  name: string,
     *  topic: string,
     *  last_message_at: number,
     *  karma_allowed: boolean
     * }} ditter 
     * @returns {Promise<discord.InteractionReplyOptions>}
     */
    async ditterSettingsMessage(i, ditter) {
        const channel = this.client.channels.cache.get(ditter.cid);
        const options = await $.ditterOptions(ditter.cid);

        const check = (b) => b ? { name: '✅' } : { name: 'crossmark', id: '968554357358485565' };

        return {
            ephemeral: true,
            content: null,
            // content: `Настройки \`${channel.name}\``,
            embeds: [{
                author: { name: channel.name, iconURL: this.client.users.cache.get(ditter.uid).displayAvatarURL() },
                description: channel.topic || null,
                image: { url: 'https://cdn.discordapp.com/attachments/972423286401138728/972423316063281182/blankLike.png' },
                footer: { text: 'Настройки диттера' },
                color: '#2F3136',
            }],
            components: [
                new discord.MessageActionRow()
                    .addComponents(
                        new discord.MessageButton({
                            label: 'NSFW',
                            style: 'SECONDARY',
                            emoji: check(channel.nsfw),
                            customId: `ditter::settings::${ditter.cid}::toggleNSFW`
                        }),
                        new discord.MessageButton({
                            label: 'Репосты из диттера',
                            style: 'SECONDARY',
                            emoji: check(options.repost_from),
                            customId: `ditter::settings::${ditter.cid}::toggleRepostFrom`
                        }),
                        new discord.MessageButton({
                            label: 'Репосты в диттер',
                            style: 'SECONDARY',
                            emoji: check(options.repost_to),
                            customId: `ditter::settings::${ditter.cid}::toggleRepostTo`
                        }),
                    ),
                new discord.MessageActionRow()
                    .addComponents(
                        new discord.MessageButton({
                            label: 'Внешний вид',
                            style: 'PRIMARY',
                            emoji: { name: 'white_pencil', id: '966318914055336009' },
                            customId: `ditter::settings::${ditter.cid}::editOverview`,
                            disabled: this.channelEditCooldown[ditter.cid] > Date.now()
                        }),
                        new discord.MessageButton({
                            label: 'Плагины',
                            style: 'PRIMARY',
                            emoji: { name: 'settings', id: '966676281678782474' },
                            customId: `ditter::settings::${ditter.cid}::plugins`,
                            disabled: true
                        }),
                        new discord.MessageButton({
                            label: 'Danger Zone',
                            style: 'DANGER',
                            emoji: { name: 'crossmark', id: '966623159224766504' },
                            customId: `ditter::settings::${ditter.cid}::dangerZone`,
                            disabled: i.user.id != ditter.uid
                        }),
                    ),
                new discord.MessageActionRow()
                    .addComponents(
                        new discord.MessageButton({
                            // label: '',
                            style: 'SECONDARY',
                            emoji: { name: 'backward', id: '849896610833498112' },
                            customId: `ditter::$`
                        }),
                        new discord.MessageButton({
                            style: 'SECONDARY',
                            emoji: { name: 'white_question', id: '966068608688070726' },
                            customId: `ditter::settingsInfo`,
                            disabled: true
                        }),
                    ),
            ]
        }
    }

    normalizeChannelName (name) {
        name = name.toLowerCase();
        const ru = Array.from('йцукенгшщзхъфывапролджэячсмитьбюё');
        
        for (let i = 0; i <= ru.length; i++)
            if (name.includes(ru[i]))
                name = name.split(ru[i]).join(`<RU${i}>`)
        
        name = unidecode(name);
        
        for (let i = 0; i <= ru.length; i++)
            name = name.split(`<RU${i}>`).join(ru[i])
            
        return name
            .toLowerCase()
            .replace(/[^a-zа-яё0-9_-]/g, '-')
            .replace(/^-/, '')
            .replace(/-$/, '')
            .replace(/^(dt-)+/, '')
            .replace(/-{2,}/g, '-')
    }

    verifyName (name, guild, unique=true) {
        return name.length >= 2
               && !nameBlacklist.find(x => name.replace(/[_-]/g, '').match(new RegExp(x)))
               && (unique ? !guild.channels.cache.find(x => x.name.startsWith(name) || x.name.endsWith(name)) : true);
    }
}