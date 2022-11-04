const fetch = require('node-fetch');

module.exports.postHastebin = async (text) => {
    const res = await fetch('https://hastebin.com/documents', {method: 'POST', body: text});
    if (res.status != 200)
        return false;
    return (await res.json()).key;
}

module.exports.removeInvites = (d) => {
    if (typeof d == "object") {
        for (let k in d)
            if (typeof d[k] == 'string')
                d[k] = d[k].replace(/((https?:\/\/)?((www|canary|ptb)\.)?discord\.(gg|com)\/(invite\/)?)([a-zA-Z0-9]+)/ig, '[invite detected]');
    } else if (typeof d == "string") {
        d = d.replace(/((https?:\/\/)?((www|canary|ptb)\.)?discord\.(gg|com)\/(invite\/)?)([a-zA-Z0-9]+)/ig, '[invite detected]');
    }
    return d;
}