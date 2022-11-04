const Discord = require('discord.js');
const fetch = require('node-fetch');
const dns = require('dns');

module.exports = {
    name: 'whois',
    aliases: ['ipinfo'],
    description: 'Get information about IP or website',
    usage: '<website>',
    options: [
        {
            name: 'website',
            required: true,
            description: 'Website',
            type: 'STRING'
        }
    ],
    run: async (ctx) => {
        if (!ctx._args && !ctx.options)
            return await ctx.sendDelete(ctx.i18n("whois.noArgument"));

        const website = ctx._args || ctx.options.get('website').value;
        const req = await fetch(`http://ip-api.com/json/${encodeURIComponent(website)}`);
        const data = await req.json();

        if (data.status == "fail")
            return await ctx.sendDelete(ctx.i18n("whois.invalid"));
        
        dns.resolveAny(website.toLowerCase(), async (dnsErr, dnsList) => {
            const unknown = ctx.i18n("whois.unknown");
            // const yes = ctx.i18n("values.yes");
            // const no = ctx.i18n("values.no");
    
            const embed = new Discord.MessageEmbed();
            
            embed.setFooter(data.query || website.toLowerCase());
            embed.addField(
                ctx.i18n("whois.fields.location"),
                ctx.i18n("whois.fieldValues.location", {continent: data.continent ?? unknown, country: data.country ?? unknown, city: data.city ?? unknown, regionName: data.regionName ?? unknown, lat: data.lat ?? unknown, lon: data.lon ?? unknown}),
                true
            );
            embed.addField(
                ctx.i18n("whois.fields.domain"),
                ctx.i18n("whois.fieldValues.domain", {isp: data.isp ?? unknown, org: data.org ?? unknown, as: data.as ?? unknown}),
                true
            );
            if (!dnsErr && dnsList && dnsList.length > 0)
                embed.addField(
                    ctx.i18n("whois.fields.dns"),
                    dnsList.map(x => `[\`${x.type}\`] **${x.address || x.exchange || x.value || unknown}**`).join('\n')
                );
            // embed.addField(
            //     ""IP",
            //     ctx.i18n("whois.fieldValues.ip", {mobile: data.mobile ? yes : no, proxy: data.proxy ? yes : no, hosting: data.hosting ? yes : no}),
            //     true
            // );
    
            await ctx.sendDelete(embed);
        })
    }
}