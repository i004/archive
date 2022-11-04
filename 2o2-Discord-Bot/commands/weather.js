const discord = require('discord.js');
const BaseCommand = require('../core/BaseCommand');
const needle = require('needle');
const {$} = require('../index');
const { api: { owm: OWMAppID } } = require('../config.json');
const { createCanvas, loadImage } = require('canvas');

module.exports = class Test extends BaseCommand {
    constructor (client) {
        super({
            client,
            name: 'weather',
            description: 'Weather',
            descriptionLocalizations: { ru: 'Погода', uk: 'Погода' },
            options: [
                {
                    name: 'city',
                    required: true,
                    type: 'STRING',
                    description: 'City',
                    descriptionLocalizations: { ru: 'Город', uk: 'Місто' }
                }
            ]
        });
    }

    async imgCurrent (data, cityName) {
        const canvas = createCanvas(900, 400);
        const ctx = canvas.getContext('2d');
        const current = data.daily[0];

        ctx.fillStyle = '#1f1f1f';
        $.image.roundRect(ctx, 0, 0, canvas.width, canvas.height, 20, true, false);
        
        ctx.fillStyle = ctx.strokeStyle = '#2c2c2c';
        $.image.roundRect(ctx, 50, 50, 100, 100, 10, true, false);

        ctx.drawImage( await loadImage(`http://openweathermap.org/img/wn/${current.weather[0].icon}@2x.png`), 50, 50, 100, 100 );

        ctx.fillStyle = '#ffffff';
        ctx.textBaseline = 'middle';
        ctx.font = '90px "Whitney Book"';

        const temp = `${~~data.current.feels_like}`;
        const tempMeas = ctx.measureText(temp).width;
        ctx.fillText(temp, 175, 90);
        
        ctx.font = '32px "Whitney Book"';
        ctx.textBaseline = 'top';
        ctx.fillText(`°С`, 175+tempMeas, 50);
        const cMeas = ctx.measureText(`°C`).width;
        
        ctx.lineCap = 'round';
        ctx.moveTo(175+tempMeas+cMeas+16, 50);
        ctx.lineTo(175+tempMeas+cMeas+16, 150);
        ctx.stroke();
        
        ctx.font = '48px "Whitney Book"';
        ctx.textAlign = 'right';
        ctx.fillText(cityName, canvas.width-32, 50);
        
        ctx.font = '32px "Whitney Book"';
        ctx.fillStyle = '#9c9c9c';
        ctx.fillText(current.weather[0].description, canvas.width-32, 50+48);
        
        ctx.font = '24px "Whitney Book"';
        ctx.textAlign = 'left';
        ctx.textBaseline = 'middle';
        ctx.fillText(`Precipitation: ${~~(current.pop*100)}%\nHumidity: ${~~(data.current.humidity)}%\nWind: ${~~(data.current.wind_speed * 3.6)} km/h`, 175+tempMeas+cMeas+32, 70);

        const hours = {};
        for (const hour of data.hourly) {
            const h = new Date(hour.dt * 1000).getHours();
            if (!hours[h]) hours[h] = [];
            hours[h].push(hour.temp);
        }

        for (let h in hours)
            hours[h] = hours[h].reduce((p, c) => p + c, 0) / hours[h].length;

        const padding = 50;
        const h = canvas.height - 150;

        const maxTemp = Math.max(...Object.values(hours));

        const f = (v) => h + ((maxTemp-v) / maxTemp) * h,
              g = (y) => maxTemp*(2-y/h);

        let x = padding,
            i = 0;

        const points = Object.values(hours)
            .map((v, _, a) => ({
                x: [x, x += (canvas.width - padding) / a.length][0],
                y: f(v) - padding
            }));
        
        // draw graph

        ctx.beginPath();
        ctx.moveTo(points[0].x, points[0].y);

        ctx.lineWidth = 5;
        ctx.lineCap = 'round';
        ctx.strokeStyle = '#EC6E4C';
        
        points.push(0);

        for (i = 1; i < points.length-1; i++) {
            if (!points[i]) break;

            const xc = (points[i].x + points[i + 1].x) / 2;
            const yc = (points[i].y + points[i + 1].y) / 2;

            ctx.quadraticCurveTo(points[i].x, points[i].y, xc, yc);
        }

        points.pop();
        ctx.stroke();
        
        // ctx.fillStyle = ctx.strokeStyle = 'rgba(236, 110, 76, 0.5)';

        // ctx.moveTo(padding, points[0].y);
        // ctx.lineTo(padding, canvas.height-padding);
        // ctx.lineTo(canvas.width-padding, canvas.height-padding);
        // ctx.lineTo(canvas.width-padding, points[points.length-1].y);

        // ctx.fill();

        ctx.fillStyle = '#9c9c9c';
        ctx.font = '16px "Whitney Book"';

        // for (let y = padding / 2; y < canvas.height; y += padding) {
        //     ctx.moveTo(padding, y);
        //     ctx.lineTo(canvas.width, y);
        //     ctx.fillText((~~g(y)).toString(), padding/4, y + 8) // fontsize/2
        // }

        let xt = padding,
            len = Object.keys(hours).length;

        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        
        for (let i = 0; i < len; i += 2) {
            const hour = Object.keys(hours)[i];
            ctx.fillText(`${hour.toString().padStart(2, '0')}:00`, xt, canvas.height - padding / 2);
            
            xt += (canvas.width - padding) / len * 2;
        }

        return canvas.toBuffer();
    }

    async imgForecast (data) {
        const canvas = createCanvas(900, 300);
        const ctx = canvas.getContext('2d');

        ctx.fillStyle = '#1f1f1f';
        $.image.roundRect(ctx, 0, 0, canvas.width, canvas.height, 20, true, false);

        ctx.fillStyle = '#2c2c2c';
        $.image.roundRect(ctx, 50, 30, 100, canvas.height-60, 10, true, false);

        const pX = 800/8;
        const icons = {};

        for (let j = 0; j < 8; j++) {
            const day = data.daily[j];
            const time = new Date((day.dt + data.timezone_offset) * 1000);

            const X = j*pX+pX/2 + 50;
            
            const icon = icons[day.weather[0].icon] || (icons[day.weather[0].icon] = await loadImage(`http://openweathermap.org/img/wn/${day.weather[0].icon}@2x.png`));

            ctx.drawImage(icon, X-50, canvas.height/2-50, 100, 100);
            
            ctx.textAlign = 'center';
            ctx.fillStyle = '#ffffff';
            ctx.font = '32px "Whitney Book"';
            ctx.fillText(`${[ 'Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat' ][time.getDay()]}`, X, canvas.height/2-60);
            
            ctx.textAlign = 'left';
            ctx.font = '24px "Whitney Book"';
            ctx.fillText(`${~~day.temp.max}°`, X-35, canvas.height-80);
            ctx.fillStyle = '#9c9c9c';
            ctx.fillText(`${~~day.temp.min}°`, X-35, canvas.height-50);
        }

        return canvas.toBuffer();
    }

    /**
     * 
     * @param {discord.CommandInteraction} i 
     */
    async run (i) {
        const city = i.options.getString('city').split(',');
        
        const cityReq = (await needle('get', `http://api.openweathermap.org/geo/1.0/direct?q=${encodeURIComponent(`${city[1] || ""},${city[0]}`.replace(/^,/, ''))}&limit=1&appid=${OWMAppID}`));
        if (!cityReq.body || !cityReq.body[0])
            return await i.reply({ content: 'Неизвестный город.', ephemeral: true });
        
        await i.deferReply();
        const { local_names, lat, lon } = cityReq.body[0];

        const weatherReq = await needle('get', `https://api.openweathermap.org/data/2.5/onecall`
                    + `?lat=${lat}`
                    + `&lon=${lon}`
                    + `&exclude=minutely,alerts`
                    + `&units=metric`
                    + `&lang=${["uk", "ru"].includes(i.locale) ? i.locale : "en"}`
                    + `&appid=${OWMAppID}`)

        const data = weatherReq.body;

        await i.editReply({
            files: [
                {
                    attachment: await this.imgCurrent(data, local_names[i.locale] || local_names.en),
                    name: 'current.png'
                },
                {
                    attachment: await this.imgForecast(data),
                    name: 'forecast.png'
                }
            ]
        })
    }
}