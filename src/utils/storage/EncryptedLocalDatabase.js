// Imports - use your existing WASM modules
import init, { encrypt as wasmEncrypt, decrypt as wasmDecrypt } from 'aes-wasm';
import dhInit, { hkdf_derive } from 'dh-wasm';

// Constants
const DB_NAME = 'EchoEncryptedDB';
const DB_VERSION = 1;

const STORES = {
    META: 'meta',              //SALTS
    IDENTITY_KEYS: 'identity_keys',
    SESSION_KEYS: 'session_keys',
    MESSAGES: 'messages',
    MEDIA: 'media'
};

class EncryptedLocalDatabase {
    constructor() {
        this.db = null;            // IndexedDB instance
        this.dek = null;           // Database Encryption Key (memory only!)
        this.currentUserId = null; // Who is logged in
        this._instanceId = Math.random().toString(36).substr(2, 9);
        console.log('[ELD] New instance created, id:', this._instanceId);
    }

    async initializeDB() {
        if (this.db) return this.db;  // Already initialized

        return new Promise((resolve, reject) => {
            const request = indexedDB.open(DB_NAME, DB_VERSION);

            request.onerror = () => reject(request.error);

            request.onsuccess = () => {
                this.db = request.result;
                resolve(this.db);
            };

            request.onupgradeneeded = (event) => {
                const db = event.target.result;

                // Create each object store with indexes
                // META store - no index needed
                if (!db.objectStoreNames.contains(STORES.META)) {
                    db.createObjectStore(STORES.META, { keyPath: 'id' });
                }

                // IDENTITY_KEYS - index by userId
                if (!db.objectStoreNames.contains(STORES.IDENTITY_KEYS)) {
                    const store = db.createObjectStore(STORES.IDENTITY_KEYS, { keyPath: 'id' });
                    store.createIndex('userId', 'userId', { unique: false });
                }

                // SESSION_KEYS - index by userId
                if (!db.objectStoreNames.contains(STORES.SESSION_KEYS)) {
                    const store = db.createObjectStore(STORES.SESSION_KEYS, { keyPath: 'id' });
                    store.createIndex('userId', 'userId', { unique: false });
                }

                // MESSAGES - index by conversationId and userId
                if (!db.objectStoreNames.contains(STORES.MESSAGES)) {
                    const store = db.createObjectStore(STORES.MESSAGES, { keyPath: 'id' });
                    store.createIndex('conversationId', 'conversationId', { unique: false });
                    store.createIndex('userId', 'userId', { unique: false });
                }

                // MEDIA - index by userId
                if (!db.objectStoreNames.contains(STORES.MEDIA)) {
                    const store = db.createObjectStore(STORES.MEDIA, { keyPath: 'id' });
                    store.createIndex('userId', 'userId', { unique: false });
                }
            };
        });
    }

    // PUT - insert or update a record
    async _put(storeName, record) {
        return new Promise((resolve, reject) => {
            const tx = this.db.transaction(storeName, 'readwrite');
            const store = tx.objectStore(storeName);
            const request = store.put(record);
            request.onsuccess = () => resolve(request.result);
            request.onerror = () => reject(request.error);
        });
    }

    // GET - retrieve by primary key
    async _get(storeName, key) {
        return new Promise((resolve, reject) => {
            const tx = this.db.transaction(storeName, 'readonly');
            const store = tx.objectStore(storeName);
            const request = store.get(key);
            request.onsuccess = () => resolve(request.result || null);
            request.onerror = () => reject(request.error);
        });
    }

    // DELETE - remove by primary key
    async _delete(storeName, key) {
        return new Promise((resolve, reject) => {
            const tx = this.db.transaction(storeName, 'readwrite');
            const store = tx.objectStore(storeName);
            const request = store.delete(key);
            request.onsuccess = () => resolve();
            request.onerror = () => reject(request.error);
        });
    }

