function __fallbackClipboard(text) {
    const e = document.createElement("textarea");
    
    e.value = text;
    e.style.top = "-1000px";
    e.style.left = "-1000px";
    e.style.position = "fixed";

    document.body.appendChild(e);
    e.focus();
    e.select();

    try { document.execCommand('copy') } catch (err) { }

    document.body.removeChild(e);
}

function clipboard(text) {
    if (!navigator.clipboard)
        return __fallbackClipboard(text);

    navigator.clipboard.writeText(text);
}

function escapeHTML (string, escapeQuotes=true) {
    const escaped = string
        .toString()
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;');

    if (escapeQuotes)
        return escaped
            .replace(/"/g, '&quot;')
            .replace(/'/g, '&#39;');

    return escaped;
}

function _messageComponent (component) {
    if (component.type == 'image')
        return `<img src="https://proxy.xaro.cc/media/${component.id}/${component.filename}">`;
    
    if (component.type == 'file')
        return `<a href="https://proxy.xaro.cc/media/${component.id}/${component.filename}"><div class="message-file"><span>${component.filename}</span></div></a>`;

    return '';
}

function messageContent (msg) {
    if (!msg?.content)
        return `<div class="message-content" id="${msg?.id || "0"}"></div>`;

    return `
    <div class="message-content${msg.editedAt ? " edited" : ""}" id="${msg.id}">
        ${parseMarkdown(emojify(msg.content), true)}
        ${msg.components?.length > 0 ? `<div class="message-components">${msg.components.map(x => _messageComponent(x)).join('')}</div>` : ""}
    </div>`;
}

function messageToHTML (message) {
    if (!message.createdAt || typeof message.createdAt == 'number')
        message.createdAt = new Date(message.createdAt || undefined);
    
    if (!message.id)
        message.id = uuid.v4();

    const color = message.author.publicId.length < 6 ? "ffffff" : message.author.publicId.slice(0, 6);

    return `
    <li class="message${message.ephemeral ? " ephemeral" : ""}">
        <div class="content" data-author-id="${message.author.publicId}" data-id="${message.id}">
            <h2 class="message-header">
                <span class="message-author user" data-user-id="${message.author.publicId}" style="--user-color: #${color}">${escapeHTML(message.author.username)}</span>
                ${message.flags?.length > 0 ? `<span class="message-flag">${escapeHTML(message.flags[0])}</span>` : ""}
                <span class="message-date" data-timestamp="${message.createdAt.getTime()}">${message.createdAt.getDate() != new Date().getDate() ? message.createdAt.toLocaleDateString() : message.createdAt.toLocaleTimeString()}</span>
            </h2>
            ${messageContent(message)}
        </div>
    </li>
    `;
}

function groupToHTML (group) {
    const s = group.name.split(/([!@#\$%\^&\*\(\)\-_=\+\\\|\[\]{};:'",\.<>\/\?`~ ])/g);
    const acronym = escapeHTML((s.length > 1 ? s.filter(x => x.trim()).map(x => x[0]) : Array.from(s[0]).slice(0, 3)).join(''));
    const name = escapeHTML(group.name);

    return `
    <li class="group" data-group-name="${name}" data-group-id="${group.id}" data-is-owner="${group.isOwner}" id="group-${group.id}">
        <span>${acronym}</span>
    </li>
    `;
}

function choice (arr) {
    return arr[Math.floor(Math.random()*arr.length)];
}

// function getContrastYIQ(hex){
// 	const r = parseInt(hex.slice(0, 2), 16),
//           g = parseInt(hex.slice(2, 4), 16),
// 	      b = parseInt(hex.slice(4, 6), 16);
	
//     const yiq = ((r*299)+(g*587)+(b*114))/1000;
    
// 	return (yiq >= 128) ? 'black' : 'white';
// }

// function userColor(user) {
//     const id = user.publicId || user.id || user;
//     const hex = id.length < 6 ? 'ffffff' : id.slice(0, 6);

    
// }