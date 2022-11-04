const discord = require('discord.js');
const BaseCommand = require('../core/BaseCommand');
const {$} = require('../index');

const percentages = [
    [ .99, 'Истинный Долбаёб' ],
    [ .95, 'Нереальный Долбаёб' ],
    [ .9, 'Невменяемый Долбаёб' ],
    [ .85, 'Ужасный Долбаёб' ],
    [ .8, 'Тупой Долбаёб' ],
    [ .75, 'Неуклюжый Долбаёб' ],
    [ .7, 'Долбаёб' ],
    [ .6, 'Чуть больше чем немного долбаёб' ],
    [ .5, 'Наполовину долбаёб' ],
    [ .4, 'Немного долбаёб' ],
    [ .3, 'Совсем немного долбаёб' ],
    [ .2, 'Человек' ],
    [ .1, 'Истинный Человек' ],
    [ 0, 'Превосходный Человек' ],
];

const test = () => [
    {
        label: 'Как бы вы оценили свой возраст?',
        choices: [ 'Я ещё не рождён', 'Молодой', 'Я взрослый и отвественный человек', 'Старый', 'Мне 1000 лет' ],
        modifiers: [ 0, -0.1, 0.05, 0.05, 0.1 ]
    },
    {
        label: 'Сколько чашек сахара вы кладёте в чай?',
        choices: [ (~~(Math.random()*10)).toString(), (~~(Math.random()*10)).toString(), 'Столько, сколько нужно', 'Не знаю', 'Не кладу я чашки сахара' ],
        modifiers: [ 0.1, 0.1, 0.05, 0.01, -0.05 ]
    },
    {
        label: 'Как вы называете недавные события, связанные с Украиной и Россией?',
        choices: [ 'Война', 'Спецоперация', 'Освобождение Украинского народа', 'Украинцы сами себя бомбят' ],
        modifiers: [ -0.1, 0.2, 0.5, 10 ]
    },
    {
        label: 'Сколько пар обуви вы используете повсевдневно?',
        choices: [ '1', '2', '3', (~~(Math.random()*999)).toString(), (~~(Math.random()*9999)).toString() ],
        modifiers: [ -0.05, -0.025, 0, 0.05, 0.1 ]
    },
    {
        label: 'На чей вы стороне?',
        choices: [ 'Украина', 'Нейтрален', 'Затрудняюсь ответить' ],
        modifiers: [ -0.2, 0.05, 0.25 ]
    },
    {
        label: 'Сколько всего континентов на Земле?',
        choices: [ '7', ...new Array(4).fill().map(() => (~~(Math.random()*10)).toString()) ],
        modifiers: [ 0.05, -0.05, -0.05, -0.05, -0.05 ]
    },
    {
        label: 'Сколько всего существует сторон света?',
        choices: [ '360', '4', '6', '380' ],
        modifiers: [ 0.01, -0.05, -0.025, 0.025 ]
    },
    {
        label: 'Кем вы себя считаете?',
        choices: [ '0', '1' ],
        modifiers: [ 0.01, -0.01 ]
    },
    {
        label: 'Вы - ...',
        choices: [ 'Гений', 'Многоклеточное млекопетающее существо', 'Никто', 'Долбаёб', 'Просто чел' ],
        modifiers: [ 0.3, -0.1, -0.1, 0.2, -0.2 ]
    },
    {
        label: 'Вставь 3 пропущенных буквы: БЛ___ТЬ',
        choices: [ new Array(3).fill().map(() => 'ЙЦУКЕНГШЩЗХЪФЫВАПРОЛДЖЭЯЧСМИТЬБЮ'[~~(Math.random()*32)]).join(''), 'Я', 'АЖИ', 'ЕВА', 'УДИ' ],
        modifiers: [ 0.2, 0.1, -0.01, -0.05, -0.1 ]
    },
    {
        label: 'Перед вами три двери. За одной свирепый лев, за другой мороз в -100°С, а за третей может быть всё что угодно. Что вы выберете?',
        choices: [ 'Свирепый лев', 'Мороз', 'Неизвестность' ],
        modifiers: [ 0.1, 0.2, -0.2 ]
    },
    {
        label: 'Составьте слово из четырёх букв, комбинируя бувы Е, К и С',
        choices: [ 'КЕКС', 'СЕКС', 'СЕЛО', ...new Array(2).fill().map(() => new Array(4).fill().map(() => 'ЕКС'[~~(Math.random()*3)]).join('')) ],
        modifiers: [ -0.05, 0.01, 0.075, 0.075, 0.075 ]
    },
    {
        label: 'В каком мире вы бы предпочли оказатся после смерти?',
        choices: [ 'Свой внутренний мир', 'Рай', 'Ад', 'Пустота' ],
        modifiers: [ 0, 0, 0, 0 ]
    },
    {
        label: 'Работая судьёй, вам попадается случай с человеком, который всю свою жизнь помогал обществу и улучшил весь мир, но месяц назад он убил человека. Какое наказание вы ему вынесете?',
        choices: [ 'Я его прощу', 'Общественные работы', 'Домашний арест', 'Тюрьма', 'Смертная казнь' ],
        modifiers: [ 0.05, -0.05, 0.1, 0.2, 0.4 ]
    },
    {
        label: 'Какое, по вашему мнению, самое дебильное женское имя?',
        choices: [ 'Лариса', 'Анжелика', 'Анастасия', 'Татьяна', 'Владислава' ],
        modifiers: [ Math.random()/10-0.05, Math.random()/10-0.05, Math.random()/10-0.05, Math.random()/10-0.05, Math.random()/10-0.05 ]
    },
    {
        label: 'Какое, по вашему мнению, самое дебильное мужское имя?',
        choices: [ 'Коля', 'Кирил', 'Григорий', 'Олег', 'Влад' ],
        modifiers: [ Math.random()/10-0.05, Math.random()/10-0.05, Math.random()/10-0.05, Math.random()/10-0.05, Math.random()/10-0.05 ]
    },
    {
        label: 'Какое, по вашему мнению, самое дебильное слово в русском языке?',
        choices: [ 'Шпилька', 'Дуршлак', 'Разрыхлитель', 'Боб', 'Чугун' ],
        modifiers: [ Math.random()/10-0.05, Math.random()/10-0.05, Math.random()/10-0.05, Math.random()/10-0.05, Math.random()/10-0.05 ]
    },
    {
        label: 'Ваш IQ...',
        choices: [ '69', '80', '100', '150', '200' ],
        modifiers: [ 0.069, 0.08, -0.01, 0.015, 0.12 ]
    }
].map(v => ({ ...v, s: Math.random() }))
 .sort((a, b) => a.s - b.s)
 .slice(0, 10);

