const Discord = require('discord.js');
const moment = require('moment');

const parseTime = (x, d=false) => {
    let s = 0, text = '';
    const m = {
        s: 1,
        m: 60,
        h: 60*60,
        d: 24*60*60
    };
    const a = x.split(/[ ]+/g);
    let i = 0;
    for (let r of a) {
        if (isNaN(parseInt(r.slice(0, r.length-1))))
            if (d == false)
                return false;
            else
                break;
        s += m[r[r.length-1]] * parseInt(r.slice(0, r.length-1));
        i++;
    }
    return [s*1000, a.slice(i).join(" ")];
}

module.exports = {
    name: 'remind',
    aliases: ['remindme'],
    usage: '<time> [text]',
    description: 'Create a reminder',
    options: [
        {
            name: 'time',
            required: true,
            description: 'The time after which you need to be reminded',
            ctype: 'TIME',
            type: 'STRING'
        },
        {
            name: 'text',
            required: false,
            description: 'The message you want to be reminded of',
            type: 'STRING'
        }
    ],
    run: async (ctx) => {
        if (!ctx._args && !ctx.options)
            return await ctx.sendDelete(ctx.i18n("remind.noArgument"));

        let time, text;

        if (!ctx._args && ctx.options) {
            text = ctx.options.get('text').value;
            time = parseTime(ctx.options.get('time').value);
            if (!time)
                return await ctx.sendDelete(ctx.i18n("remind.invalidTime"));
            time = time[0];
        } else {
            const p = parseTime(ctx._args, true);
            time = p[0];
            text = p[1];
        }

        if (!time)
            return await ctx.sendDelete(ctx.i18n("remind.specifyTime"));
        
        text = text || "[no text specified]";
        
        await ctx.sendDelete(`${ctx.i18n("remind.added", {time: moment(new Date().getTime()+time).locale(ctx.localeCode).fromNow(true)})} (<t:${Math.floor((new Date().getTime()+time)/1000)}:f>)`);
        const msg = await ctx.fetchReply();
        const reminder = await ctx.client.db.query("INSERT INTO reminders VALUES (DEFAULT, $1, $2, $3, $4, $5, $6, $7) RETURNING *", [ctx.user.id, ctx.channel.id, time, text.slice(0, 500), msg.url.toString(), Date.now(), ctx.localeCode || 'en']);
        ctx.client.addReminder(reminder);
    }
}