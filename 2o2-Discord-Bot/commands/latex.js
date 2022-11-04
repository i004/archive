const discord = require('discord.js');
const BaseCommand = require('../core/BaseCommand');
const needle = require('needle');

const DEFAULT_PREAMBLE = `
\\usepackage{amsmath} \\usepackage{amsfonts} \\usepackage{amssymb} \\usepackage{geometry} \\usepackage{graphicx} \\usepackage{adjustbox}
\\usepackage{balance} \\usepackage{pgfplots} \\usepackage{tikz} \\usepackage{xcolor} \\usepackage{xparse} \\usepackage{makeidx}
\\usepackage{enumitem} \\usepackage{longtable} \\usepackage{array} \\usepackage{listings}
`;

module.exports = class LaTeX extends BaseCommand {
    constructor (client) {
        super({
            client,
            name: 'latex',
            description: 'LaTeX generator',
            descriptionLocalizations: {
                ru: 'Генератор LaTeX',
                uk: 'Генератор LaTeX'
            },
            options: [
                {
                    name: 'formula',
                    description: 'Formula',
                    descriptionLocalizations: { ru: 'Формула', uk: 'Формула' },
                    type: 'STRING',
                    required: true
                },
                {
                    name: 'font_size',
                    description: 'Font size (px)',
                    descriptionLocalizations: { ru: 'Размер шрифта (px)', uk: 'Розмір шрифту (px)' },
                    type: 'INTEGER',
                    required: false,
                },
                {
                    name: 'preamble',
                    description: 'Custom LaTeX Document Preamble',
                    descriptionLocalizations: { ru: 'Пользовательская преамбула документа LaTeX', uk: 'Спеціальна преамбула документа LaTeX' },
                    type: 'STRING',
                    required: false,
                }
            ]
        });

        this.client.on('messageCreate', async (message) => {
            if (!message.guild || message.author.bot || !message.content) return;
            
            const codeblocks = message.content.match(/`{3}(la)?tex\n.+?`{3}/gs);
            if (!codeblocks) return;

            const embeds = [];
            const files = [];
            let i = 0;

            const timeout = setTimeout(() => message.react('🕒'), 3000);

            for (const codeblock of codeblocks) {
                const resp = await needle('post', 'https://quicklatex.com/latex3.f', {
                    formula: codeblock.split('\n').slice(1).join('\n').slice(0, -3),
                    preamble: DEFAULT_PREAMBLE,
                    fsize: '35px',
                    fcolor: '6976F3',
                    mode: 0, out: 1, errors: 1,
                    remhost: 'quicklatex.com'
                });

                const match = resp.body.match(/^([-]?\d+)\r\n(\S+)\s([-]?\d+)\s(\d+)\s(\d+)\r?\n?([\s\S]*)/);

                const data = {
                    status: match[1],
                    imageURL: match[2],
                    errorMessage: match[6]
                }

                if (data.status != '0')
                    embeds.push({ description: data.errorMessage ?? 'Something went wrong', color: '#ED4245' })
                else {
                    files.push({ attachment: (await needle('get', data.imageURL)).body, name: `render-${message.author.id}-${i}.png` });
                    embeds.push({ image: { url: `attachment://render-${message.author.id}-${i}.png` }, color: '#2F3136' })
                }

                i++;
            }

            clearTimeout(timeout);

            await message.react('✅');
            await message.reply({
                embeds,
                files,
                components: [
                    new discord.MessageActionRow()
                        .addComponents(
                            new discord.MessageButton({
                                emoji: { name: 'delete', id: '859832771698622465' },
                                style: 'DANGER',
                                customId: `system::delete::${message.author.id}`
                            })
                        )
                ],
                allowedMentions: { parse: [] }
            });
        })
    }

    /**
     * 
     * @param {discord.CommandInteraction} i 
     */
    async run (i) {
        const formula = i.options.getString('formula');
        const preamble = i.options.getString('premable', false) ?? DEFAULT_PREAMBLE;

        await i.deferReply();
        const resp = await needle('post', 'https://quicklatex.com/latex3.f', { formula, preamble, fsize: `${Math.abs(i.options.getInteger('font_size', false) || 35)}px`, fcolor: '6976F3', mode: 0, out: 1, errors: 1, remhost: 'quicklatex.com' })
        const match = resp.body.match(/^([-]?\d+)\r\n(\S+)\s([-]?\d+)\s(\d+)\s(\d+)\r?\n?([\s\S]*)/);

        const data = {
            status: match[1],
            imageURL: match[2],
            errorMessage: match[6]
        }

        if (data.status != '0')
            return i.editReply({ embeds: [{
                description: data.errorMessage ?? 'Something went wrong',
                color: '#ED4245'
            }] })
        
        await i.editReply({
            files: [{ attachment: (await needle('get', data.imageURL)).body, name: `render-${i.user.id}.png` }],
            embeds: [{
                image: { url: `attachment://render-${i.user.id}.png` },
                color: '#2F3136'
            }]
        });
    }
}