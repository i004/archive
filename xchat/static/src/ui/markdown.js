function parseMarkdown(input, escape=true) {
    if (escape)
        input = escapeHTML(input, false);

    return DOMPurify.sanitize(marked.parse(input)).trim();
}

// @deprecated
// function parseMentions(md) {
//     return md.replace(/@([0-9a-f]{32})/g, (match, uid) => {
//         const user = app.client.users.get(uid);
        
//         return `<span class="message-user-mention user" style="--user-color: #${uid.slice(0, 6)}" data-user-id="${user?.id || 0}">@${escapeHTML(user?.username || 'unknown-user')}</span>`;
//     })
// }

let _emojis = {};
function emojify(str) {
    if (!str) return '';
    if (!_emojis) return str;

    return str.split(/:([a-z0-9_\-\+]+):/gi)
        .map((x, i) => {
            if (i % 2 == 0)
                return x;

            return Object.keys(_emojis).includes(x) ? _emojis[x] : `:${x}:`;
        })
        .join('')
}

window.addEventListener('load', () => {
    marked.setOptions({
        langPrefix: 'hljs language-',
        pedantic: false,
        gfm: true,
        breaks: true,
        sanitize: false,
        smartLists: true,
        smartypants: false,
        headerIds: false,
        mangle: false,
        xhtml: false
    });
    
    marked.use({
        renderer: {
            image(href, title, text) {
                return `![${text || title}](${href})`;
            },
            code(code, infostring) {
                return `<pre class="codeblock"><code>${hljs.highlight(code, { language: hljs.getLanguage(infostring) ? infostring : 'plaintext' }).value.replace(/&amp;/g, '&')}</code></pre>`;
            },
            codespan(code) {
                return `<span class="codespan">${code.replace(/&amp;/g, '&')}</span>`;
            },
        }
    });

    marked.use({
        extensions: [
            {
                name: 'mention',
                level: 'inline',
                start (src) { return src.match(/@/)?.index },
                tokenizer (src) {
                    const mention = /^@([0-9a-f]{32})/.exec(src);
                    if (mention)
                        return {
                            type: 'mention',
                            raw: mention[0],
                            id: mention[1]
                        }
                },
                renderer ({ id }) {
                    const user = app.client.users.get(id);
                    return `<span class="message-user-mention user" style="--user-color: #${id.slice(0, 6)}" data-user-id="${id || 0}">@${escapeHTML(user?.username || 'unknown')}</span>`;
                }
            }
        ]
    })

    fetch('/static/assets/emoji.json')
        .then(x => x.json())
        .then(x => _emojis = x);
})