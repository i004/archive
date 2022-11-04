const Discord = require('discord.js');
const moment = require('moment');

module.exports = {
    name: 'reminders',
    description: 'View your reminders',
    run: async (ctx) => {
        const reminders = await ctx.client.db.fetchReminders(ctx.user.id);

        if (reminders.length == 0)
            return await ctx.send(ctx.i18n("reminders.noReminders"));
        
        let page = 0;
        const pages = [];

        for (let reminder of reminders)
            pages.push(new Discord.MessageEmbed()
                .setTitle(`#${reminder.reminder_id}`)
                .setURL(reminder.message_uri)
                .setDescription(`${ctx.i18n("reminders.in", {time: moment(parseInt(new Date().getTime()) + parseInt(reminder.expires)).locale(ctx.localeCode).fromNow(true)})} (<t:${Math.floor((new Date().getTime()+parseInt(reminder.expires))/1000)}:f>)\n\`\`\`\n${reminder.text}\`\`\``)
                .addField('\u200b', ctx.i18n("reminders.howToRemove")));
        
        const components = [
            new Discord.MessageActionRow()
                    .addComponents(
                        new Discord.MessageButton({label: '\u200b', emoji: {name: 'backward', id: '849896610833498112'}, style: 'PRIMARY', customID: 'backward'}),
                        new Discord.MessageButton({label: `1/${pages.length}`, style: 'SECONDARY', disabled: true, customID: 'currentPage'}),
                        new Discord.MessageButton({label: '\u200b', emoji: {name: 'forward', id: '849896610997207040'}, style: 'PRIMARY', customID: 'forward'}),
                        new Discord.MessageButton({label: `\u200b`, emoji: {name: 'delete', id: '859832771698622465'}, style: 'DANGER', customID: 'deleteReminder'})
                    )
        ];

        await ctx.send({
            embed: pages[0],
            embeds: [pages[0]],
            components: components
        });

        const msg = await ctx.fetchReply();
        const collector = msg.createMessageComponentInteractionCollector((i) => i.user.id == ctx.user.id, { time: 60*1000 });

        collector.on('collect', async (i) => {
            i.deferUpdate();
            if (i.customID == 'backward') page--;
            if (i.customID == 'forward') page++;
            if (i.customID == 'confirmDeletion') {
                collector.stop();
                await ctx.client.db.query("DELETE FROM reminders WHERE user_id=$1 AND reminder_id=$2", [reminders[page].user_id, reminders[page].reminder_id]);
                await ctx.editReply({
                    content: ctx.i18n("reminders.removed", {id: reminders[page].reminder_id}),
                    embed: null,
                    embeds: [],
                    components: []
                });
                return;
            }
            if (i.customID == 'cancelDeletion') {
                collector.stop();
                await ctx.editReply({
                    content: ctx.i18n("values.cancelled"),
                    embed: null,
                    embeds: [],
                    components: []
                });
                return;
            }
            if (i.customID == 'deleteReminder') {
                pages[page].fields = [];
                await ctx.editReply({
                    content: ctx.i18n("reminders.confirmDeletion"),
                    embed: pages[page],
                    embeds: [pages[page]],
                    components: [
                        new Discord.MessageActionRow()
                            .addComponents(
                                new Discord.MessageButton({label: ctx.i18n("values.yes"), style: 'SUCCESS', customID: 'confirmDeletion'}),
                                new Discord.MessageButton({label: ctx.i18n("values.cancel"), style: 'DANGER', customID: 'cancelDeletion'}),
                            )
                    ]
                })
                return;
            }
            if (page < 0) page = pages.length-1;
            if (page >= pages.length) page = 0;
            components[0].components[1].setLabel(`${page+1}/${pages.length}`);
            await ctx.editReply({
                embed: pages[page],
                embeds: [pages[page]],
                components: components
            });
        });
    }
}