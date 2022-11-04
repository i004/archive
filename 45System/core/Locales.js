const fs = require('fs');
const yaml = require('yaml');

class Locale {
    constructor(code, path) {
        this.code = code;
        this.path = path;
        this.data = yaml.parse(fs.readFileSync(`${path}/${code}.yml`).toString());
    }
    rec (v, key) {
        let s = key.split('.');
        if (!s || (s.length == 1 && !s[0]) || typeof(v) != "object")
            return v;
        let o;
        if (Array.isArray(v))
            o = v[parseInt(s[0])];
        else
            o = v[s[0]];
        return this.rec(o, s.slice(1).join('.'));
    }
    format (key, keys={}) {
        if (!this.data[key.split('.')[0]])
            return null;
        let v = this.rec(this.data[key.split('.')[0]], key.split('.').slice(1).join('.'));
        if (v === null || typeof(v) === "undefined")
            return key;
        if (typeof(v) === "object")
            return v;

        for (let k of Object.keys(keys))
            v = v.split(`{${k}}`).join(keys[k]);
        return v;
    }
}

class Localizator {
    constructor (path) {
        this.path = path;
        this.locales = {};

        fs.readdirSync(this.path).forEach(file => {
            if (!file.endsWith('.yml'))
                return;
            let code = file.split('.yml')[0];
            this.locales[code] = new Locale(code, this.path);
        });
    }
    reloadLocales () {
        this.locales = {};
        fs.readdirSync(this.path).forEach(file => {
            if (!file.endsWith('.yml'))
                return;
            let code = file.split('.yml')[0];
            this.locales[code] = new Locale(code, this.path);
        });
    }
    getLocale (code) {
        return this.locales[code];
    }
    async getLocaleForGuild (guild) {
        const locale = await guild.client.db.query('SELECT * FROM guild_locales WHERE guild_id = $1', [guild.id]);
        if (!locale)
            return 'en';
        return locale.locale;
    }
}

module.exports = { Locale, Localizator }