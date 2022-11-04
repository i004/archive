const discord = require('discord.js');
const BaseCommand = require('../../core/BaseCommand');
const { createCanvas, loadImage } = require('canvas');
const StackBlur = require('stackblur-canvas');
const {$} = require('../../index');

const VARIABLE_HELP = 'Используйте `%{переменная}` чтобы указать переменную.\n`%{karma}` - общее кол-во кармы, `%{karma.comment}` - карма за комментарии, `%{karma.message}` - за сообщения и `%{karma.star}` - за звёзды.\n`%{stats.messages}` - общее кол-во отправленных вами сообщений, `%{stats.reactions}` - реакции, `%{stats.stars}` - звёзды.\n`%{metrics.last_online_at}` - время, когда вы в последний раз входили в сеть, `%{metrics.last_message_at}` - последнее сообщение от вас. (форматировать так: `<t:%{...}>`)';

module.exports = class Profile extends BaseCommand {
    constructor (client) {
        super({
            name: 'create',
            description: 'Create Profile',
            descriptionLocalizations: { ru: 'Создать профиль', uk: 'Створити профіль' }
        });

        $.namespaceComponentCollector('createProfile', async (x, i, a) => {
            if (!i.user.$profileCreate) i.user.$profileCreate = { colorSource: 'BANNER', bannerSource: 'BANNER', fields: [], options: [], color: null, bio: null, mode: 'CREATING' };

            if (x == '$') return await this.run(i);
            if (x == 'colorSource') {
                i.user.$profileCreate.banner = null;
                if (i.isSelectMenu()) {
                    if (i.values[0] == 'CUSTOM') {
                        return await i.showModal(
                            new discord.Modal({
                                customId: `createProfile::colorSource`,
                                title: 'Изменить цвет',
                                components: [
                                    new discord.MessageActionRow()
                                        .addComponents(
                                            new discord.TextInputComponent({
                                                customId: 'color',
                                                label: 'Цвет (RGB или HEX)',
                                                placeholder: `#${(Math.random() * 0xFFFFFF << 0).toString(16).padStart(6, '0')}`,
                                                style: 'SHORT',
                                                minLength: 3,
                                                maxLength: 20,
                                                required: true
                                            })
                                        )
                                ]
                            })
                        )
                    }
    
                    i.user.$profileCreate.colorSource = i.values[0];
                    i.user.$profileCreate.color = null;
                    await i.update(await this.generateMessage(i));
                } else if (i.isModalSubmit()) {
                    const color = i.components[0].components[0].value;
                    let hex;

                    if (color.match(/^(.*\b\d{1,3}\b.*){3}$/)) {
                        const rgb = color.match(/\b\d{1,3}\b/g).map(x => parseInt(x));
                        if (rgb.find(x => x < 0 || x > 255)) return i.reply({ ephemeral: true, content: 'Invalid RGB color' });
                        hex = rgb.map(x => x.toString(16).padStart(2, '0')).join('');
                    } else if (color.match(/^#?([0-9a-f]{3}){1,2}$/i))
                        hex = color.replace(/^#/, '')
                    else return i.reply({ ephemeral: true, content: 'Invalid color. Expected HEX (`#FFFFFF`) or RGB (`255, 255, 255`)' });

                    i.user.$profileCreate.colorSource = 'NONE';
                    i.user.$profileCreate.color = `#${hex}`;
                    await i.update(await this.generateMessage(i));
                }
            } else if (x == 'bannerSource') {
                i.user.$profileCreate.banner = null;
                i.user.$profileCreate.bannerSource = i.values[0];
                await i.update(await this.generateMessage(i));
            } else if (x == 'extraOptions') {
                i.user.$profileCreate.options = i.values;
                await i.update(await this.generateMessage(i));
            } else if (x == 'editFields') {
                if (!i.user.$profileCreate.fields.length)
                    return i.reply({ ephemeral: true, content: 'Вы не добавили ещё ни единого поля.' });

                if (i.isModalSubmit()) {
                    for (const { components } of i.components) {
                        const fieldI = parseInt(components[0].customId.split('-')[1]);

                        if (!components[0].value) delete i.user.$profileCreate.fields[fieldI];
                        else i.user.$profileCreate.fields[fieldI].value = components[0].value;
                    }

                    await i.update(await this.generateMessage(i));
                } else {
                    await i.showModal(
                        new discord.Modal({
                            customId: 'createProfile::editFields',
                            title: 'Изменить поля',
                            components: Object.entries(i.user.$profileCreate.fields).filter(x => x[1]).map((x) => (new discord.MessageActionRow().addComponents(
                                new discord.TextInputComponent({
                                    customId: `field-${x[0]}`,
                                    label: x[1].name,
                                    value: x[1].value,
                                    placeholder: 'Оставьте пустым, чтобы удалить поле.',
                                    maxLength: 200,
                                    required: false,
                                    style: 'PARAGRAPH'
                                })
                            )))
                        })
                    )
                }
            } else if (x == 'addField') {
                if (i.isModalSubmit()) {
                    if (i.user.$profileCreate.fields.length >= 3)
                        return await i.reply({ content: 'Вы достигли лимита полей (3).', ephemeral: true });
                    
                    if (i.components[1].components[0].value == '%{help}')
                        return await i.reply({ ephemeral: true, content: VARIABLE_HELP });

                    i.user.$profileCreate.fields.push({ name: i.components[0].components[0].value, value: i.components[1].components[0].value });
                    await i.update(await this.generateMessage(i));
                } else {
                    if (!i.user.$profileCreate.$themes) i.user.$profileCreate.$themes = [];

                    const themes = ['Переменные', 'Интересы', 'Город'].filter(x => !i.user.$profileCreate.$themes.includes(x));
                    const theme = themes[0];
                    
                    i.user.$profileCreate.$themes.push(theme);

                    await i.showModal(
                        new discord.Modal({
                            customId: 'createProfile::addField',
                            title: `Добавить поле (${i.user.$profileCreate.fields.length+1}/3)`,
                            components: [
                                new discord.MessageActionRow()
                                    .addComponents(
                                        new discord.TextInputComponent({
                                            customId: 'name',
                                            label: 'Заголовок',
                                            placeholder: theme,
                                            required: true,
                                            maxLength: 50,
                                            style: 'SHORT'
                                        })
                                    ),
                                new discord.MessageActionRow()
                                    .addComponents(
                                        new discord.TextInputComponent({
                                            customId: 'value',
                                            label: 'Текст',
                                            placeholder: await ({
                                                Город: async () => {
                                                    const city = await this.client.db.fetch("select * from cities where uid=$1", [i.user.id])
                                                    if (!city) return null;
                                                    return city.localized_city
                                                },
                                                Интересы: () => [
                                                    '959032065435770920',
                                                    '959035442148290601',
                                                    '959032827347886142',
                                                    '959032826987184128',
                                                    '959032980280606740',
                                                    '959032981924741150',
                                                    '959032980653887508',
                                                ].filter(x => i.member.roles.cache.has(x)).map(x => i.guild.roles.cache.get(x).name).join(', ').trim().slice(0, 100) || null,
                                                Переменные: () => `Вы можете использовать специальные переменные. Укажите %{help} чтобы посмотреть список переменных.`,
                                            }[theme] || (() => {}))(),
                                            required: true,
                                            maxLength: 200,
                                            style: 'PARAGRAPH'
                                        })
                                    ),
                            ]
                        })
                    )
                }
            } else if (x == 'editBio') {
                if (i.isModalSubmit()) {
                    i.user.$profileCreate.bio = i.components[0].components[0].value || null;
                    await i.update(await this.generateMessage(i));
                } else await i.showModal(
                    new discord.Modal({
                        customId: 'createProfile::editBio',
                        title: 'Изменить биографию',
                        components: [
                            new discord.MessageActionRow()
                                .addComponents(
                                    new discord.TextInputComponent({
                                        label: 'Новая биография',
                                        customId: 'bio',
                                        style: 'PARAGRAPH',
                                        value: i.user.$profileCreate.bio,
                                        required: false,
                                        maxLength: 500
                                    })
                                )
                        ]
                    })
                )
            } else if (x == 'finish') {
                if (a[0] == 'EDITING') {
                    const profile = i.user.$profileCreate;
                    
                    if (Buffer.isBuffer(profile.banner))
                        profile.banner = (await this.client.channels.cache.get('971382885347098704').send({
                            files: [{ attachment: profile.banner, name: `banner-${i.user.id}.png` }]
                        })).attachments.first().url;

                    await this.client.db.exec("update profile set color=$1, bio=$2, banner=$3, fields=$4, options=$5 where uid=$6", [
                        profile.color,
                        profile.bio,
                        profile.banner,
                        JSON.stringify(profile.fields.filter(x => x)),
                        JSON.stringify(profile.options),
                        i.user.id,
                    ])

                    delete i.user.$profileCreate;

                    await i.update({ content: 'Профиль был успешно обновлён.', embeds: [], components: [], files: [] });
                } else if (a[0] == 'CREATING') {
                    const profile = i.user.$profileCreate;

                    if (Buffer.isBuffer(profile.banner))
                        profile.banner = (await this.client.channels.cache.get('971382885347098704').send({
                            files: [{ attachment: profile.banner, name: `banner-${i.user.id}.png` }]
                        })).attachments.first().url;

                    await this.client.db.exec("insert into profile values ($1, $2, $3, $4, $5, $6)", [
                        i.user.id,
                        profile.color,
                        profile.bio,
                        profile.banner,
                        JSON.stringify(profile.fields.filter(x => x)),
                        JSON.stringify(profile.options),
                    ])

                    delete i.user.$profileCreate;

                    await i.update({ content: 'Ваш профиль был успешно создан!\n\n*Вы можете изменить его через `/profile edit`.*', embeds: [], components: [], files: [] });
                }
            }
        })
    }

    /**
     * 
     * @param {discord.GuildMember} member 
     * @param {'BANNER' | 'AVATAR' | 'NONE'} colorSource
     * @param {'BANNER' | 'AVATAR' | 'BLURRED_AVATAR' | 'COLOR' | 'NONE'} bannerSource
     */
    async generateProfile (member, colorSource = 'BANNER', bannerSource = 'BANNER', ext = {} ) {
        const user = member.user;
        await user.fetch();

        const profile = {
            color: null, bio: null, banner: null, ...ext
        };

        if (!profile.color)
        if (colorSource == 'BANNER') {
            if (user.accentColor)
                profile.color = `#${user.accentColor.toString(16)}`;
            else if (user.banner)
                profile.color = (await this.client.module('ImageUtils').mostCommonColor(user.bannerURL({ format: 'png', dynamic: false })))[0].hex();
            else
                profile.color = (await this.client.module('ImageUtils').mostCommonColor(user.displayAvatarURL({ format: 'png', dynamic: false })))[0].hex();
        } else if (colorSource == 'AVATAR')
            profile.color = (await this.client.module('ImageUtils').mostCommonColor(user.displayAvatarURL({ format: 'png', dynamic: false })))[0].hex();
        else 
            profile.color = '#202225';

        const discordProfile = await $.fetchUserProfile(user);
        if (!profile.bio && discordProfile?.user?.bio) profile.bio = discordProfile.user.bio;

        if (!profile.banner)
        if (bannerSource == 'BANNER' && user.banner) profile.banner = user.bannerURL();
        else if (bannerSource == 'BANNER' && user.accentColor) profile.banner = this.client.module('ImageUtils').rect(`#${user.accentColor.toString(16)}`, 600, 240);
        else if (bannerSource == 'AVATAR' || bannerSource == 'BLURRED_AVATAR') {
            const canvas = createCanvas(600, 240);
            const ctx = canvas.getContext('2d');

            const avatar = await loadImage(user.displayAvatarURL({ dynamic: false, format: 'png', size: 1024 }));
            ctx.drawImage(avatar, 0, ~(240/2), 600, 600);

            if (bannerSource == 'BLURRED_AVATAR')
                StackBlur.canvasRGB(canvas, 0, 0, 600, 240, 50);
            
            profile.banner = canvas.toBuffer();
        } else if (bannerSource == 'COLOR') profile.banner = this.client.module('ImageUtils').rect(profile.color, 600, 240);

        return profile;
    }

    /**
     * 
     * @param {discord.Interaction} i 
     * @param {'CREATING' | 'EDITING'} mode
     * @returns {discord.InteractionReplyOptions}
     */
    async generateMessage(i, mode='CREATING') {
        if (!i.user.$profileCreate) i.user.$profileCreate = { colorSource: 'BANNER', bannerSource: 'BANNER', fields: [], options: [], color: null, bio: null, banner: null, mode };
        
        const generatedProfile = await this.generateProfile(i.member, i.user.$profileCreate.colorSource, i.user.$profileCreate.bannerSource, i.user.$profileCreate);
        i.user.$profileCreate = generatedProfile;
        i.user.$profileCreate.fields = i.user.$profileCreate.fields.filter(x => x);

        return {
            ...await this.client.command('profile').profileMessage(i.user, generatedProfile, 'Профиль можно будет изменить через /profile edit'),
            ephemeral: true,
            components: [
                new discord.MessageActionRow()
                    .addComponents(
                        new discord.MessageSelectMenu({
                            placeholder: 'Цвет...',
                            customId: `createProfile::colorSource`,
                            options: [
                                { label: 'Мой баннер', value: 'BANNER' },
                                { label: 'Моя аватарка', value: 'AVATAR' },
                                { label: 'Без цвета', value: 'NONE' },
                                { label: 'Указать ...', emoji: { name: 'white_pencil', id: '966318914055336009' }, value: 'CUSTOM' },
                            ]
                        }),
                    ),
                new discord.MessageActionRow()
                    .addComponents(
                        new discord.MessageSelectMenu({
                            placeholder: 'Баннер...',
                            customId: `createProfile::bannerSource`,
                            options: [
                                { label: 'По-умолчанию', value: 'BANNER' },
                                { label: 'Аватарка', value: 'AVATAR' },
                                { label: 'Аватарка (размытая)', value: 'BLURRED_AVATAR' },
                                { label: 'Цвет', value: 'COLOR' },
                                { label: 'Без баннера', value: 'NONE' }
                            ]
                        }),
                    ),
                new discord.MessageActionRow()
                    .addComponents(
                        new discord.MessageSelectMenu({
                            placeholder: 'Дополнительно...',
                            customId: `createProfile::extraOptions`,
                            minValues: 0,
                            maxValues: 3,
                            options: [
                                { label: 'Скрыть миниатюру аватарки', value: 'HIDE_AVATAR_THUMBNAIL', default: generatedProfile.options.includes('HIDE_AVATAR_THUMBNAIL') },
                                { label: 'Показывать аватарку в заголовке/футере', value: 'AUTHOR_WITH_AVATAR', default: generatedProfile.options.includes('AUTHOR_WITH_AVATAR') },
                                { label: 'Показывать автора в футере, а не заголовке', value: 'AUTHOR_IN_FOOTER', default: generatedProfile.options.includes('AUTHOR_IN_FOOTER') },
                            ]
                        }),
                    ),
                new discord.MessageActionRow()
                    .addComponents(
                        new discord.MessageButton({
                            label: 'Изменить поля',
                            emoji: { name: 'edit', id: '966318914055336009' },
                            customId: `createProfile::editFields`,
                            style: 'SECONDARY'
                        }),
                        new discord.MessageButton({
                            label: 'Добавить поле',
                            emoji: { name: 'white_plus_sign', id: '966068608075698187' },
                            customId: `createProfile::addField`,
                            style: 'SECONDARY',
                            disabled: i.user.$profileCreate.fields.length >= 3
                        }),
                    ),
                new discord.MessageActionRow()
                    .addComponents(
                        new discord.MessageButton({
                            label: 'Изменить биографию',
                            emoji: { name: 'edit', id: '966318914055336009' },
                            customId: `createProfile::editBio`,
                            style: 'SECONDARY'
                        }),
                        new discord.MessageButton({
                            label: { CREATING: `Создать профиль`, EDITING: `Изменить профиль` }[generatedProfile.mode],
                            customId: `createProfile::finish::${generatedProfile.mode}`,
                            style: 'SUCCESS'
                        }),
                    )
            ]
        };
    }

    /**
     * 
     * @param {discord.CommandInteraction} i 
     */
    async run (i) {
        const profile = await this.client.db.fetch('select * from profile where uid=$1', [i.user.id]);
        
        if (profile) return await i.reply({ ephemeral: true, content: 'У вас уже есть профиль.' });

        await i.reply(await this.generateMessage(i));
    }
}