
class Locale {
    constructor (code, data) {
        this.code = code;
        this.data = JSON.parse(data.toString());
    }
    format (key, v={}) {
        if (!this.data[key])
            return `[${this.code}:${key}]`;
        
        let t = this.data[key];
        
        if (typeof t == "string" && v && Object.keys(v).length > 0)
            for (let k in v)
                t = t.split(`{${k}}`).join(v[k].toString());
        
        return t;
    }
}

module.exports = { Locale };