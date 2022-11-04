const discord = require('discord.js');
const {$} = require('../index');

const ROLES = {
    settings: {
        name: 'Настройки',
        roles: [
            { label: 'Скрыть все диттеры', value: '959030110458110022', description: 'Если вам они мешают, вы можете скрыть всю категорию.', emoji: { name: '❌' } },
            { label: 'Уведомления: Новости', value: '959030111041097818', description: 'Если вам так нравятся пинги...', emoji: { name: '🔔' } },
            { label: 'Уведомления: Голосования', value: '960595355303559248', description: 'Если вам так нравятся пинги...', emoji: { name: '📢' } }
        ],
        div: '959029769050144778'
    },
    pronouns: {
        name: 'Pronouns (анахуя...)',
        limit: 1,
        roles: [
            { label: 'any/all', value: '959030089134272512' },
            { label: 'they/them', value: '959030089423650867' },
            { label: 'she/her', value: '959030109464068147' },
            { label: 'he/him', value: '959030090363195412' },
        ],
        div: '959029769050144778'
    },
    interests: {
        name: 'Увлечения/интересы',
        roles: [
            { label: 'Minecraft / Terraria', value: '959032065435770920' },
            { label: 'Мини-игры (Gartic Phone, UNO, ...)', value: '959035442148290601' },
            { label: 'Ритм-игры', value: '959032827347886142' },
            { label: 'Музыка', value: '959032826987184128' },
            { label: 'Программирование', value: '959032980280606740' },
            { label: 'Дизайн', value: '959032981924741150' },
            { label: 'Творчество', value: '959032980653887508' },
            { label: '[object Object]', value: '959032981417259038' },
        ],
        div: '959029769758965800'
    },
    colors: {
        name: '⭐ Цвета ника',
        limit: 1,
        minKarma: 50,
        roles: [
            { label: 'Красный', value: '964263660342087761', minKarma: 50 },
            { label: 'Оранжевый', value: '964264038387286036', minKarma: 150 },
            { label: 'Зелёный', value: '964263662036594738', minKarma: 50 },
            { label: 'Бирюзовый', value: '964264038966120499', minKarma: 150 },
            { label: 'Синий', value: '964263660878979092', minKarma: 50 },
            { label: 'Фиолетовый', value: '964263662107901962', minKarma: 150 },
        ],
        div: '959029822594621470'
    }
}

