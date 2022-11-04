const Discord = require('discord.js');
const gse = require("general-search-engine");

module.exports = {
    name: 'googleimage',
    description: 'Search in Google Images',
    usage: '<query>',
    options: [
        {
            name: 'query',
            required: true,
            description: 'Search query',
            type: 'STRING'
        }
    ],
    run: async (ctx) => {
        return await ctx.send("Temporary disabled.");

        if (!ctx._args && !ctx.options)
            return await ctx.send(ctx.i18n("google.noArgument"));
        
        const query = ctx._args || ctx.options.get('query').value;
        const results = await new gse.search()
            .setType("image")
            .setQuery(query)
            .run();
        
        if (!results || results.length == 0)
            return await ctx.send(ctx.i18n("google.nothingFound"));
        
        let page = 0;
        const pages = [];

        for (let result of results)
            pages.push(new Discord.MessageEmbed()
                .setAuthor(result.title, '', `http://${result.from}`)
                .setFooter(result.from)
                .setImage(result.image));
        
        const components = [
            new Discord.MessageActionRow()
                    .addComponents(
                        new Discord.MessageButton({label: '\u200b', emoji: {name: 'backward', id: '849896610833498112'}, style: 'PRIMARY', customID: 'backward'}),
                        new Discord.MessageButton({label: `1/${pages.length}`, style: 'SECONDARY', disabled: true, customID: 'currentPage'}),
                        new Discord.MessageButton({label: '\u200b', emoji: {name: 'forward', id: '849896610997207040'}, style: 'PRIMARY', customID: 'forward'})
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