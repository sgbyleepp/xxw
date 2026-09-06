const _0x=[120,88,119,95,83,49,103,78,95,75,51,121,95,50,48,50,54,33,64,35];
const SIGN_SECRET=(function(){return String.fromCharCode.apply(null,_0x)})();

function getSessionToken() {
    return localStorage.getItem('session_token');
}

function setSessionToken(token) {
    localStorage.setItem('session_token', token);
}

function clearSessionToken() {
    localStorage.removeItem('session_token');
}

function generateNonce(length = 16) {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    let result = '';
    for (let i = 0; i < length; i++) {
        result += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return result;
}

async function hmacSha256(key, message) {
    const encoder = new TextEncoder();
    const keyData = encoder.encode(key);
    const messageData = encoder.encode(message);
    
    const cryptoKey = await crypto.subtle.importKey(
        'raw',
        keyData,
        { name: 'HMAC', hash: 'SHA-256' },
        false,
        ['sign']
    );
    
    const signature = await crypto.subtle.sign('HMAC', cryptoKey, messageData);
    return Array.from(new Uint8Array(signature))
        .map(b => b.toString(16).padStart(2, '0'))
        .join('');
}

async function generateSignature(method, path, timestamp, nonce, body = '') {
    const signStr = `${method}${path}${timestamp}${nonce}${body}`;
    return await hmacSha256(SIGN_SECRET, signStr);
}

async function apiRequest(url, options = {}) {
    const method = options.method || 'GET';
    const urlObj = new URL(url, window.location.origin);
    const path = urlObj.pathname;
    const timestamp = Date.now().toString();
    const nonce = generateNonce();
    const body = options.body || '';

    const signature = await generateSignature(method, path, timestamp, nonce, body);

    const headers = {
        'Content-Type': 'application/json',
        'X-Timestamp': timestamp,
        'X-Nonce': nonce,
        'X-Signature': signature,
        ...options.headers
    };

    const token = getSessionToken();
    if (token) {
        headers['X-Session-Token'] = token;
    }
    
    const response = await fetch(url, {
        ...options,
        headers
    });

    if (response.status === 401) {
        clearSessionToken();

        const currentPath = window.location.pathname;

        if (currentPath.includes('login.html') || 
            currentPath.includes('index.html')) {
            return response;
        }

        alert('会话已过期，请重新登录');

        if (currentPath.includes('admin') || currentPath.includes('xxwhtgl')) {
            localStorage.removeItem('admin');
            window.location.href = '/xxwhtgl';
        } else {
            localStorage.removeItem('user');
            window.location.href = 'index.html';
        }
    }
    
    return response;
}

async function publicApiRequest(url, options = {}) {
    const method = options.method || 'GET';
    const urlObj = new URL(url, window.location.origin);
    const path = urlObj.pathname;
    const timestamp = Date.now().toString();
    const nonce = generateNonce();
    const body = options.body || '';

    const signature = await generateSignature(method, path, timestamp, nonce, body);

    const headers = {
        'Content-Type': 'application/json',
        'X-Timestamp': timestamp,
        'X-Nonce': nonce,
        'X-Signature': signature,
        ...options.headers
    };
    
    return fetch(url, {
        ...options,
        headers
    });
}