module.exports = class Test extends BaseCommand {
    constructor (client) {
        super({
            client,
            name: 'test',
            description: 'Test'
        });

        $.namespaceComponentCollector('dolb', async (x, i, a) => {
            if (a[0] != i.user.id) return;
            if (!i.user.$dolbayobTest) return;

            const test = i.user.$dolbayobTest;

            if (x == '$start')
                i.user.$dolbayobTest.percent -= 0.05 * (a[1] == '1');
            else
                i.user.$dolbayobTest.percent += test.test[test.i-1].modifiers[parseInt(x)];

            if (i.user.$dolbayobTest.i >= test.test.length) {
                delete i.user.$dolbayobTest;
                const percent = Math.min(Math.max(test.percent, 0), 1);
                return await i.update({
                    embeds: [{
                        title: `Вы прошли тест на долбаёба!`,
                        description: `Вы долбаёб на ${~~(percent*100*10) / 10}%. Вы — ${percentages.find(x => percent >= x[0])[1]}`,
                        color: '#2F3136'
                    }],
                    components: []
                })
            }

            const question = test.test[test.i];

            const shuffledChoices = question.choices
                .map((v, i) => ({ v, i, s: Math.random() }))
                .sort((a, b) => a.s - b.s);

            i.user.$dolbayobTest.i++;

            await i.update({
                embeds: [{
                    title: question.label,
                    color: '#2F3136'
                }],
                components: [
                    new discord.MessageActionRow()
                    .addComponents(shuffledChoices.map(x => new discord.MessageButton({
                        customId: `dolb::${x.i}::${i.user.id}::{${x.v}:${question.label}}`.slice(0, 100),
                        label: x.v,
                        style: 'SECONDARY'
                    })))
                ]
            })
        })
    }

    /**
     * 
     * @param {discord.CommandInteraction} i 
     */
    async run (i) {
        if (i.user.$dolbayobTest) return;

        i.user.$dolbayobTest = {
            test: test(),
            percent: 0.5,
            i: 0
        };
        
        await i.reply({
            embeds: [{
                title: 'Тест на долбаёба',
                color: '#2F3136'
            }],
            components: [
                new discord.MessageActionRow()
                    .addComponents(
                        new discord.MessageButton({
                            label: 'Начать',
                            style: 'PRIMARY',
                            customId: `dolb::$start::${i.user.id}::0`
                        }),
                        new discord.MessageButton({
                            label: 'Начать',
                            style: 'DANGER',
                            customId: `dolb::$start::${i.user.id}::1`
                        })
                    )
            ]
        })
    }
}