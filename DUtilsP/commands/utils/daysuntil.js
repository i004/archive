const Discord = require('discord.js');
const { date } = require('../../assets/regex');
const moment = require('moment');

module.exports = {
    name: 'daysuntil',
    description: 'Calculate how many days are left until a certain date',
    aliases: ['daysbefore', 'daysafter', 'timeuntil', 'timebefore', 'timeafter'],
    usage: '<date>',
    options: [
        {
            name: 'date',
            required: true,
            description: 'Date (DD.MM.YYYY or DD/MM/YYYY)',
            ctype: 'DATE',
            type: 'STRING'
        }
    ],
    run: async (ctx) => {
        if (!ctx._args && !ctx.options)
            return await ctx.sendDelete(ctx.i18n("daysuntil.noArgument"));

        const dt = (ctx._args || ctx.options.get('date').value).replace(/\./g, '/');

        if (!dt.match(date))
            return await ctx.sendDelete(ctx.i18n("daysuntil.invalidFormat"));
        
        try {
            await ctx.sendDelete(moment(dt, "DD/MM/YYYY").locale(ctx.localeCode).fromNow());
        } catch (err) {
            return await ctx.sendDelete(ctx.i18n("daysuntil.invalidFormat"));
        }
    }
}