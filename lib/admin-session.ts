type AdminSessionPayload = {
    accessToken: string;
    iat: number;
    exp: number;
};

function bytesToBase64(bytes: Uint8Array): string {
    if (typeof btoa !== 'undefined') {
        let binary = '';
        for (let i = 0; i < bytes.length; i++) {
            binary += String.fromCharCode(bytes[i]);
        }
        return btoa(binary);
    }

    const BufferImpl = (globalThis as unknown as { Buffer?: { from: (input: Uint8Array) => { toString: (enc: string) => string } } }).Buffer;
    if (BufferImpl) {
        return BufferImpl.from(bytes).toString('base64');
    }

    throw new Error('No base64 encoder available in this runtime');
}

function base64ToBytes(base64: string): Uint8Array {
    if (typeof atob !== 'undefined') {
        const binary = atob(base64);
        const bytes = new Uint8Array(binary.length);
        for (let i = 0; i < binary.length; i++) {
            bytes[i] = binary.charCodeAt(i);
        }
        return bytes;
    }

    const BufferImpl = (globalThis as unknown as { Buffer?: { from: (input: string, enc: string) => Uint8Array } }).Buffer;
    if (BufferImpl) {
        return new Uint8Array(BufferImpl.from(base64, 'base64'));
    }

    throw new Error('No base64 decoder available in this runtime');
}

function base64UrlEncodeBytes(bytes: Uint8Array): string {
    const base64 = bytesToBase64(bytes);
    return base64.replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/g, '');
}

function base64UrlDecodeToBytes(input: string): Uint8Array {
    const base64 = input.replace(/-/g, '+').replace(/_/g, '/');
    const padded = base64 + '='.repeat((4 - (base64.length % 4)) % 4);
    return base64ToBytes(padded);
}

function base64UrlEncodeJson(value: unknown): string {
    const json = JSON.stringify(value);
    const bytes = new TextEncoder().encode(json);
    return base64UrlEncodeBytes(bytes);
}

function base64UrlDecodeJson<T>(input: string): T {
    const bytes = base64UrlDecodeToBytes(input);
    const json = new TextDecoder().decode(bytes);
    return JSON.parse(json) as T;
}

async function sign(secret: string, data: string): Promise<string> {
    const key = await crypto.subtle.importKey(
        'raw',
        new TextEncoder().encode(secret),
        { name: 'HMAC', hash: 'SHA-256' },
        false,
        ['sign']
    );

    const signature = await crypto.subtle.sign(
        'HMAC',
        key,
        new TextEncoder().encode(data)
    );

    return base64UrlEncodeBytes(new Uint8Array(signature));
}

async function sha256Bytes(input: string): Promise<Uint8Array> {
    const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(input));
    return new Uint8Array(digest as ArrayBuffer);
}

async function importAesGcmKey(secret: string): Promise<CryptoKey> {
    const keyBytes = await sha256Bytes(secret);
    return crypto.subtle.importKey('raw', keyBytes.buffer as ArrayBuffer, { name: 'AES-GCM' }, false, ['encrypt', 'decrypt']);
}

function concatBytes(a: Uint8Array, b: Uint8Array): Uint8Array {
    const out = new Uint8Array(a.length + b.length);
    out.set(a, 0);
    out.set(b, a.length);
    return out;
}

async function encryptJson(secret: string, value: unknown): Promise<string> {
    const iv = crypto.getRandomValues(new Uint8Array(12));
    const key = await importAesGcmKey(secret);
    const plaintext = new TextEncoder().encode(JSON.stringify(value));
    const ciphertext = await crypto.subtle.encrypt({ name: 'AES-GCM', iv }, key, plaintext);
    const combined = concatBytes(iv, new Uint8Array(ciphertext));
    return base64UrlEncodeBytes(combined);
}

async function decryptJson<T>(secret: string, encrypted: string): Promise<T> {
    const combined = base64UrlDecodeToBytes(encrypted);
    if (combined.length < 13) {
        throw new Error('Invalid encrypted payload');
    }
    const iv = combined.slice(0, 12);
    const ciphertext = combined.slice(12);
    const key = await importAesGcmKey(secret);
    const plaintext = await crypto.subtle.decrypt({ name: 'AES-GCM', iv }, key, ciphertext);
    const json = new TextDecoder().decode(new Uint8Array(plaintext));
    return JSON.parse(json) as T;
}

async function timingSafeEqual(a: string, b: string): Promise<boolean> {
    if (a.length !== b.length) return false;
    let result = 0;
    for (let i = 0; i < a.length; i++) {
        result |= a.charCodeAt(i) ^ b.charCodeAt(i);
    }
    return result === 0;
}

export async function createAdminSessionToken(params: {
    secret: string;
    accessToken: string;
    expiresInSeconds: number;
}): Promise<string> {
    const now = Math.floor(Date.now() / 1000);
    const payload: AdminSessionPayload = {
        accessToken: params.accessToken,
        iat: now,
        exp: now + params.expiresInSeconds,
    };

    const encryptedPayload = await encryptJson(params.secret, payload);
    const signature = await sign(params.secret, encryptedPayload);
    return `${encryptedPayload}.${signature}`;
}

export async function verifyAdminSessionToken(params: {
    token: string | undefined;
    secret: string;
}): Promise<{ ok: true; payload: AdminSessionPayload } | { ok: false }> {
    if (!params.token) return { ok: false };

    const parts = params.token.split('.');
    if (parts.length !== 2) return { ok: false };

    const [encryptedPayload, signature] = parts;
    if (!encryptedPayload || !signature) return { ok: false };

    const expected = await sign(params.secret, encryptedPayload);
    const matches = await timingSafeEqual(signature, expected);
    if (!matches) return { ok: false };

    let payload: AdminSessionPayload;
    try {
        payload = await decryptJson<AdminSessionPayload>(params.secret, encryptedPayload);
    } catch {
        return { ok: false };
    }

    const now = Math.floor(Date.now() / 1000);
    if (typeof payload.exp !== 'number' || payload.exp < now) {
        return { ok: false };
    }

    if (typeof payload.accessToken !== 'string' || !payload.accessToken) {
        return { ok: false };
    }

    return { ok: true, payload };
}

export const ADMIN_SESSION_COOKIE_NAME = 'connectnow_admin_session';
