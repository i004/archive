import crypto from 'crypto';
import md5 from 'md5';
import ULID from 'ulid';

const FORBIDDEN_CHARACTERS = /[\u0000-\u0008\u0010-\u001f\u007f-\u009f\u200b\u200c\u200e\u200f\u00ad\ufeff]/g;
const FORBIDDEN_WHITESPACES = /(?=\s)[^ \n\t\u200d]/g;
const VALID_USERNAME = /[\u0020-\u007E\u00A1-\uFFEE\uFFFD]{2,32}/g;

export function ulid () {
    return ULID.ulid();
}

export function generateOldPID (username: string, key: string) {
    return md5(JSON.stringify({ username, publicId: null, key }));
}

export function generatePrivateID (username: string, password: string) {
    return crypto.createHmac('sha256', password)
        .update(username)
        .digest('hex');
}

export function randomUserColor () {
    let h = Math.random() * 360,
        s = Math.random() * 70 + 25,
        l = Math.random() * 10 + 55;

    l /= 100;
    
    const a = s * Math.min(l, 1 - l) / 100;
    const f = (n: number) => {
        const k = (n + h / 30) % 12;
        const color = l - a * Math.max(Math.min(k - 3, 9 - k, 1), -1);
        return Math.round(255 * color).toString(16).padStart(2, '0');
    };

    return `${f(0)}${f(8)}${f(4)}`;
}

export function normalizeString(str: string) {
    return str
        .replace(FORBIDDEN_CHARACTERS, '\uFFFD')
        .replace(FORBIDDEN_WHITESPACES, ' ')
        .replace(/ {2,}/g, ' ')
        .trim();
}

export function validateUsername(str: string) {
    return !!str.match(VALID_USERNAME);
}