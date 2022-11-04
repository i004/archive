const discord = require('discord.js');
const BaseCommand = require('../core/BaseCommand');
const { createCanvas, registerFont } = require('canvas');
const {$} = require('../index');

registerFont("assets/font/whitneybook.otf", { family: 'Whitney', style: 'Book' });

module.exports = class GlobalKarma extends BaseCommand {
    constructor (client) {
        super({
            client,
            name: 'globalkarma',
            description: 'Global Karma Growth Graph',
            descriptionLocalizations: {
                ru: 'График глобального роста кармы',
                uk: 'Графік глобальної зміни карми'
            }
        });
    }

    async karmaChangeDays () {
        const karmaChanges = (await this.client.db.all("select * from karma_change where timestamp > $1 order by timestamp asc", [Date.now()-(1000*3600*24*14)]));
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

        return days;
    }

    async generateKarmaGraph () {
        const days = await this.karmaChangeDays();

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
        const h = canvas.height / 2.75;

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
                y: f(v) - padding,
            }));
        
        points.unshift({ x: padding, y: f(Object.values(days)[0]) - padding });
        points.push({ x: canvas.width+padding, y: f(Object.values(days).slice(-1)[0]) - padding });

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
     * @param {discord.CommandInteraction} i 
     */
    async run (i) {
        const day = 1000*3600*24;

        const karmaChanges = (await this.client.db.all("select * from karma_change where timestamp > $1 order by timestamp asc", [Date.now()-(day*14)]));
        const days = Object.values(await this.karmaChangeDays());
        
        const total = karmaChanges.reduce((p, c) => p + c.change, 0);
        const today = karmaChanges.filter(x => x.timestamp >= Date.now()-day).reduce((p, c) => p + c.change, 0);
        const duration = Date.now() - parseInt(karmaChanges[0].timestamp) + day;
        const avg = days.reduce((p, c) => p + c, 0) / days.length;

        await i.reply({
            content: `**Общий рост кармы**\nКарма поменялась на **${~~total}** ед. за послед. ${$.formatTime(duration, false, 'days')} (в среднем ${~~avg}/день)\nЗа сегодня карма поменялась на **${~~today}** ед.`,
            files: [{
                attachment: await this.generateKarmaGraph(),
                name: 'graph.png'
            }]
        });
    }
}