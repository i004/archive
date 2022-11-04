const discord = require('discord.js');
const BaseCommand = require('../core/BaseCommand');
const { createCanvas, registerFont } = require('canvas');
const {$} = require('../index');

registerFont('assets/font/whitneybook.otf', { family: 'Whitney', style: 'Book' });

module.exports = class Karma extends BaseCommand {
    constructor (client) {
        super({
            client,
            name: 'karma',
            description: 'User Karma',
            descriptionLocalizations: {
                ru: 'Карма пользователя',
                uk: 'Карма користувача'
            },
            options: [
                {
                    name: 'user',
                    description: 'User',
                    descriptionLocalizations: { ru: 'Пользователь', uk: 'Користувач' },
                    type: 'USER',
                    required: false
                }
            ]
        });
    }

    async generateKarmaGraph (user) {
        const karmaChanges = (await this.client.db.all("select * from karma_change where uid=$1 and timestamp > $2 order by timestamp asc", [this.client.users.resolveId(user), Date.now()-(1000*3600*24*14)]));
        const days = {};

        const now = ~~(Date.now() / 1000);
        const day = 3600 * 24;

        for (let t = ~~(parseInt(karmaChanges[0].timestamp) / 1000); t < now; t += day) {
            const s = (x => `${x.getDate()}-${x.getMonth()}`)(new Date(t * 1000));
            days[s] = 0;
        }
        
        for (const change of karmaChanges) {
            const date = (x => `${x.getDate()}-${x.getMonth()}`)(new Date(parseInt(change.timestamp)));
            if (!days[date]) days[date] = 0;
            days[date] += change.change;
        }

        const canvas = createCanvas(964, 400);
        const ctx = canvas.getContext('2d');

        ctx.fillStyle = '#202225';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        
        if (Object.keys(days).length < 3) {
            ctx.fillStyle = '#216ADD';
            ctx.textAlign = 'center';
            
            ctx.font = '72px "Whitney Book"';
            ctx.fillText(`Not enough data`, canvas.width/2, canvas.height/2);
            
            ctx.fillStyle = '#747F8D';
            ctx.font = '48px "Whitney Book"';
            ctx.fillText(`Wait at least ${3-Object.keys(days).length} day(s)`, canvas.width/2, canvas.height/2 + 72);

            return canvas.toBuffer();
        }

        // lines & text

        const padding = 64;
        const h = canvas.height / 2.5;

        const maxChange = Math.max(...Object.values(days));

        const f = (x) => h + ((maxChange-x) / maxChange) * h,
              g = (y) => maxChange*(2-y/h);

        ctx.strokeStyle = '#40444B';
        ctx.fillStyle = '#747F8D';
        ctx.lineWidth = 3;
        
        ctx.font = '16px "Whitney Book"';

        ctx.beginPath();

        for (let y = padding / 2; y < canvas.height; y += padding) {
            ctx.moveTo(padding, y);
            ctx.lineTo(canvas.width, y);
            ctx.fillText((~~g(y)).toString(), padding/4, y + 8) // fontsize/2
        }

        let xt = 0,
            len = Object.keys(days).length;

        ctx.textAlign = 'center';
        
        for (let i = 0; i < len; i++) {
            xt += (canvas.width - padding) / len;

            const date = Object.keys(days)[i].split('-');
            ctx.fillText(`${{
                0: 'Jan', 1: 'Feb', 2: 'Mar',
                3: 'Apr', 4: 'May', 5: 'Jun',
                6: 'Jul', 7: 'Aug', 8: 'Sep',
                9: 'Oct', 10: 'Nov', 11: 'Dec'
            }[date[1]]} ${date[0].padStart(2, '0')}`, xt, canvas.height - padding / 5);
            
            ctx.moveTo(xt, canvas.height - padding + padding / 4);
            ctx.lineTo(xt, canvas.height - padding / 2);
        }

        ctx.stroke();

        // prepare

        let x = 0,
            i = 0;

        const points = Object.values(days)
            .map((v, _, a) => ({
                x: x += (canvas.width - padding) / a.length,
                y: f(v) - padding
            }));
        
        points.unshift({ x: padding, y: f(Object.values(days)[0]) - padding });
        points.push({ x: canvas.width+padding, y: f(Object.values(days).slice(-1)[0]) - padding });
        
        // draw graph

        ctx.beginPath();
        ctx.moveTo(points[0].x, points[0].y);

        ctx.lineWidth = 5;
        ctx.lineCap = 'round';
        ctx.strokeStyle = '#216ADD'
        
        for (i = 1; i < points.length-1; i++) {
            const xc = (points[i].x + points[i + 1].x) / 2;
            const yc = (points[i].y + points[i + 1].y) / 2;

            ctx.quadraticCurveTo(points[i].x, points[i].y, xc, yc);
        }

        ctx.stroke();
        
        return canvas.toBuffer();
    }

    /**
     * 
     * @param {discord.GuildMember} member 
     */
     async generateMessage (member) {
        const user = member.user;

        const karma = (await this.client.db.fetch("select * from karma where uid=$1", [user.id])) ?? { message: 0, reputation: 0, extra: 0 };
        const stats = (await this.client.db.fetch("select * from stats where uid=$1", [user.id])) ?? { messages: 0, thread_messages: 0, file_messages: 0, reactions: 0, stars: 0 };

        const karmaChanges = (await this.client.db.all("select * from karma_change where uid=$1 and timestamp > $2 order by timestamp desc", [user.id, Date.now()-(1000*3600*24*7)]));
        const changes = [];

        for (let j = 0; j < karmaChanges.length; j++) {
            const change = karmaChanges[j];
            let c = 1;

            while (karmaChanges[j+1] && change.type == karmaChanges[j+1].type && change.reason == karmaChanges[j+1].reason) {
                change.change += karmaChanges[j+1].change;
                c++; j++;
            }

            changes.push({ type: change.type, reason: change.reason, change: change.change, count: c });
        }

        const fmt = {
            message: {
                SENT_MESSAGE: (x) => `Отправлено ${x.count} сообщений`
            },
            comment: {
                POSTED_COMMENT: (x) => `Опубликовано ${x.count} комментариев`,
                RECEIVED_COMMENT: (x) => `Получено ${x.count} комментариев`
            },
            // star: {
            //     STAR: (x) => `Получено ${x.count} звёзд`
            // }
        }

        const totalKarma = await $.totalKarma(user);

        const icons = [
            [300, 'https://cdn.discordapp.com/attachments/939532062153637940/969964868520247386/unknown.png'],
            [200, 'https://cdn.discordapp.com/emojis/969914815608946708.png?v=1'],
            [100, 'https://cdn.discordapp.com/emojis/969914793165221928.png?v=1'],
            [50, 'https://cdn.discordapp.com/emojis/969914758214070422.png?v=1']
        ]

        return {
            embeds: [
                new discord.MessageEmbed()
                    .setAuthor({ name: `Карма ${user.username}`, iconURL: user.avatarURL() })
                    .addField('Message Karma', (~~karma.message).toString() || '0', true)
                    .addField('Reputation', (~~karma.reputation).toString() || '0', true)
                    .addField('Additional Karma', (~~karma.extra).toString() || '0', true)
                    .addField('\u200b', `**${user.username}** отправил ${stats.messages} сообщений, ${stats.thread_messages} из которых были в ветках и ${stats.file_messages} из которых имели файлы. Всего ${user.username} добавил ${stats.reactions} реакций.`, true)
                    .addField('\u200b', (
                        changes
                            .filter(x => fmt[x.type] && fmt[x.type][x.reason] && x.count && x.change >= 1)
                            .slice(0, 5)
                            .map(x => `\`${x.change >= 0 ?"+":""}${~~x.change == 0 ? ~~(x.change*10)/10 : ~~x.change}\` ${fmt[x.type][x.reason](x)}`)
                            .join('\n'))
                        || '\u200b', true)
                    .setFooter({
                        iconURL: (icons.find(x => totalKarma >= x[0])
                                  || [, 'https://cdn.discordapp.com/attachments/960977599696351284/961006978392526938/141d49436743034a59dec6bd5618675d.png'])[1],
                        text: `${totalKarma} кармы`
                    })
                    .setImage(`attachment://karma-graph-${user.id}.png`)
            ],
            files: [{
                attachment: await this.generateKarmaGraph(user),
                name: `karma-graph-${user.id}.png`
            }]
        }
    }

    /**
     * 
     * @param {discord.CommandInteraction} i 
     */
    async run (i) {
        const member = i.options.getMember('user', false) ?? i.member;

        if (member.user.bot) return i.reply({
            content: 'Beep boop. 01010100011010000110100101110011001000000110100101110011001000000110000100100000011000100110111101110100. Boop beep!'
        })

        await i.reply(await this.generateMessage(member));
    }
}