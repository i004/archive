const Discord = require('discord.js');
const { MessageButton, MessageActionRow } = require('discord-buttons');
const { MessageEmbed } = require('discord.js');
const moment = require('moment');
const ButtonMenu = require('../modules/ButtonMenu');
const { materials, items } = require('../modules/Items');
const {inspect} = require('util');

module.exports = class Economy {
    constructor(bot) {
        this.bot = bot;

        this.jobs = {
            programmer: {
                avg: 500,
                def: 100,
                skills: 20
            },
            scientist: {
                avg: 400,
                def: 50,
                skills: 15
            },
            firefighter: {
                avg: 100,
                def: 50,
                skills: 9
            },
            police: {
                avg: 100,
                def: 50,
                skills: 9
            },
            teacher: {
                avg: 50,
                def: 25,
                skills: 4
            },
            cashier: {
                avg: 25,
                def: 15,
                skills: 2
            },
            courier: {
                avg: 15,
                def: 5,
                skills: 0
            },
            janitor: {
                avg: 15,
                def: 5,
                skills: 0
            }
        };

        this.bot.addCommand({
            name: 'profile',
            aliases: ['pf', 'pr'],
            run: async (ctx) => {
                const cards = await ctx.bot.db.query("SELECT * FROM balance WHERE user_id=$1", [ctx.author.id], {array: true});
                const types = [
                    'Classic',
                    'Premium',
                    'Ultimate'
                ];
                const cardEmojis = [
                    '<:card:853556192311115826>', // default (yellow)
                    '<:greenCard:853611720621686795>', // premium (green)
                    '<:blueCard:853611720923807805>', // ultimate (blue)
                ];
                
                if (!cards)
                    return await ctx.send(ctx.i18n("commands.card.notExists"));
                
                const shards = await ctx.bot.db.query("SELECT * FROM shards WHERE user_id=$1", [ctx.author.id]);

                const embed = new MessageEmbed();

                embed.setTitle(ctx.i18n("commands.profile.title"));
                embed.setThumbnail(ctx.author.avatarURL({dynamic: true}));
                
                embed.addField(ctx.i18n("commands.profile.cards"), cards.map(x => `${cardEmojis[x.type]} ${x.cardid} (${types[x.type]})`).join('\n'), true);
                embed.addField(ctx.i18n("commands.profile.bankBalance"), `${cards.map(x => parseInt(x.balance)).reduce((a, b) => a + b, 0)}<:45coins:853533949938499625>`, true);
                embed.addField(ctx.i18n("commands.profile.cash"), `0<:45coins:853533949938499625>`, true);
                embed.addField(ctx.i18n("commands.profile.shards"), `${shards?.shards ?? 0}<:shard:854357851773992990>`, true);

                await ctx.send(embed);
            }
        })

        this.bot.addCommand({
            name: 'card',
            aliases: ['balance'],
            module: 'Economy',
            run: async (ctx) => {
                const cards = await ctx.bot.db.query("SELECT * FROM balance WHERE user_id=$1", [ctx.author.id], {array: true});
                const cardTypes = [
                    'Classic',
                    'Premium',
                    'Ultimate'
                ];
                const cardThumbnails = [
                    'https://cdn.discordapp.com/emojis/853556192311115826.png?v=1', // default (yellow)
                    'https://cdn.discordapp.com/emojis/853611720621686795.png?v=1', // premium (green)
                    'https://cdn.discordapp.com/emojis/853611720923807805.png?v=1', // ultimate (blue)
                ];
                const cardEmojis = [
                    '853556192311115826', // default (yellow)
                    '853611720621686795', // premium (green)
                    '853611720923807805', // ultimate (blue)
                ];
                
                if (!cards)
                    return await ctx.send(ctx.i18n("commands.card.notExists"));

                const menu = new ButtonMenu(ctx);

                for (let card of cards) {
                    menu.addPage(new MessageButton({label: card.cardid, style: 'gray'})
                                    .setEmoji(cardEmojis[card.type]),
                                 new MessageEmbed()
                                    .setTitle(ctx.i18n("commands.card.cardInfo"))
                                    .setDescription(`${ctx.i18n("commands.card.number")}: \`${card.cardid}\``)
                                    .addField(ctx.i18n("commands.card.expiryDate"), moment(parseInt(card.expires)).format("DD[.]MM"), true)
                                    .addField(ctx.i18n("commands.card.type"), `${cardTypes[card.type]}`, true)
                                    .addField(ctx.i18n("commands.card.balance"), `**${card.balance}**<:45coins:853533949938499625>`, true)
                                    .setThumbnail(cardThumbnails[card.type]));
                }

                await menu.sendMenu();
            }
        });

        this.bot.addCommand({
            name: 'card upgrade',
            module: 'Economy',
            run: async (ctx) => {
                const types = {
                    'classic': 0,
                    'premium': 500,
                    'ultimate': 1000
                };

                if (!await ctx.bot.db.query("SELECT * FROM balance WHERE user_id=$1", [ctx.author.id]))
                    return await ctx.send(ctx.i18n("commands.card.notExists"));

                const msg = await ctx.send(
                    ctx.i18n("commands.card_upgrade.select"),
                    {
                        components: new MessageActionRow()
                            .addComponent(new MessageButton({label: 'Premium', style: 'gray', id: 'premium'}))
                            .addComponent(new MessageButton({label: 'Ultimate', style: 'gray', id: 'ultimate'}))
                            .addComponent(new MessageButton({label: ctx.i18n("values.cancel"), style: 'red', id: 'cancel'}))
                    }
                );

                const filter = (button) => button.clicker.user.id === ctx.author.id;
                const collector = msg.createButtonCollector(filter, { time: 30 * 1000 });

                collector.on('collect', async (button) => {
                    button.defer();
                    collector.stop();
                    if (button.id == 'cancel')
                        await ctx.send(ctx.i18n("values.cancelled"));
                    else {
                        const type = Object.keys(types).indexOf(button.id);
                        const cost = types[button.id];
                        const card = await ctx.bot.db.query("SELECT * FROM balance WHERE user_id=$1", [ctx.author.id]);

                        if (card.balance < cost)
                            return await ctx.send(ctx.i18n('commands.card_upgrade.notEnoughMoney'));
                        
                        await ctx.bot.db.query("UPDATE balance SET type = $1, balance = balance - $2 WHERE user_id = $3", [type, cost, ctx.author.id]);
                        await ctx.send(ctx.i18n('commands.card_upgrade.upgraded', {type: button.id[0].toUpperCase() + button.id.slice(1)}))
                    }
                });
            }
        })

        this.bot.addCommand({
            name: 'mysterybox',
            module: 'Economy',
            run: async (ctx) => {
                const card = await ctx.bot.db.query("SELECT * FROM balance WHERE user_id=$1", [ctx.author.id]);
                if (!card)
                    return await ctx.send(ctx.i18n("commands.card.notExists"));
                if (!ctx.args[0] || isNaN(parseInt(ctx.args[0])))
                    return await ctx.send(ctx.i18n("commands.mysterybox.specifyAmount"));
                const amount = parseInt(ctx.args[0]);
                if (amount < 10 || amount > 1000)
                    return await ctx.send(ctx.i18n("commands.mysterybox.minMax"));
                if (amount > card.balance)
                    return await ctx.send(ctx.i18n("commands.mysterybox.notEnoughMoney"));
                
                const buttons = [];
                const map = new Array(5).fill(0).map(() => new Array(5).fill(0));
                let row;

                for (let x = 0; x < 5; x++) {
                    row = new MessageActionRow();
                    for (let y = 0; y < 5; y++)
                        row.addComponent(new MessageButton({label: '\u200b', style: 'gray', id: `${x}_${y}`}))
                    buttons.push(row);
                }
                buttons[4].components[4] = new MessageButton({label: "Close", style: 'blurple', id: 'cancel'});
                
                let xp,yp;
                const set = () => {
                    xp = ~~ (Math.random()*5);
                    yp = ~~ (Math.random()*5);
                    if (map[xp][yp] == 1) return set();
                    map[xp][yp] = 1;
                }

                for (let i = 0; i < 7; i++) {
                    set();
                }

                const msg = await ctx.send(ctx.i18n("commands.mysterybox.title", {coins: amount}), {components: buttons});

                const filter = (button) => button.clicker.user.id === ctx.author.id;
                const collector = msg.createButtonCollector(filter, { time: 60 * 60 * 1000 });
                let won = amount;
                const p = amount * 0.2;

                await ctx.bot.db.query("UPDATE balance SET balance = balance - $1 WHERE user_id = $2", [amount, ctx.author.id]);
                
                collector.on('collect', async (button) => {
                    button.defer();
                    if (button.id == 'cancel') {
                        collector.stop();
                        await ctx.bot.db.query("UPDATE balance SET balance = balance + $1 WHERE user_id = $2", [amount, ctx.author.id]);
                        await ctx.send(ctx.i18n("values.cancelled"));
                    } else if (button.id == 'close') {
                        collector.stop();
                        await ctx.bot.db.query("UPDATE balance SET balance = balance + $1 WHERE user_id = $2", [amount+won, ctx.author.id]);
                        for (let x = 0; x < 5; x++)
                            for (let y = 0; y < 5; y++) {
                                buttons[x].components[y].setDisabled(true);
                                if (!buttons[x].components[y].emoji && !(x == 4 && y == 4))
                                    buttons[x].components[y].setEmoji(map[x][y] == 1 ? '💣' : '💰');
                            }
                        await msg.edit(ctx.i18n("commands.mysterybox.won", {coins: won}), {components: buttons});
                    } else {
                        buttons[4].components[4].setID('close');
                        buttons[4].components[4].setLabel("Close");
                        const x = parseInt(button.id.split('_')[0]),
                        y = parseInt(button.id.split('_')[1]);
                        if (map[x][y] == 1) {
                            collector.stop();
                            buttons[x].components[y].setDisabled(true);
                            buttons[x].components[y].setStyle('red');
                            buttons[x].components[y].setEmoji('💥');
                            for (let x = 0; x < 5; x++)
                                for (let y = 0; y < 5; y++) {
                                    buttons[x].components[y].setDisabled(true);
                                    if (!buttons[x].components[y].emoji && !(x == 4 && y == 4))
                                        buttons[x].components[y].setEmoji(map[x][y] == 1 ? '💣' : '💰');
                                }
                            await msg.edit(ctx.i18n("commands.mysterybox.lose"), {components: buttons});
                        } else {
                            won += p;
                            buttons[x].components[y].setDisabled(true);
                            buttons[x].components[y].setStyle('green');
                            buttons[x].components[y].setEmoji('💰');
                            await msg.edit(ctx.i18n("commands.mysterybox.currentWinnings", {coins: won}), {components: buttons});
                        }
                    }
                });
            }
        })

        this.bot.addCommand({
            name: 'card register',
            module: 'Economy',
            run: async (ctx) => {
                if (await ctx.bot.db.query("SELECT * FROM balance WHERE user_id=$1", [ctx.author.id]))
                    return await ctx.send(ctx.i18n("commands.card_register.alreadyExists"));
                
                const generateCardID = async () => {
                    const cardID = `${Math.random().toString().slice(2,6)}-${Math.random().toString().slice(2,6)}-${Math.random().toString().slice(2,6)}`;
                    if (await ctx.bot.db.query("SELECT * FROM balance WHERE cardid = $1", [cardID])) // 1 in 19683 chance btw
                        return generateCardID();
                    return cardID;
                }
                await ctx.send(ctx.i18n("commands.card_register.registering"));
                const cardID = await generateCardID();
                const expiryDate = (new Date()).setTime((new Date()).getTime() + (7 * 24 * 60 * 60 * 1000));
                
                await ctx.bot.db.query("INSERT INTO balance VALUES ($1, $2, 0, 0, $3)", [ctx.author.id, cardID, expiryDate]);

                await ctx.send(ctx.i18n("commands.card_register.registered"),
                               new MessageEmbed()
                                .setTitle(ctx.i18n("commands.card.cardInfo"))
                                .addField(ctx.i18n("commands.card.number"), cardID)
                                .addField(ctx.i18n("commands.card.expiryDate"), `${moment(expiryDate).format("DD[.]MM")}`)
                                .addField("CVV", `:white_medium_small_square::white_medium_small_square::white_medium_small_square:`)
                                .setThumbnail('https://cdn.discordapp.com/emojis/853556192311115826.png?v=1'));
            }
        });

        this.bot.addCommand({
            name: 'transfer',
            aliases: ['pay'],
            module: 'economy',
            run: async (ctx) => {
                const types = [
                    'Classic',
                    'Premium',
                    'Ultimate'
                ];

                if (!ctx.args[0] || !ctx.args[1])
                    return await ctx.send(ctx.i18n("commands.pay.specifyArg"));
                if (isNaN(parseInt(ctx.args[1])) || !isFinite(ctx.args[1]))
                    return await ctx.send(ctx.i18n("commands.pay.specifyArg"));
                if (parseInt(ctx.args[1]) < 5)
                    return await ctx.send(ctx.i18n("commands.pay.minAmount"));

                const card = await ctx.bot.db.query("SELECT * FROM balance WHERE cardid = $1", [ctx.args[0]]);
                if (!card || card.user_id == ctx.author.id)
                    return await ctx.send(ctx.i18n("commands.pay.unknownCard"));
                
                const authorCard = await ctx.bot.db.query("SELECT * FROM balance WHERE user_id = $1", [ctx.author.id]);
                if (!authorCard)
                    return await ctx.send(ctx.i18n("commands.card.notExists"));
                
                let note = '';
                const amount = parseInt(ctx.args[1]);
                const comission = ~~~ 5/(-(authorCard.type + 1));
                const toPay = Math.round(amount + amount * comission/10/4);
                if (comission < 6) note = ctx.i18n("commands.pay.note", {type: types[authorCard.type], i: 6 - comission});
                const confirmMsg = await ctx.send(
                    ctx.i18n("commands.pay.confirm", {amount, comission, note, toPay}),
                    {
                        components: new MessageActionRow()
                            .addComponent(new MessageButton({label: ctx.i18n("values.confirm"), style: 'green', id: 'confirm'}))
                            .addComponent(new MessageButton({label: ctx.i18n("values.cancel"), style: 'red', id: 'cancel'}))
                    }
                );

                const filter = (button) => button.clicker.user.id === ctx.author.id;
                const collector = confirmMsg.createButtonCollector(filter, { time: 30 * 1000 });

                collector.on('collect', async (button) => {
                    button.defer();
                    collector.stop();
                    if (button.id == 'cancel')
                        await ctx.send(ctx.i18n("values.cancelled"));
                    else {
                        const a_card = await ctx.bot.db.query("SELECT * FROM balance WHERE user_id = $1", [ctx.author.id]);
                        if (parseInt(a_card.balance) < toPay) return await ctx.send(ctx.i18n("commands.pay.notEnoughMoney"));
                        await ctx.bot.db.query("UPDATE balance SET balance = balance - $1 WHERE cardid = $2", [toPay, a_card.cardid]);
                        await ctx.bot.db.query("UPDATE balance SET balance = balance + $1 WHERE cardid = $2", [amount, card.cardid]);
                        await ctx.send(ctx.i18n("commands.pay.transferred", {amount, comission, toPay}));
                    }
                });
            }
        })

        this.bot.addCommand({
            name: 'job list',
            aliases: ['jobs'],
            module: 'Economy',
            run: async (ctx) => {
                if (!await ctx.bot.db.query("SELECT * FROM balance WHERE user_id=$1", [ctx.author.id]))
                    return await ctx.send(ctx.i18n("commands.card.notExists"));

                const embed = new MessageEmbed({title: ctx.i18n("commands.job_list.title")});
                embed.setFooter(ctx.i18n("commands.job_list.tip"));

                for (let job in this.jobs) {
                    embed.addField(`${ctx.i18n(`commands.job.jobs.${job}`)} (\`${job}\`)`, ctx.i18n(`commands.job_list.job_info`, {avg: this.jobs[job].avg, skills: this.jobs[job].skills}), true)
                }
                embed.addField('\u200b', '\u200b', true);

                await ctx.send(embed);
            }
        })
        
        this.bot.addCommand({
            name: 'job join',
            module: 'Economy',
            run: async (ctx) => {
                if (!await ctx.bot.db.query("SELECT * FROM balance WHERE user_id=$1", [ctx.author.id]))
                    return await ctx.send(ctx.i18n("commands.card.notExists"));

                if (!ctx.args[0] || !Object.keys(this.jobs).includes(ctx.args[0]))
                    return await ctx.send(ctx.i18n("commands.job_join.specifyJob"))

                const jobInfo = await ctx.bot.db.query("SELECT * FROM job WHERE user_id=$1", [ctx.author.id]) || {skills: 0};

                if (jobInfo.skills < this.jobs[ctx.args[0]].skills)
                    return await ctx.send(ctx.i18n("commands.job_join.notEnoughSkill", {req: this.jobs[ctx.args[0]].skills, tot: jobInfo.skills}));
                
                await ctx.bot.db.query("INSERT INTO job VALUES ($1, 0, $2) ON CONFLICT(user_id) DO UPDATE SET job = EXCLUDED.job", [ctx.author.id, ctx.args[0]]);
                await ctx.send(ctx.i18n("commands.job_join.joined", {job: ctx.i18n(`commands.job.jobs.${ctx.args[0]}`)}));
            }
        })

        this.bot.addCommand({
            name: 'job',
            module: 'Economy',
            run: async (ctx) => {
                if (!await ctx.bot.db.query("SELECT * FROM balance WHERE user_id=$1", [ctx.author.id]))
                    return await ctx.send(ctx.i18n("commands.card.notExists"));
                
                    const jobInfo = await ctx.bot.db.query("SELECT * FROM job WHERE user_id=$1", [ctx.author.id]) || {skills: 0, job: null};
                const embed = new MessageEmbed();

                embed.addField(ctx.i18n("commands.job.skill"), jobInfo.skills, true);
                if (!jobInfo.job) {
                    embed.addField(ctx.i18n("commands.job.job"), ctx.i18n("values.none"), true);
                    embed.addField(`~~${ctx.i18n("commands.job.earnings")}~~`, `~~${ctx.i18n("commands.job.earnings_v", {coins: 0})}~~`, true);
                } else {
                    embed.addField(ctx.i18n("commands.job.job"), ctx.i18n(`commands.job.jobs.${jobInfo.job}`), true);
                    embed.addField(ctx.i18n("commands.job.earnings"), ctx.i18n("commands.job.earnings_v", {coins: this.jobs[jobInfo.job].avg}), true);
                }

                await ctx.send(embed)
            }
        })

        this.bot.addCommand({
            name: 'work',
            module: 'Economy',
            run: async (ctx) => {
                if (!await ctx.bot.db.query("SELECT * FROM balance WHERE user_id=$1", [ctx.author.id]))
                    return await ctx.send(ctx.i18n("commands.card.notExists"));

                if (this.bot.isBusy.includes(ctx.author.id))
                    return await ctx.send(ctx.i18n("error.isBusy"));

                const cooldown = await ctx.bot.checkCooldown('work', ctx.author.id);
                if (cooldown)
                    return await ctx.error({description: ctx.i18n("error.cooldown", {t: moment().locale(ctx.localeCode).add(cooldown).fromNow(true)})});
                
                const jobInfo = await ctx.bot.db.query("SELECT * FROM job WHERE user_id=$1", [ctx.author.id]);
                if (!jobInfo || !jobInfo.job)
                    return await ctx.send(ctx.i18n("commands.work.noJob"));

                const job = this.jobs[jobInfo.job];
                const coins = Math.floor(Math.random() * ((job.avg+job.def) - (job.avg-(~~(job.def/2)))) + (job.avg-(~~(job.def/2))));
                const embed = new MessageEmbed();
                embed.setTitle(ctx.i18n("commands.work.done", {coins}))

                if (Math.random() <= 0.7) {
                    const skill = await ctx.bot.db.query("UPDATE job SET skills = skills + 1 WHERE user_id=$1 RETURNING *", [ctx.author.id]);
                    embed.addField(ctx.i18n("commands.work.skillUp"), ctx.i18n("commands.work.currentSkill", {skill: skill.skills}));
                }

                await ctx.bot.db.query("UPDATE balance SET balance = balance + $1 WHERE user_id=$2", [coins, ctx.author.id]);
                await ctx.bot.setCooldown('work', ctx.author.id, 1800);
                await ctx.send(embed);
            }
        })

        this.bot.addCommand({
            name: 'daily',
            module: 'Economy',
            run: async (ctx) => {
                if (!await ctx.bot.db.query("SELECT * FROM balance WHERE user_id=$1", [ctx.author.id]))
                    return await ctx.send(ctx.i18n("commands.card.notExists"));

                const cooldown = await ctx.bot.checkCooldown('daily', ctx.author.id);
                if (cooldown)
                    return await ctx.error({description: ctx.i18n("error.cooldown", {t: moment().locale(ctx.localeCode).add(cooldown).fromNow(true)})});
                
                const shards = 1+Math.floor(Math.random()*5);
                let crate = null;
                if (Math.random() < 0.7) {
                    crate = this.crates[Math.floor(Math.random()*this.crates.length)];
                    await ctx.bot.db.query("INSERT INTO crates VALUES ($1, $2, 1) ON CONFLICT (user_id, crate_id) DO UPDATE SET count = crates.count + 1", [ctx.author.id, crate.id]);
                }

                await ctx.bot.db.query("INSERT INTO shards VALUES ($1, $2) ON CONFLICT (user_id) DO UPDATE SET shards = shards.shards + EXCLUDED.shards", [ctx.author.id, shards]);
                await ctx.bot.db.query("UPDATE balance SET balance = balance + 100 WHERE user_id = $1", [ctx.author.id]);
                await ctx.bot.setCooldown('daily', ctx.author.id, 24 * 3600);

                const embed = new MessageEmbed()
                    .setTitle(ctx.i18n("commands.daily.claimed", {shards: shards, coins: 100}));

                if (crate)
                    embed.setDescription(`• ${crate.emoji} ${ctx.i18n("commands.daily.foundCrate", {crate: ctx.i18n(`crates.${crate.id}`), crate_id: crate.id})}`)

                await ctx.send(embed);
            }
        })

        this.items = {
            copper: {
                cost: 500,
                eff: 35,
                dur: 64
            },
            tin: {
                cost: 750,
                eff: 40,
                dur: 64
            },
            lead: {
                cost: 1000,
                eff: 45,
                dur: 64
            },
            iron: {
                cost: 1500,
                eff: 50,
                dur: 100
            }
        }

        this.wmaterials = {
            bait: {
                worm: {
                    cost: 5,
                    eff: 20
                },
                caterpillar: {
                    cost: 10,
                    eff: 30
                },
                fatworm: {
                    cost: 20,
                    eff: 40
                }
            }
        }

        this.bot.addCommand({
            name: 'workshop',
            run: async (ctx) => {
                const menu = new ButtonMenu(ctx);
                const baseToolEmbed = (category) => {
                    const embed = new MessageEmbed()
                        .setTitle(`${ctx.i18n("commands.workshop.title")}: ${ctx.i18n(`commands.workshop.categories.${category}`)}`)
                        .setFooter(ctx.i18n("commands.workshop.tip"));

                    for (let i in this.items)
                        embed.addField(ctx.i18n(`commands.workshop.${category}.${i}`),
                                       `${ctx.i18n(`commands.workshop.toolInfo`, {cost: this.items[i].cost, eff: this.items[i].eff, dur: this.items[i].dur})}\nID: \`${i}_${category}\``,
                                       true);

                    return embed;
                }
                const baseMaterialEmbed = (category) => {
                    const embed = new MessageEmbed()
                        .setTitle(`${ctx.i18n("commands.workshop.title")}: ${ctx.i18n(`commands.workshop.categories.${category}`)}`)
                        .setFooter(ctx.i18n("commands.workshop.tip"));
                    
                    for (let i in this.wmaterials[category])
                        embed.addField(ctx.i18n(`commands.workshop.${category}.${i}`),
                                       `${ctx.i18n(`commands.workshop.materialInfo.${category}`, this.wmaterials[category][i])}\nID: \`${i}_${category}\``,
                                       true);
                    
                    return embed
                }

                menu.addPage(new MessageButton({label: ctx.i18n("commands.workshop.categories.pickaxe"), style: 'gray'}),
                            baseToolEmbed('pickaxe'));

                menu.addPage(new MessageButton({label: ctx.i18n("commands.workshop.categories.axe"), style: 'gray'}),
                            baseToolEmbed('axe'));

                menu.addPage(new MessageButton({label: ctx.i18n("commands.workshop.categories.rod"), style: 'gray'}),
                            baseToolEmbed('rod'));

                menu.newRow();

                menu.addPage(new MessageButton({label: ctx.i18n("commands.workshop.categories.bait"), style: 'gray'}),
                            baseMaterialEmbed('bait'));

                await menu.sendMenu();
            }
        })

        this.bot.addCommand({
            name: 'workshop buy',
            run: async (ctx) => {
                const card = await ctx.bot.db.query("SELECT * FROM balance WHERE user_id=$1", [ctx.author.id]);
                if (!card)
                    return await ctx.send(ctx.i18n("commands.card.notExists"));
                if (!ctx.args[0])
                    return await ctx.send(ctx.i18n("commands.workshop_buy.specifyItem"));

                const s = ctx.args[0].split("_");
                let cost;

                if (["pickaxe", "axe", "rod"].includes(s[1]) && Object.keys(this.items).includes(s[0])) {
                    const item = this.items[s[0]];
                    if (parseInt(card.balance) < parseInt(item.cost))
                        return await ctx.send(ctx.i18n("commands.workshop_buy.notEnoughMoney"));
                    if (await ctx.bot.db.query("SELECT * FROM tools WHERE user_id=$1 AND type=$2", [ctx.author.id, s[1]]))
                        return await ctx.send(ctx.i18n("commands.workshop_buy.alreadyHasTool", {i: ctx.i18n(`commands.workshop.${s[1]}.${s[1]}`).toLowerCase()}));
                    await ctx.bot.db.query("INSERT INTO tools VALUES ($1, $2, $3, $4)", [ctx.author.id, s[0], s[1], item.dur]);
                    await ctx.bot.db.query("UPDATE balance SET balance = balance - $1 WHERE user_id=$2", [item.cost, ctx.author.id]);
                    await ctx.send(ctx.i18n("commands.workshop_buy.bought", {i: ctx.i18n(`commands.workshop.${s[1]}.${s[0]}`), cost: item.cost}));
                } else if (s[1] == 'bait' && Object.keys(this.wmaterials.bait).includes(s[0])) {
                    const item = this.wmaterials.bait[s[0]];
                    const amount = ctx.args[1] ? parseInt(ctx.args[1]) : 1;
                    if (isNaN(amount) || amount < 1)
                        return await ctx.send(ctx.i18n("commands.workshop_buy.invalidAmount"));
                    if (parseInt(card.balance) < (parseInt(item.cost)*amount))
                        return await ctx.send(ctx.i18n("commands.workshop_buy.notEnoughMoney"));
                    cost = parseInt(item.cost)*amount;
                    await ctx.bot.db.query("INSERT INTO wmaterials VALUES ($1, $2, $3) ON CONFLICT(user_id, item) DO UPDATE SET count = wmaterials.count + EXCLUDED.count", [ctx.author.id, s[0], amount]);
                    await ctx.bot.db.query("UPDATE balance SET balance = balance - $1 WHERE user_id=$2", [cost, ctx.author.id]);
                    await ctx.send(ctx.i18n("commands.workshop_buy.boughtAmount", {i: ctx.i18n(`commands.workshop.${s[1]}.${s[0]}`), cost: cost, amount: amount}));
                } else
                    return await ctx.send(ctx.i18n("commands.workshop_buy.unknownItem"));
            }
        })

        this.bot.addCommand({
            name: 'workshop sell',
            run: async (ctx) => {
                const card = await ctx.bot.db.query("SELECT * FROM balance WHERE user_id=$1", [ctx.author.id]);
                if (!card)
                    return await ctx.send(ctx.i18n("commands.card.notExists"));
                if (!ctx.args[0])
                    return await ctx.send(ctx.i18n("commands.workshop_buy.specifyItem"));

                const s = ctx.args[0].split("_");

                if (["pickaxe", "axe", "rod"].includes(s[1]) && await ctx.bot.db.query("SELECT * FROM tools WHERE user_id=$1 AND type=$2 AND item=$3", [ctx.author.id, s[1], s[0]])) {
                    const item = await ctx.bot.db.query("SELECT * FROM tools WHERE user_id=$1 AND type=$2 AND item=$3", [ctx.author.id, s[1], s[0]])
                    const cost = Math.floor((item.durability/this.items[s[0]].dur) * this.items[s[0]].cost);

                    const confirmMsg = await ctx.send(
                        ctx.i18n("commands.workshop_sell.confirm", {i: ctx.i18n(`commands.workshop.${s[1]}.${s[0]}`), dur: item.durability, cost}),
                        {
                            components: new MessageActionRow()
                                .addComponent(new MessageButton({label: ctx.i18n("values.confirm"), style: 'green', id: 'confirm'}))
                                .addComponent(new MessageButton({label: ctx.i18n("values.cancel"), style: 'red', id: 'cancel'}))
                        }
                    );

                    const filter = (button) => button.clicker.user.id === ctx.author.id;
                    const collector = confirmMsg.createButtonCollector(filter, { time: 30 * 1000 });

                    collector.on('collect', async (button) => {
                        button.defer();
                        collector.stop();
                        if (button.id == 'cancel')
                            await ctx.send(ctx.i18n("values.cancelled"));
                        else {
                            await ctx.bot.db.query("UPDATE balance SET balance = balance + $1 WHERE user_id=$2", [cost, ctx.author.id]);
                            await ctx.bot.db.query("DELETE FROM tools WHERE user_id=$1 AND item=$2 AND type=$3", [ctx.author.id, s[0], s[1]]);
                            await ctx.send(ctx.i18n("commands.workshop_sell.sold", {i: ctx.i18n(`commands.workshop.${s[1]}.${s[0]}`), cost: cost}));
                        }
                    });

                } else
                    return await ctx.send(ctx.i18n("commands.workshop_buy.unknownItem"));
            }
        })

        this.bot.addCommand({
            name: 'inventory',
            aliases: ['inv', 'items'],
            run: async (ctx) => {
                if (!await ctx.bot.db.query("SELECT * FROM balance WHERE user_id=$1", [ctx.author.id]))
                    return await ctx.send(ctx.i18n("commands.card.notExists"));
                const tools = await ctx.bot.db.query("SELECT * FROM tools WHERE user_id=$1", [ctx.author.id], {array: true});

                const baseEmbed = (category) => new MessageEmbed({title: ctx.i18n(`commands.inventory.${category}`)});
                const menu = new ButtonMenu(ctx);
                
                const toolsEmbed = baseEmbed("tools");
                
                for (let tool of tools)
                    toolsEmbed.addField(ctx.i18n(`commands.workshop.${tool.type}.${tool.item}`),
                                        `${ctx.i18n(`commands.inventory.toolInfo`, {dur: tool.durability, eff: this.items[tool.item].eff})}\nID: \`${tool.item}_${tool.type}\``,
                                        true);
                
                if (tools.length == 0)
                    toolsEmbed.setDescription(ctx.i18n("commands.inventory.empty"));

                menu.addPage(new MessageButton({label: ctx.i18n("commands.inventory.tools"), style: 'gray'}),
                             toolsEmbed);

                const materialsRaw = await this.bot.db.query("SELECT * FROM items WHERE user_id=$1", [ctx.author.id], {array: true});
                const materialsEmbed = baseEmbed("materials");

                if (materialsRaw.length == 0)
                    materialsEmbed.setDescription(ctx.i18n("commands.inventory.empty"));
                else {
                    const mt = materialsRaw
                        .filter(x => x.item != null && materials[x.item])
                        .map(x => {let i = materials[x.item]; i.count = x.count; return i});
                    const stones = mt.filter(x => x.tags.includes("stone"));
                    const ores = mt.filter(x => x.tags.includes("ore"));
                    const gems = mt.filter(x => x.tags.includes("gem"));
                    const wood = mt.filter(x => x.tags.includes("wood") || x.tags.includes("bamboo"));
                    if (stones.length > 0)
                        materialsEmbed.addField(ctx.i18n("commands.terrain.rocks"),
                                                stones
                                                    .map(x => `${x.getEmoji()} ${ctx.i18n(`materials.${x.id}`)} (x${x.count})`)
                                                    .join("\n"),
                                                true);
                    if (ores.length > 0)
                        materialsEmbed.addField(ctx.i18n("commands.terrain.ores"),
                                                ores
                                                    .map(x => `${x.getEmoji()} ${ctx.i18n(`materials.${x.id}`)} (x${x.count})`)
                                                    .join("\n"),
                                                true);
                    if (gems.length > 0)
                        materialsEmbed.addField(ctx.i18n("commands.terrain.gems"),
                                                gems
                                                    .map(x => `${x.getEmoji()} ${ctx.i18n(`materials.${x.id}`)} (x${x.count})`)
                                                    .join("\n"),
                                                true);
                    if (wood.length > 0)
                        materialsEmbed.addField(ctx.i18n("commands.terrain.wood"),
                                                wood
                                                    .map(x => `${x.getEmoji()} ${ctx.i18n(`materials.${x.id}`)} (x${x.count})`)
                                                    .join("\n"),
                                                true);
                }

                menu.addPage(new MessageButton({label: ctx.i18n("commands.inventory.materials"), style: 'gray'}),
                             materialsEmbed);
                
                const wmaterialsRaw = await this.bot.db.query("SELECT * FROM wmaterials WHERE user_id=$1", [ctx.author.id], {array: true})
                const wmEmbed = baseEmbed("gear");

                if (wmaterialsRaw.length == 0)
                    wmEmbed.setDescription(ctx.i18n("commands.inventory.empty"));
                else {
                    const wmt = wmaterialsRaw.map(x => {let i = items[x.item]; i.count = x.count; return i});
                    const baits = wmt.filter(x => x.tags.includes("bait"));
                    if (baits.length > 0)
                        wmEmbed.addField(ctx.i18n("commands.workshop.categories.bait"),
                                                baits
                                                    .map(x => `${x.getEmoji()} ${ctx.i18n(`commands.workshop.bait.${x.id}`)} (x${x.count})`)
                                                    .join("\n"),
                                                true);
                }

                menu.addPage(new MessageButton({label: ctx.i18n("commands.inventory.gear"), style: 'gray'}),
                             wmEmbed);
                
                const cratesRaw = await this.bot.db.query("SELECT * FROM crates WHERE user_id=$1", [ctx.author.id], {array: true});
                const cratesEmbed = baseEmbed("crates");
                
                if (cratesRaw.length == 0)
                    cratesEmbed.setDescription(ctx.i18n("commands.inventory.empty"));
                else {
                    const crates = cratesRaw
                        .map(x => {let i = this.crates.find(z => z.id == x.crate_id); i.count = x.count; return i});
                    cratesEmbed.setDescription(`${ctx.i18n("commands.crate_open.howToOpen")}\n\n${crates.map(x => `[x${x.count}] ${x.emoji} ${ctx.i18n(`crates.${x.id}`)} (\`${x.id}\`)`).join("\n")}`);
                }
                
                menu.addPage(new MessageButton({label: ctx.i18n("commands.inventory.crates"), style: 'gray'}),
                             cratesEmbed);
                
                await menu.sendMenu();
            }
        })

        this.bot.addCommand({
            name: 'crate open',
            module: 'Economy',
            run: async (ctx) => {
                if (!await ctx.bot.db.query("SELECT * FROM balance WHERE user_id=$1", [ctx.author.id]))
                    return await ctx.send(ctx.i18n("commands.card.notExists"));
                const crates = await ctx.bot.db.query("SELECT * FROM crates WHERE user_id=$1", [ctx.author.id], {array: true});
                if (crates.length == 0)
                    return await ctx.send(ctx.i18n("commands.crate_open.noCrates"));
                if (!ctx.args[0])
                    return await ctx.send(ctx.i18n("commands.crate_open.specifyCrate"));
                if (!crates.find(x => x.crate_id == ctx.args[0]))
                    return await ctx.send(ctx.i18n("commands.crate_open.unknownCrate"));
                const crate = this.crates.find(x => x.id == ctx.args[0]);
                const loot = crate.loot.sort(() => [-1, 0, 1][Math.floor(Math.random()*2)]).slice(0, Math.floor(Math.random()*5));
                const embed = new MessageEmbed({title: ctx.i18n("commands.crate_open.opened", {crate: ctx.i18n(`crates.${crate.id}`).toLowerCase()})})
                const desc = [];
                let shards, money, material, count;
                embed.setThumbnail(crate.emojiURL);

                for (let i of loot) {
                    if (i[0] == "shards") {
                        shards = Math.floor(Math.random() * (i[2] - i[1]) + i[1]);
                        desc.push(ctx.i18n("commands.crate_open.shards", {shards}));
                        await ctx.bot.db.query("INSERT INTO shards VALUES ($1, $2) ON CONFLICT(user_id) DO UPDATE SET shards = shards.shards + EXCLUDED.shards", [ctx.author.id, shards]);
                    }
                    if (i[0] == "coins") {
                        money = Math.floor(Math.random() * (i[2] - i[1]) + i[1]);
                        desc.push(ctx.i18n("commands.crate_open.coins", {money}));
                        await ctx.bot.db.query("UPDATE balance SET balance = balance + $1 WHERE user_id=$2", [money, ctx.author.id]);
                    }
                    if (i[0] == "material") {
                        count = Math.floor(Math.random() * (i[3] - i[2]) + i[2]);
                        material = materials[i[1]];
                        desc.push(ctx.i18n("commands.crate_open.material", {emoji: material.getEmoji(), material: ctx.i18n(`materials.${material.id}`), count}));
                        await ctx.bot.db.query("INSERT INTO items VALUES ($1, $2, $3) ON CONFLICT(user_id, item) DO UPDATE SET count = items.count + EXCLUDED.count", [ctx.author.id, material.id, count]);
                    }
                }
                
                embed.setDescription(desc.join("\n"))
                await ctx.bot.db.query("UPDATE crates SET count = count - 1 WHERE user_id=$1 AND crate_id=$2", [ctx.author.id, ctx.args[0]])
                await ctx.bot.db.query("DELETE FROM crates WHERE user_id=$1 AND count < 1", [ctx.author.id])

                if (desc.length == 0)
                    return await ctx.send(
                        new MessageEmbed()
                            .setTitle(ctx.i18n("commands.crate_open.nothing", {crate: ctx.i18n(`crates.${ctx.args[0]}`).toLowerCase()}))
                            .setThumbnail(crate.emojiURL)
                    );

                await ctx.send(embed);
            }
        })

        this.bot.addCommand({
            name: 'terrain',
            aliases: ['resources'],
            module: 'Economy',
            run: async (ctx) => {
                const baseEmbed = (category) => new MessageEmbed({title: ctx.i18n("commands.terrain.title", {category: ctx.i18n(`commands.terrain.${category}`)})});
                const spawnable = Object.values(materials).filter(x => x.canSpawn(ctx.author.id));
                const discovered = await ctx.bot.db.query("SELECT * FROM discovered WHERE user_id=$1", [ctx.author.id], {array: true});
                const undiscovered = ctx.i18n("commands.terrain.undiscovered");
                const menu = new ButtonMenu(ctx);

                menu.addPage(new MessageButton({label: ctx.i18n("commands.terrain.rocks"), style: 'gray'}),
                             baseEmbed("rocks")
                                .setDescription(
                                    spawnable
                                        .filter(x => x.tags.includes("stone"))
                                        .map(x => discovered.find(z => z.material == x.id)
                                                  ? `${x.getEmoji()} ${ctx.i18n(`materials.${x.id}`)}`
                                                  : undiscovered)
                                        .join('\n')))

                menu.addPage(new MessageButton({label: ctx.i18n("commands.terrain.ores"), style: 'gray'}),
                             baseEmbed("ores")
                                .setDescription(
                                    spawnable
                                        .filter(x => x.tags.includes("ore"))
                                        .map(x => discovered.find(z => z.material == x.id)
                                                  ? `${x.getEmoji()} ${ctx.i18n(`materials.${x.id}`)}`
                                                  : undiscovered)
                                        .join('\n')))

                menu.addPage(new MessageButton({label: ctx.i18n("commands.terrain.gems"), style: 'gray'}),
                             baseEmbed("gems")
                                .setDescription(
                                    spawnable
                                        .filter(x => x.tags.includes("gem"))
                                        .map(x => discovered.find(z => z.material == x.id)
                                                  ? `${x.getEmoji()} ${ctx.i18n(`materials.${x.id}`)}`
                                                  : undiscovered)
                                        .join('\n')))

                menu.addPage(new MessageButton({label: ctx.i18n("commands.terrain.wood"), style: 'gray'}),
                             baseEmbed("wood")
                                .setDescription(
                                    spawnable
                                        .filter(x => x.tags.includes("wood") || x.tags.includes("bamboo"))
                                        .map(x => discovered.find(z => z.material == x.id)
                                                  ? `${x.getEmoji()} ${ctx.i18n(`materials.${x.id}`)}`
                                                  : undiscovered)
                                        .join('\n')))
                
                await menu.sendMenu();
            }
        })

        this.bot.addCommand({
            name: 'energy',
            aliases: ['tiredness'],
            module: 'Economy',
            run: async (ctx) => {
                if (!await ctx.bot.db.query("SELECT * FROM balance WHERE user_id=$1", [ctx.author.id]))
                    return await ctx.send(ctx.i18n("commands.card.notExists"));
                
                const energy = ctx.bot.getEnergy(ctx.author.id);
                let status = 0;
                if (energy <= 75) status = 1;
                if (energy <= 50) status = 2;
                if (energy <= 25) status = 3;
                if (energy <= 10) status = 4;
                
                await ctx.send(
                    ctx.i18n(
                        "commands.energy.energy",
                        {
                            tiredness: 100-energy,
                            status: ctx.i18n(`commands.energy.status.${status}`)
                        }
                    )
                );
            }
        })

        this.bot.addCommand({
            name: 'mine',
            module: 'Economy',
            run: async (ctx) => {
                if (this.bot.isBusy.includes(ctx.author.id))
                    return await ctx.send(ctx.i18n("error.isBusy"));
                if (this.bot.getEnergy(ctx.author.id) < 40)
                    return await ctx.send(ctx.i18n("commands.energy.tooTired"));
                const pickaxe = await ctx.bot.db.query("SELECT * FROM tools WHERE user_id=$1 AND type='pickaxe'", [ctx.author.id]);
                if (!pickaxe)
                    return await ctx.send(ctx.i18n("commands.mine.noPickaxe"));

                const time = ~~(2 + Math.random()*18);
                await ctx.send(ctx.i18n("commands.mine.mining"));
                this.bot.addBusy(ctx.author.id, time);

                setTimeout(async () => {
                    this.bot.removeBusy(ctx.author.id);
                    this.bot.useEnergy(ctx.author.id, 20);

                    const tool = await ctx.bot.db.query("UPDATE tools SET durability = durability - $1 WHERE type='pickaxe' AND user_id=$2 RETURNING *", [1+Math.floor(Math.random()*3), ctx.author.id])
                    
                    const embed = new MessageEmbed({title: ctx.i18n("commands.mine.collected")});
                    const spawned = Object.values(materials)
                        .filter(x => x.canSpawn(ctx.author.id)
                                    && x.canBeMined()
                                    && Math.random() <= x.prop.rarity)
                        .sort(() => [-1, 0, 1][Math.floor(Math.random()*2)])
                        .slice(0, 2+Math.floor(Math.random()*10));
                    const resources = spawned.map(x => [x, Math.floor(1+Math.random()*10)]);
                    
                    if (tool.durability < 1) {
                        embed.addField(ctx.i18n("error.whoops"),
                                       ctx.i18n("commands.mine.pickaxeBroken"));
                        await ctx.bot.db.query("DELETE FROM tools WHERE user_id=$1 AND type='pickaxe'", [ctx.author.id]);
                    } else if (tool.durability < 10)
                        embed.addField(ctx.i18n("error.warn"),
                                       ctx.i18n("commands.mine.warn"));
                    
                    const discovered = await ctx.bot.db.query("SELECT * FROM discovered WHERE user_id=$1", [ctx.author.id], {array: true});
                    
                    embed.addField('\u200b',
                                   resources.map(x => `[x${x[1]}] ${x[0].getEmoji()} ${ctx.i18n(`materials.${x[0].id}`)}${discovered.find(z => z.material == x[0].id) ? "": ` ${ctx.i18n("commands.terrain.newDiscoveredMaterial")}`}`),
                                   true);
                    
                    let newDiscovered = [];
                    for (let resource of resources) {
                        await ctx.bot.db.query("INSERT INTO items VALUES ($1, $2, $3) ON CONFLICT(user_id, item) DO UPDATE SET count = items.count + EXCLUDED.count", [ctx.author.id, resource[0].id, resource[1]]);
                        if (!discovered.find(x => x.material == resource[0].id)) {
                            await ctx.bot.db.query("INSERT INTO discovered VALUES ($1, $2)", [ctx.author.id, resource[0].id]);
                            newDiscovered.push(resource[0].id);
                        }
                    }
                    if (newDiscovered.length > 0)
                        embed.addField(ctx.i18n("commands.terrain.newDiscovery.title"), ctx.i18n("commands.terrain.newDiscovery.desc"))
                    await ctx.send(ctx.author.toString(), {embed});
                }, time*1000);
            }
        })

        this.bot.addCommand({
            name: 'chop',
            module: 'Economy',
            run: async (ctx) => {
                if (this.bot.isBusy.includes(ctx.author.id))
                    return await ctx.send(ctx.i18n("error.isBusy"));
                if (this.bot.getEnergy(ctx.author.id) < 40)
                    return await ctx.send(ctx.i18n("commands.energy.tooTired"));
                const axe = await ctx.bot.db.query("SELECT * FROM tools WHERE user_id=$1 AND type='axe'", [ctx.author.id]);
                if (!axe)
                    return await ctx.send(ctx.i18n("commands.chop.noAxe"));

                const time = ~~(2 + Math.random()*18);
                await ctx.send(ctx.i18n("commands.chop.chopping"));
                this.bot.addBusy(ctx.author.id, time);

                setTimeout(async () => {
                    this.bot.removeBusy(ctx.author.id);
                    this.bot.useEnergy(ctx.author.id, 20);

                    const tool = await ctx.bot.db.query("UPDATE tools SET durability = durability - $1 WHERE type='axe' AND user_id=$2 RETURNING *", [1+Math.floor(Math.random()*3), ctx.author.id])
                    
                    const embed = new MessageEmbed({title: ctx.i18n("commands.chop.collected")});
                    const spawned = Object.values(materials)
                        .filter(x => x.canSpawn(ctx.author.id)
                                    && x.canBeChopped()
                                    && Math.random() <= x.prop.rarity)
                        .sort(() => [-1, 0, 1][Math.floor(Math.random()*2)])
                        .slice(0, 2+Math.floor(Math.random()*10));
                    const resources = spawned.map(x => [x, Math.floor(1+Math.random()*10)]);
                    
                    if (tool.durability < 10)
                        embed.addField(ctx.i18n("error.warn"),
                                       ctx.i18n("commands.chop.warn"));
                    
                    if (tool.durability < 1) {
                        embed.addField(ctx.i18n("error.whoops"),
                                       ctx.i18n("commands.chop.axeBroken"));
                        await ctx.bot.db.query("DELETE FROM tools WHERE user_id=$1 AND type='axe'", [ctx.author.id]);
                    }
                    
                    const discovered = await ctx.bot.db.query("SELECT * FROM discovered WHERE user_id=$1", [ctx.author.id], {array: true});
                    
                    embed.addField('\u200b',
                                   resources.map(x => `[x${x[1]}] ${x[0].getEmoji()} ${ctx.i18n(`materials.${x[0].id}`)}${discovered.find(z => z.material == x[0].id) ? "": ` ${ctx.i18n("commands.terrain.newDiscoveredMaterial")}`}`),
                                   true);
                    
                    let newDiscovered = [];
                    for (let resource of resources) {
                        await ctx.bot.db.query("INSERT INTO items VALUES ($1, $2, $3) ON CONFLICT(user_id, item) DO UPDATE SET count = items.count + EXCLUDED.count", [ctx.author.id, resource[0].id, resource[1]]);
                        if (!discovered.find(x => x.material == resource[0].id)) {
                            await ctx.bot.db.query("INSERT INTO discovered VALUES ($1, $2)", [ctx.author.id, resource[0].id]);
                            newDiscovered.push(resource[0].id);
                        }
                    }
                    if (newDiscovered.length > 0)
                        embed.addField(ctx.i18n("commands.terrain.newDiscovery.title"), ctx.i18n("commands.terrain.newDiscovery.desc"))
                    await ctx.send(ctx.author.toString(), {embed});
                }, time*1000);
            }
        })

        this.crates = [
            {
                id: 'wooden_crate',
                rarity: 0.7,
                loot: [
                    ["shards", 1, 5],
                    ["coins", 10, 20],
                    ["material", "iron", 1, 5],
                    ["material", "copper", 1, 5],
                    ["material", "lead", 1, 5],
                    ["material", "tin", 1, 5],
                    ["material", "coal", 1, 5]
                ],
                emoji: '<:wooden_crate:854999560274706432>',
                emojiURL: 'https://cdn.discordapp.com/emojis/854999560274706432.png?v=1'
            },
            {
                id: 'iron_crate',
                rarity: 0.6,
                loot: [
                    ["shards", 1, 8],
                    ["coins", 10, 30],
                    ["material", "silver", 1, 5],
                    ["material", "tungsten", 1, 5],
                    ["material", "zinc", 1, 5],
                    ["material", "iron", 1, 5],
                    ["material", "copper", 1, 5],
                    ["material", "lead", 1, 5],
                    ["material", "tin", 1, 5],
                    ["material", "coal", 1, 5]
                ],
                emoji: '<:iron_crate:854999560127250453>',
                emojiURL: 'https://cdn.discordapp.com/emojis/854999560127250453.png?v=1'
            },
            {
                id: 'golden_crate',
                rarity: 0.3,
                loot: [
                    ["shards", 1, 12],
                    ["coins", 10, 40],
                    ["material", "silver", 1, 5],
                    ["material", "tungsten", 1, 5],
                    ["material", "zinc", 1, 5],
                    ["material", "gold", 1, 5],
                    ["material", "platinum", 1, 5],
                    ["material", "iron", 1, 5],
                    ["material", "copper", 1, 5],
                    ["material", "lead", 1, 5],
                    ["material", "tin", 1, 5],
                    ["material", "coal", 1, 5]
                ],
                emoji: '<:golden_crate:854999560447197185>',
                emojiURL: 'https://cdn.discordapp.com/emojis/854999560447197185.png?v=1'
            },
            {
                id: 'platinum_crate',
                rarity: 0.2,
                loot: [
                    ["shards", 1, 14],
                    ["coins", 10, 80],
                    ["material", "tungsten", 1, 5],
                    ["material", "zinc", 1, 5],
                    ["material", "platinum", 1, 5],
                    ["material", "cobalt", 1, 5],
                    ["material", "iron", 1, 5],
                    ["material", "copper", 1, 5],
                    ["material", "lead", 1, 5],
                    ["material", "tin", 1, 5],
                    ["material", "coal", 1, 5]
                ],
                emoji: '<:platinum_crate:854999560072724490>',
                emojiURL: 'https://cdn.discordapp.com/emojis/854999560072724490.png?v=1'
            },
            {
                id: 'cobalt_crate',
                rarity: 0.1,
                loot: [
                    ["shards", 1, 16],
                    ["coins", 10, 90],
                    ["material", "tungsten", 1, 5],
                    ["material", "zinc", 1, 5],
                    ["material", "platinum", 1, 5],
                    ["material", "cobalt", 1, 5],
                    ["material", "palladium", 1, 5],
                    ["material", "iron", 1, 5],
                    ["material", "copper", 1, 5],
                    ["material", "lead", 1, 5],
                    ["material", "tin", 1, 5],
                    ["material", "coal", 1, 5]
                ],
                emoji: '<:cobalt_crate:854999560140488714>',
                emojiURL: 'https://cdn.discordapp.com/emojis/854999560140488714.png?v=1'
            },
            {
                id: 'palladium_crate',
                rarity: 0.1,
                loot: [
                    ["shards", 1, 18],
                    ["coins", 10, 90],
                    ["material", "platinum", 1, 5],
                    ["material", "cobalt", 1, 5],
                    ["material", "palladium", 1, 5],
                    ["material", "titanium", 1, 5],
                    ["material", "iron", 1, 5],
                    ["material", "copper", 1, 5],
                    ["material", "lead", 1, 5],
                    ["material", "tin", 1, 5],
                    ["material", "coal", 1, 5]
                ],
                emoji: '<:palladium_crate:854999560095006730>',
                emojiURL: 'https://cdn.discordapp.com/emojis/854999560095006730.png?v=1'
            },
            {
                id: 'titanium_crate',
                rarity: 0.1,
                loot: [
                    ["shards", 1, 20],
                    ["coins", 10, 100],
                    ["material", "cobalt", 1, 5],
                    ["material", "palladium", 1, 5],
                    ["material", "titanium", 1, 5],
                    ["material", "iron", 1, 5],
                    ["material", "copper", 1, 5],
                    ["material", "lead", 1, 5],
                    ["material", "tin", 1, 5],
                    ["material", "coal", 1, 5]
                ],
                emoji: '<:titanium_crate:854999559767064577>',
                emojiURL: 'https://cdn.discordapp.com/emojis/854999559767064577.png?v=1'
            },
        ]

        this.fishLoot = [
            {
                type: 'custom',
                id: 'fish',
                rarity: 0.9
            },
            {
                type: 'custom',
                id: 'shoe',
                rarity: 0.7
            },
            {
                type: 'crate',
                rarity: 0.4
            }
        ]

        this.bot.addCommand({
            name: 'fish',
            module: 'Economy',
            run: async (ctx) => {
                if (this.bot.isBusy.includes(ctx.author.id))
                    return await ctx.send(ctx.i18n("error.isBusy"));
                if (this.bot.getEnergy(ctx.author.id) < 10)
                    return await ctx.send(ctx.i18n("commands.energy.tooTired"));
                const rod = await ctx.bot.db.query("SELECT * FROM tools WHERE user_id=$1 AND type='rod'", [ctx.author.id]);
                if (!rod)
                    return await ctx.send(ctx.i18n("commands.fish.noRod"));
                const wmaterials = await ctx.bot.db.query("SELECT * FROM wmaterials WHERE user_id=$1", [ctx.author.id], {array: true});
                const baits = wmaterials.filter(x => Object.keys(this.wmaterials.bait).includes(x.item));
                if (baits.length == 0)
                    return await ctx.send(ctx.i18n("commands.fish.noBaits"));

                const time = ~~(2 + Math.random()*18);
                await ctx.send(ctx.i18n("commands.fish.fishing"));
                this.bot.addBusy(ctx.author.id, time);

                setTimeout(async () => {
                    this.bot.removeBusy(ctx.author.id);
                    this.bot.useEnergy(ctx.author.id, 10);

                    const tool = await ctx.bot.db.query("UPDATE tools SET durability = durability - $1 WHERE type='rod' AND user_id=$2 RETURNING *", [1+Math.floor(Math.random()*3), ctx.author.id])
                    let eff = 20;                    
                    if (baits.find(x => x.item == "fatworm")) eff = 40;
                    else if (baits.find(x => x.item == "caterpillar")) eff = 30;

                    const embed = new MessageEmbed({title: ctx.i18n("commands.fish.collected")});
                    const spawned = Object.values(this.fishLoot)
                        .filter(x => Math.random() <= (x.rarity * (eff/2/10)))
                        .sort(() => [-1, 0, 1][Math.floor(Math.random()*2)])
                        .slice(0, 2+Math.floor(Math.random()*10));
                    const resources = spawned.map(x => [x, Math.floor(1+Math.random()*5)]);
                    let desc = [];
                    let resource, count, crate, rndCrates, crates;

                    for (let x of resources) {
                        resource = x[0];
                        count = x[1];
                        if (resource.type == 'custom')
                            desc.push(`${ctx.i18n(`commands.fish.materials.${resource.id}`)} [x${count}]`);
                        else if (resource.type == 'crate') {
                            rndCrates = this.crates
                                .filter(x => Math.random() <= (x.rarity*(eff/2/10)))
                                .sort(() => [-1, 0, 1][Math.floor(Math.random()*2)]);
                            if (rndCrates.length == 0)
                                continue;
                            crates = {};
                            for (let i = 0; i <= count; i++) {
                                crate = rndCrates[Math.floor(Math.random()*Object.keys(rndCrates).length)];
                                crates[crate.id] = (crates[crate.id] || 0) + 1;
                                await ctx.bot.db.query("INSERT INTO crates VALUES ($1, $2, 1) ON CONFLICT(user_id, crate_id) DO UPDATE SET count = crates.count + 1", [ctx.author.id, crate.id]);
                            }
                            for (let crate in crates)
                                desc.push(`${this.crates.find(x => x.id == crate).emoji} ${ctx.i18n(`crates.${crate}`)} [x${crates[crate]}]`);
                        }
                    }

                    if (Math.random() < 0.7) {
                        let id = 'worm';
                        if (baits.find(x => x.item == "fatworm")) id = 'fatworm'
                        else if (baits.find(x => x.item == "caterpillar")) id = 'caterpillar'
                        await ctx.bot.db.query("UPDATE wmaterials SET count = count - 1 WHERE user_id=$1 AND item=$2", [ctx.author.id, id])
                        await ctx.bot.db.query("DELETE FROM wmaterials WHERE user_id=$1 AND count < 1", [ctx.author.id]);
                    }

                    if (tool.durability < 10)
                        embed.addField(ctx.i18n("error.warn"),
                                       ctx.i18n("commands.fish.warn"));
                    
                    if (tool.durability < 1) {
                        embed.addField(ctx.i18n("error.whoops"),
                                       ctx.i18n("commands.fish.rodBroken"));
                        await ctx.bot.db.query("DELETE FROM tools WHERE user_id=$1 AND type='rod'", [ctx.author.id]);
                    }
                    
                    embed.setDescription(desc.join('\n'));
                    // embed.setDescription(resources.map(x => `${x[0].getEmoji()} ${ctx.i18n(`materials.${x[0].id}`)} [x${x[1]}]`));
                    
                    await ctx.send(ctx.author.toString(), {embed});
                    for (let resource of resources)
                        await ctx.bot.db.query("INSERT INTO items VALUES ($1, $2, $3) ON CONFLICT(user_id, item) DO UPDATE SET count = items.count + EXCLUDED.count", [ctx.author.id, resource[0].id, resource[1]]);
                }, time*1000);
            }
        })

        // this.bot.addCommand({
        //     name: 'black market',
        //     run: async (ctx) => {
        //         await ctx.send(ctx.i18n("commands.black_market.help"))
        //     }
        // })
    }
}