module.exports = class Menu {
    /**
     * 
     * @param {import('../core/Client')} client 
     */
    constructor (client) {
        this.client = client;
        this.fbdtf = {};

        this.ditterEditCooldown = { name: {}, topic: {} };
        this.chatroomEditCooldown = { name: {}, topic: {} };
        
        $.namespaceComponentCollector('menu', async (x, i, a) => {
            const _reply =
            /**
             * 
             * @param {discord.InteractionReplyOptions} options 
             */
            (options) => a.includes('$') ? i.reply(options) : i.update(options);

            if (x == 'roles') {
                const category = ROLES[a[0]];
                const hasRole = (role) => i.member.roles.cache.has(role);
                const hasDiv = (div) => Object.values(ROLES).find(x => (div ? x.div == div : true) && x.roles.find(y => hasRole(y.value)))

                if (category && i.isSelectMenu()) {
                    const add = i.values.filter(x => !hasRole(x));
                    const remove = category.roles.filter(x => !i.values.includes(x.value) && hasRole(x.value));

                    await i.member.roles.add(add);
                    await i.member.roles.remove(remove.map(x => x.value));

                    if (hasDiv(category.div)) i.member.roles.add(category.div);
                    else i.member.roles.remove(category.div);

                    if (hasDiv()) i.member.roles.add('958723356696412181');
                    else i.member.roles.remove('958723356696412181');
                }

                const totalKarma = await $.totalKarma(i.user);

                await _reply({
                    ephemeral: true,
                    content: 'Роли',
                    components: [
                        new discord.MessageActionRow()
                            .addComponents(
                                category ? (new discord.MessageSelectMenu({
                                    placeholder: category.name,
                                    customId: `menu::roles::${a[0]}::select`,
                                    minValues: 0,
                                    maxValues: category.limit || category.roles.length,
                                    options: category.roles
                                      .filter(x => x.minKarma ? x.minKarma <= totalKarma : true)
                                      .map(x => ({...x, default: hasRole(x.value)}))
                                })) : (new discord.MessageSelectMenu({
                                    placeholder: 'Выберите категорию.',
                                    customId: 'menu::roles',
                                    disabled: true,
                                    minValues: 0,
                                    maxValues: 1,
                                    options: [{ label: '-', value: '-' }]
                                }))
                            ),
                        new discord.MessageActionRow()
                            .addComponents(Object.entries(ROLES)
                                .filter(x => x[1].minKarma ? x[1].minKarma <= totalKarma : true)
                                .map(x => new discord.MessageButton({
                                    label: x[1].name,
                                    customId: `menu::roles::${x[0]}::button`,
                                    style: ['SECONDARY', 'PRIMARY'][~~(a[0] == x[0])],
                                }))),
                    ]
                })
            } else if (x == 'getStarted') {
                const steps = [
                    {
                        image: 'https://cdn.discordapp.com/attachments/972423286401138728/972440327526961192/Guidebook.png',
                        title: 'Путеводитель',
                        description: `Привет, **${i.user.username}**! Как новый участник, вы можете столкнуться с некоторыми вещами, которые вы еще не можете полностью понять. Чтобы помочь вам разобраться с нашим сообществом, мы создали этот путеводитель, в котором шаг за шагом вы узнаете все, что вам нужно знать.`,
                        components: [new discord.MessageActionRow().addComponents(
                            new discord.MessageButton({ customId: 'menu::getStarted::1', style: 'SUCCESS', label: 'Начать', emoji: { name: 'white_education', id: '968555648985989120' } }),
                        )]
                    },
                    {
                        image: 'https://cdn.discordapp.com/attachments/972423286401138728/972935184695578716/ServerRules.png',
                        title: 'Правила сервера',
                        description: [
                            `Первое и единственное правило — руководствоваться здравым смыслом во всем, что вы делаете. Просто ведите себя уважительно ко всему и ко всем, и у вас все будет хорошо.\n\n`,
                            ` • **Относитесь к другим пользователям с уважением и пониманием.** Мы не приветствуем угнетение, неуважение к другим участникам, чрезмерное использование ненормативной лексики, доксинг, личные конфликты. Общайтесь и относитесь к другим так, как хотите, чтобы относились к вам.\n`,
                            ` • **Помогите содержать каналы в чистоте.** Избегайте излишних и/или ненужных сообщений, эмодзи, стикеров, копипасты, цепочек из одинаковых или схожих сообщений, излишнего количества спойлеров, форматирования текста и @упоминаний. Использование @упоминаний без причины также рассматривается как нарушение данного правила. Используйте каналы по их назначению. Общайтесь в <#968549637894054000>, для команд ботов используйте <#968162289117200414> и так далее.\n`,
                            ` • **Политика диттеров.** На каждый диттер, включая приватные, распространяются все правила сервера без исключения. Использование команд ботов разрешено, как и публикация больших сообщений, однако, __не спамьте.__ Система кармы расчитана на *честных* участников, которые не будут публиковать длинные бесмысленные сообщения чтобы накрутить себе карму. В подобнных случаях, администрация имеет полное право отобрать у вас доступ к системе кармы.`,
                        ].join('\n'),
                        components: [new discord.MessageActionRow().addComponents(
                            new discord.MessageButton({ customId: 'menu::getStarted::0', style: 'SECONDARY', label: 'Предыдущая страница', emoji: { name: 'backward', id: '849896610833498112' }, disabled: true }),
                            new discord.MessageButton({ customId: 'menu::getStarted::2', style: 'SECONDARY', label: 'Следующая страница', emoji: { name: 'forward', id: '849896610997207040' } }),
                        )]
                    },
                    {
                        image: 'https://cdn.discordapp.com/attachments/972423286401138728/972935184968196147/Karma.png',
                        title: 'Карма',
                        description: [
                            `**Карма** — система оценивания пользователей по их активности. На карму влияют, по большей части, ваши сообщения, а так же то, как вы взаимодействуете с нашим коммьюнити.`,
                            `Карму за сообщения можно получить за общение в <#968549637894054000>, публикации в вашем диттере а так же комментарии. Если вы кому-то написали комментарий под публикацией в диттере, карму получите как и вы, так и автор публикации. Если вы просто общаетесь - вы тоже получаете карму.\n`,
                            `Репутация. Репутация так же влияет на вашу карму. Раз в час, вы, как и другие участники сервера, можете повышать или понижать кому-то репутацию используя две команды - "Respect" и "Disrespect". Учтите, что на одного пользователя действует задержка в 24 часа, из-за чего вы не сможете каждый час менять репутацию одному и тому же пользователю. Репутацию так же можно повысить через реакции :star: - если вам понравилось какое-то сообщение, вы можете поставить на него реакцию ":star:". Когда сообщение наберёт 4 реакций :star:, оно автоматически попадёт в <#959394384464474162>, а автор сообщения получит по 0.45 репутации за каждую звезду.\n`,
                            `Вы так же можете получить карму и за помощь серверу - отзывы, бусты и прочая помощь. :)`
                        ].join('\n'),
                        components: [new discord.MessageActionRow().addComponents(
                            new discord.MessageButton({ customId: 'menu::getStarted::1', style: 'SECONDARY', label: 'Предыдущая страница', emoji: { name: 'backward', id: '849896610833498112' } }),
                            new discord.MessageButton({ customId: 'menu::getStarted::3', style: 'SECONDARY', label: 'Следующая страница', emoji: { name: 'forward', id: '849896610997207040' } }),
                            // new discord.MessageButton({ customId: 'menu::ditters::$::ref:object[{Guidebook}]', style: 'PRIMARY', label: 'Диттеры' }),
                        )]
                    },
                    {
                        image: 'https://cdn.discordapp.com/attachments/972423286401138728/972440328428748800/GB_RM.png',
                        title: 'Диттеры',
                        description: [
                            `**Диттер** - ваш собственный персональный блог, в который вы можете писать всё что угодно.\n`,
                            `Создать диттер, как и изменить его, можно в кнопке под сообщением выше. Создание диттера требует наличие как минимум **5 едениц** кармы. Вы так же можете создать и второй диттер, но для этого нужно уже **50** едениц кармы. Для третьего - **100*, и так далее.\n`,
                            `Впрочем, со всеми остальными фичами вы сможете ознакомиться позже, а теперь пришла пора закончить путеводитель!`
                        ].join('\n'),
                        components: [new discord.MessageActionRow().addComponents(
                            new discord.MessageButton({ customId: 'menu::getStarted::2', style: 'SECONDARY', label: 'Предыдущая страница', emoji: { name: 'backward', id: '849896610833498112' } }),
                            new discord.MessageButton({ customId: 'menu::getStarted::4', style: 'SUCCESS', label: 'Закончить', emoji: { name: '🎉' } }),
                            // new discord.MessageButton({ customId: 'menu::roles::$::ref:object[{Guidebook}]', style: 'PRIMARY', label: 'Роли' }),
                        )]
                    },
                    {
                        image: 'https://cdn.discordapp.com/attachments/972423286401138728/972440328709742642/GB_FINISHED.png',
                        title: 'Вы сделали это! :tada:',
                        description: 'Вы прошли весь путеводитель! Мы надеемся, что теперь вы более информированы обо всем и не стесняетесь начать общение в <#968549637894054000> прямо сейчас! Выберите себе какие-то роли, начните общаться.\nНе забудьте так же оставить отзыв о сервере в <#960933085220843540> через <:slash:925004408935292969> **feedback**! Каждый отзыв по-своему ценен, и помогает серверу в его развитии!\nВы так же можете создать свой профиль через `/profile create`, чтобы рассказать другим участникам сервера побольше о вас!\n\nУдачи! Желаем вам весело провести у нас время!',
                        components: []
                    },
                ]

                const step = steps[parseInt(a[0]) || 0] || steps[0];

                await _reply({
                    ephemeral: true,
                    embeds: [
                        new discord.MessageEmbed({
                            title: step.title,
                            description: step.description,
                            color: '#2F3136',
                        }).setImage(step.image)
                    ],
                    components: step.components
                })
            }
        })
    }
}