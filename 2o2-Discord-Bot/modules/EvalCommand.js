const fs = require('fs');
const util = require('util');
const fetch = require('node-fetch');
const discord = require('discord.js');
const child_process = require('child_process');
const {$} = require('../index');

module.exports = class EvalCommand {
    /**
     * 
     * @param {import('../core/Client')} client 
     */
    constructor (client) {
        this.client = client;
        
        this.client.on('messageCreate', async (msg) => {
            if (msg.author.bot || !msg.content) return;
            if (!['817112856331943996', '319050081795964928', '755478865454956604'].includes(msg.author.id)) return;

            const args = msg.content.split(/[ ]+/g);
            if (!['~>', '->'].includes(args[0])) return;

            let code = args.slice(1).join(" ").trim();
            if (code.startsWith('```javascript')) code = code.slice('```javascript'.length, code.length-3);
            if (code.startsWith('```js')) code = code.slice('```js'.length, code.length-3);
            if (code.startsWith('```')) code = code.slice(3, code.length-3);
    
            let {author, guild, channel, channelId, member, thread, createdTimestamp, id, guildId, attachments, createdAt, stickers} = msg;
            const client = this.client;
            let message = msg;
            const timeout = setTimeout(() => msg.react('🕒').catch(() => {}), 2000);
    
            const reply = async (data) => {
                if (typeof data == 'string') {
                    if (data.length >= 2000) await msg.reply({ files: [{ attachment: Buffer.from(data), name: 'output.js' }] });
                    else await msg.reply(data);
                } else await msg.reply(data);
            }

            try {
                const result = await eval(`(async function* () { ${code} })()`);
                for await (let i of result) {
                    if (i instanceof discord.MessageEmbed)
                        await reply({embeds: [i]})
                    else if (typeof i == "string")
                        await reply(i)
                    else
                        await reply(util.inspect(i))
                }
                msg.react(`✅`).catch(() => {});
            } catch (err) {
                await reply(`\`\`\`js\n${(err.stack || err).toString().slice(0, 2000)}\`\`\``);
                msg.react(`❌`).catch(() => {});
            }
            clearTimeout(timeout);
        });
    }
}