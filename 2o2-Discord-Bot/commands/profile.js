const discord = require('discord.js');
const BaseCommand = require('../core/BaseCommand');
const {$} = require('../index');

module.exports = class Profile extends BaseCommand {
    constructor (client) {
        super({
            client,
            name: 'profile',
            description: 'Profile',
            descriptionLocalizations: {
                ru: 'Профиль',
                uk: 'Профіль'
            },
            subcommands: [ 'commands/profile/*.js' ]
        });
    }

    /**
     * 
     * @param {discord.User} user 
     * @param {{
     *  color?: discord.ColorResolvable,
     *  bio?: string,
     *  banner?: string | Buffer,
     *  fields?: string | { name: string, value: string }[],
     *  options?: string | string[]
     * }} profile 
     */
    async profileMessage (user, profile, footer=null) {
        const embed = new discord.MessageEmbed();
        const files = [];

        const options = profile.options ? typeof profile.options == 'string' ? JSON.parse(profile.options) : profile.options : [];
        
        if (footer) embed.setFooter({ text: footer });

        if (!options.includes('HIDE_AVATAR_THUMBNAIL'))
            embed.setThumbnail(user.displayAvatarURL())
        if (options.includes('AUTHOR_IN_FOOTER'))
            embed.setFooter({
                text: `Профиль ${user.username}`,
                iconURL: options.includes('AUTHOR_WITH_AVATAR') ? user.displayAvatarURL() : null
            });
        else
            embed.setAuthor({
                name: `Профиль ${user.username}`,
                iconURL: options.includes('AUTHOR_WITH_AVATAR') ? user.displayAvatarURL() : null
            });

        if (profile.color) embed.setColor(profile.color);
        if (profile.bio) embed.setDescription(profile.bio.replace(/`{3,}/g, '`'));
        
        if (Buffer.isBuffer(profile.banner)) {
            files.push({ name: 'banner.png', attachment: profile.banner });
            embed.setImage('attachment://banner.png');
        } else if (typeof profile.banner == 'string') embed.setImage(profile.banner)

        if (profile.fields) {
            const totalKarma = await $.totalKarma(user);
            const karma = await this.client.db.fetch('select * from karma where uid=$1', [user.id]) ?? { comment: 0, message: 0, star: 0, extra: 0 };
            const stats = await this.client.db.fetch('select * from stats where uid=$1', [user.id]) ?? { messages: 0, thread_messages: 0, file_messages: 0, reactions: 0, stars: 0 };
            const meta = await this.client.db.fetch('select * from meta where uid=$1', [user.id]) ?? { locale: 'en-US', last_online_at: Date.now(), last_message_at: Date.now() };
            
            const variables = {
                'переменная': 'О, а вы нашли пасхалку.',
                'karma': totalKarma, 'karma.comment': ~~karma.comment, 'karma.message': ~~karma.message, 'karma.star': ~~karma.star, 'karma.extra': ~~karma.extra,
                'stats.messages': stats.messages, 'stats.thread_messages': stats.thread_messages, 'stats.file_messages': stats.file_messages, 'stats.reactions': stats.reactions, 'stats.stars': stats.stars,
                'metrics.locale': meta.locale, 'metrics.last_online_at': ~~(meta.last_online_at / 1000), 'metrics.last_message_at': ~~(meta.last_message_at / 1000),
            };
            
            const fields = (typeof profile.fields == 'string' ? JSON.parse(profile.fields) : profile.fields);
            const applyVariables = (x) => {
                Object.keys(variables).forEach(y => x = x.replace(new RegExp(`%\{${y}\}`, 'g'), variables[y]));
                return x;
            }

            embed.addFields(
                fields.map(x => ({
                    name: x.name,
                    value: applyVariables(x.value).slice(0, 200),
                    inline: true
                }))
            );
        }
        // if (Array.isArray(profile.fields)) embed.addFields(profile.fields.map(x => ({ ...x, inline: true })));
        // else if (typeof profile.fields == 'string') embed.addFields(JSON.parse(profile.fields).map(x => ({ ...x, inline: true })));

        // embed.addField(`Карма`, )

        return {
            embeds: [embed],
            files
        };
    }
}