    // GET ALL BY INDEX - retrieve all records matching an index value
    async _getAllByIndex(storeName, indexName, value) {
        return new Promise((resolve, reject) => {
            const tx = this.db.transaction(storeName, 'readonly');
            const store = tx.objectStore(storeName);
            const index = store.index(indexName);
            const request = index.getAll(value);
            request.onsuccess = () => resolve(request.result || []);
            request.onerror = () => reject(request.error);
        });
    }

    // Convert Uint8Array to Base64 string
    _uint8ToBase64(arr) {
        return btoa(String.fromCharCode.apply(null, arr));
    }

    // Convert Base64 string back to Uint8Array
    _base64ToUint8(base64) {
        const binary = atob(base64);
        const arr = new Uint8Array(binary.length);
        for (let i = 0; i < binary.length; i++) {
            arr[i] = binary.charCodeAt(i);
        }
        return arr;
    }

    // Generate 12-byte random nonce for AES-GCM
    _generateNonce() {
        return crypto.getRandomValues(new Uint8Array(12));
    }

    // Generate 32-byte random salt for key derivation
    _generateSalt() {
        return crypto.getRandomValues(new Uint8Array(32));
    }

    // Throw error if database is locked
    _ensureUnlocked() {
        console.log('[ELD] _ensureUnlocked on instance:', this._instanceId, '- dek:', this.dek ? 'set' : 'null', ', userId:', this.currentUserId);
        if (this.dek == null || this.currentUserId == null) {
            console.error('[ELD] Lock check failed on instance:', this._instanceId);
            throw new Error('Database is locked. Call unlock() first.');
        }
    }

    // Check if unlocked
    isUnlocked() {
        return this.dek != null && this.currentUserId != null;
    }

    async _deriveKey(password, salt) {
        console.log('[ELD] _deriveKey called');
        try {
            await dhInit();
            console.log('[ELD] dh-wasm initialized');

            const encoder = new TextEncoder();
            const passwordBytes = encoder.encode(password);

            let ikm = new Uint8Array([...passwordBytes, ...salt]);
            const info = encoder.encode('EchoELD-v1');

            // Key stretching - 100 rounds
            for (let i = 0; i < 100; i++) {
                const roundInfo = new Uint8Array([...info, i & 0xff]);
                const derived = hkdf_derive(ikm, salt, roundInfo, 32);
                if (!derived || derived.length !== 32) {
                    throw new Error(`HKDF round ${i} returned invalid data: ${derived?.length || 'null'}`);
                }
                ikm = new Uint8Array(derived);
            }

            console.log('[ELD] _deriveKey returning, length:', ikm.length);
            return ikm;
        } catch (err) {
            console.error('[ELD] _deriveKey FAILED:', err);
            throw err;
        }
    }

    async _encrypt(data) {
        this._ensureUnlocked();
        await init();  // Initialize aes-wasm

        // Convert object to JSON string
        const plaintext = typeof data === 'string' ? data : JSON.stringify(data);

        // Generate random nonce
        const nonce = this._generateNonce();

        // Encrypt using your WASM module
        const ciphertext = await wasmEncrypt(plaintext, this.dek, nonce);

        return {
            ciphertext,                        // Hex string from WASM
            nonce: this._uint8ToBase64(nonce)  // Base64 for storage
        };
    }

    async _decrypt(ciphertext, nonceBase64) {
        this._ensureUnlocked();
        await init();

        const nonce = this._base64ToUint8(nonceBase64);
        return await wasmDecrypt(ciphertext, this.dek, nonce);
    }

    // Check if user has a database
    async userExists(userId) {
        await this.initializeDB();
        const meta = await this._get(STORES.META, `user-${userId}`);
        return !!meta;
    }

