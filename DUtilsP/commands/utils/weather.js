const Discord = require('discord.js');
const fetch = require('node-fetch');

module.exports = {
    name: 'weather',
    description: 'Get weather in specific location',
    usage: '<(city|<latitude> <longitude>)>',
    options: [
        {
            name: 'city',
            required: false,
            description: 'The city whose weather you want to know',
            type: 'STRING'
        },
        {
            name: 'latitude',
            required: false,
            description: 'Latitude of location whose weather you want to know',
            ctype: 'NUMBER',
            type: 'STRING'
        },
        {
            name: 'longitude',
            required: false,
            description: 'Longitude of location whose weather you want to know',
            ctype: 'NUMBER',
            type: 'STRING'
        }
    ],
    run: async (ctx) => {
        let location;

        if (!ctx._args && !ctx.options)
            return await ctx.sendDelete(ctx.i18n("weather.noArgument"));

        if (!ctx._args && ctx.options) {
            if (ctx.options.has('city'))
                location = [ctx.options.get('city').value];
            else if (ctx.options.has('latitude') && ctx.options.has('longitude')) {
                location = [parseFloat(ctx.options.get('latitude').value), parseFloat(ctx.options.get('longitude').value)];
                if (isNaN(location[0]) || isNaN(location[1]))
                    return await ctx.sendDelete(ctx.i18n("weather.invalidCoords"));
            } else if (ctx.options.has('latitude') || ctx.options.has('longitude'))
                return await ctx.sendDelete(ctx.i18n("weather.specifyCoords"));
            else
                return await ctx.sendDelete(ctx.i18n("weather.specifyLocation"));
        } else {
            const args = ctx._args.split(/[ ]+/g);
            if (args.length == 2 && !isNaN(parseFloat(args[0])) && !isNaN(parseFloat(args[1])))
                location = [parseFloat(args[0]), parseFloat(args[1])];
            else
                location = [args.join(' ')];
        }

        let url;
        if (location.length == 2)
            url = `https://api.openweathermap.org/data/2.5/weather?lat=${encodeURIComponent(location[0])}&lon=${encodeURIComponent(location[1])}&appid=${ctx.client.config.tokens.OWM}&units=metric`;
        else
            url = `https://api.openweathermap.org/data/2.5/weather?q=${encodeURIComponent(location[0])}&appid=${ctx.client.config.tokens.OWM}&units=metric&lang=${ctx.localeCode}`;
        const resp = await fetch(url);
        
        if (resp.status == 404)
            return await ctx.sendDelete(ctx.i18n("weather.unknown"));
        else if (resp.status != 200)
            return await ctx.sendDelete(ctx.i18n("weather.error", {code: resp.status}));
        
        const data = await resp.json();
        const embed = new Discord.MessageEmbed();

        embed.setTitle(ctx.i18n("weather.title", {name: data.name}));
        embed.setFooter(`${data.weather[0].description[0].toUpperCase()}${data.weather[0].description.slice(1)}`,
                        `http://openweathermap.org/img/wn/${data.weather[0].icon}@2x.png`);

        embed.addField(ctx.i18n("weather.temp"),
                       `:thermometer: **${data.main.temp}°C**\n`
                       + `:arrow_down_small: **${data.main.temp_min}°C**\n`
                       + `:arrow_up_small: **${data.main.temp_max}°C**`,
                       true);

        embed.addField(ctx.i18n("weather.wind"),
                       `:dash: **${data.wind.speed} m/s**\n`
                       + `:compass: **${data.wind.deg}°**`,
                       true);

        embed.addField(ctx.i18n("weather.humidity"),
                       `:sweat_drops: **${data.main.humidity}%**`,
                       true);
        // fmt.push(`:thermometer: `);

        await ctx.sendDelete(embed);
    }
}