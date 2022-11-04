window.onload = () => {
    const k = document.getElementById('key');
    k.onfocus = () => k.type = 'text';
    k.onblur = () => k.type = 'password';
}

function generateRandomKey() {
    const k = document.getElementById('key');
    k.focus();
    k.value = crypto.getRandomValues(new Uint32Array(10)).reduce((p, c) => p + c.toString(36), '');
}