    // First-time setup for a new user
    async createUser(userId, password) {
        console.log('[ELD] createUser called for:', userId, 'on instance:', this._instanceId);

        if (userId == null || userId === '') {
            throw new Error('Missing userId. Registration/login must return a userId.');
        }
        if (password == null || password === '') {
            throw new Error('Missing password.');
        }

        await this.initializeDB();
        console.log('[ELD] DB initialized');

        if (await this.userExists(userId)) {
            throw new Error('User already exists. Use unlock() instead.');
        }

        // Generate and store salt (unencrypted - needed for key derivation)
        const salt = this._generateSalt();
        console.log('[ELD] Generated salt, length:', salt.length);

        await this._put(STORES.META, {
            id: `user-${userId}`,
            salt: this._uint8ToBase64(salt),
            createdAt: Date.now()
        });
        console.log('[ELD] Salt stored in DB');

        // Derive DEK and set state
        console.log('[ELD] About to derive key...');
        const derivedKey = await this._deriveKey(password, salt);
        console.log('[ELD] derivedKey result:', derivedKey ? `${derivedKey.length} bytes` : 'null/undefined');

        this.dek = derivedKey;
        this.currentUserId = userId;

        console.log('[ELD] After assignment - this.dek:', this.dek ? `${this.dek.length} bytes` : 'null/undefined');
        console.log('[ELD] After assignment - this.currentUserId:', this.currentUserId);
        console.log('[ELD] isUnlocked():', this.isUnlocked());

        if (!this.dek || this.dek.length !== 32) {
            throw new Error('Failed to derive encryption key');
        }

        // Store verification record (to check password on future logins)
        console.log('[ELD] About to encrypt verification...');
        const verification = await this._encrypt('echo-verify-ok');
        console.log('[ELD] Verification encrypted');

        await this._put(STORES.META, {
            id: `verify-${userId}`,
            ...verification
        });

        console.log(`[ELD] Created database for ${userId}`);
    }

    // Unlock existing user's database
    async unlock(userId, password) {
        await this.initializeDB();

        if (userId == null || userId === '') {
            throw new Error('Missing userId.');
        }
        if (password == null || password === '') {
            throw new Error('Missing password.');
        }

        if (!await this.userExists(userId)) {
            throw new Error('User does not exist. Use createUser() first.');
        }

        // Get salt
        const meta = await this._get(STORES.META, `user-${userId}`);
        const salt = this._base64ToUint8(meta.salt);

        // Derive DEK
        this.dek = await this._deriveKey(password, salt);
        this.currentUserId = userId;

        // Verify password by decrypting test record
        try {
            const verifyRecord = await this._get(STORES.META, `verify-${userId}`);
            if (verifyRecord) {
                const result = await this._decrypt(verifyRecord.ciphertext, verifyRecord.nonce);
                if (result !== 'echo-verify-ok') {
                    throw new Error('Mismatch');
                }
            }
        } catch (err) {
            this.lock();  // Clear DEK on failure
            throw new Error('Invalid password');
        }

        console.log(`[ELD] Unlocked database for ${userId}`);
        return true;
    }

    // Lock the database (logout)
    lock() {
        if (this.dek) {
            this.dek.fill(0);  // Zero out memory for security
        }
        this.dek = null;
        this.currentUserId = null;
        console.log('[ELD] Database locked');
    }

    async storeIdentityKeys(keys) {
        this._ensureUnlocked();
        const encrypted = await this._encrypt(keys);
        await this._put(STORES.IDENTITY_KEYS, {
            id: `identity-${this.currentUserId}`,
            userId: this.currentUserId,
            ...encrypted
        });
    }

    async getIdentityKeys() {
        this._ensureUnlocked();
        const record = await this._get(STORES.IDENTITY_KEYS, `identity-${this.currentUserId}`);
        if (!record) return null;
        const decrypted = await this._decrypt(record.ciphertext, record.nonce);
        return JSON.parse(decrypted);
    }

    async storeSessionKey(peerId, sessionKey, metadata = {}) {
        this._ensureUnlocked();
        if (!(sessionKey instanceof Uint8Array) || sessionKey.length !== 32) {
            throw new Error(`Invalid session key length: ${sessionKey?.length} (expected 32)`);
        }
        const sessionId = [this.currentUserId, peerId].sort().join('-');

        const data = {
            sessionKey: this._uint8ToBase64(sessionKey),
            peerId,
            ...metadata,
            updatedAt: Date.now()
        };

        const encrypted = await this._encrypt(data);
        await this._put(STORES.SESSION_KEYS, {
            id: `session-${sessionId}`,
            userId: this.currentUserId,
            sessionId,
            ...encrypted
        });
    }

    async getSessionKey(peerId) {
        this._ensureUnlocked();
        const sessionId = [this.currentUserId, peerId].sort().join('-');
        const record = await this._get(STORES.SESSION_KEYS, `session-${sessionId}`);
        if (!record) return null;

        const decrypted = await this._decrypt(record.ciphertext, record.nonce);
        const data = JSON.parse(decrypted);
        data.sessionKey = this._base64ToUint8(data.sessionKey);
        if (!(data.sessionKey instanceof Uint8Array) || data.sessionKey.length !== 32) {
            console.warn('[ELD] Invalid session key stored; deleting:', { sessionId, length: data.sessionKey?.length });
            await this.deleteSessionKey(peerId);
            return null;
        }
        return data;
    }

    async storeMessage(peerId, message) {
        this._ensureUnlocked();
        const conversationId = [this.currentUserId, peerId].sort().join('-');
        const msgId = message._id || `msg-${Date.now()}-${Math.random().toString(36).slice(2)}`;

        const encrypted = await this._encrypt(message);
        await this._put(STORES.MESSAGES, {
            id: msgId,
            userId: this.currentUserId,
            conversationId,
            timestamp: message.createdAt || Date.now(),
            ...encrypted
        });
    }

    async getMessages(peerId) {
        this._ensureUnlocked();
        const conversationId = [this.currentUserId, peerId].sort().join('-');
        const records = await this._getAllByIndex(STORES.MESSAGES, 'conversationId', conversationId);

        const messages = [];
        for (const record of records) {
            try {
                const decrypted = await this._decrypt(record.ciphertext, record.nonce);
                messages.push(JSON.parse(decrypted));
            } catch (err) {
                console.warn('[ELD] Failed to decrypt message:', record.id);
            }
        }

        return messages.sort((a, b) => (a.createdAt || 0) - (b.createdAt || 0));
    }

    async deleteSessionKey(peerId) {
        this._ensureUnlocked();
        const sessionId = [this.currentUserId, peerId].sort().join('-');
        await this._delete(STORES.SESSION_KEYS, `session-${sessionId}`);
    }

    // ============== EPHEMERAL KEYS ==============

    async storeEphemeralData(peerId, data) {
        this._ensureUnlocked();
        const sessionId = [this.currentUserId, peerId].sort().join('-');
        const encrypted = await this._encrypt(data);

        await this._put(STORES.SESSION_KEYS, {
            id: `ephemeral-${sessionId}`,
            sessionId,
            userId: this.currentUserId,
            type: 'ephemeral',
            ...encrypted
        });
    }

    async getEphemeralData(peerId) {
        this._ensureUnlocked();
        const sessionId = [this.currentUserId, peerId].sort().join('-');
        const record = await this._get(STORES.SESSION_KEYS, `ephemeral-${sessionId}`);
        if (!record) return null;

        const decrypted = await this._decrypt(record.ciphertext, record.nonce);
        return JSON.parse(decrypted);
    }

    async deleteEphemeralData(peerId) {
        this._ensureUnlocked();
        const sessionId = [this.currentUserId, peerId].sort().join('-');
        await this._delete(STORES.SESSION_KEYS, `ephemeral-${sessionId}`);
    }

    // ============== UTILITY ==============

    getCurrentUserId() {
        return this.currentUserId;
    }
}

// Create singleton instance
const eld = new EncryptedLocalDatabase();

export default eld;
export { EncryptedLocalDatabase, STORES };
