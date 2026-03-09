import { hkdf_derive } from '@mascaro101/echo-protocol';

const INFO_RK = new TextEncoder().encode('EchoProtocol/v1/KDF_RK');
const INFO_SENDING_CHAIN = new TextEncoder().encode('EchoProtocol/v1/KDF_SENDING_CHAIN');
const CHAIN_INIT_RECV = new TextEncoder().encode('EchoProtocol/v1/CHAIN_INIT_RECV');

const HKDF_SALT = new Uint8Array();

const CHAIN_SALT = new Uint8Array();
const CHAIN_INFO = new TextEncoder().encode('EchoProtocol/v1/KDF_CK');

export const deriveRootKey = async (oldRootKey, dhOutput) => {
    const combined = new Uint8Array(oldRootKey.length + dhOutput.length);
    combined.set(oldRootKey, 0);
    combined.set(dhOutput, oldRootKey.length);

    return hkdf_derive(combined, HKDF_SALT, INFO_RK, 32);
};

export const deriveChainKeys = (rootKey, userId, targetUserid) => {
    const INFO_CHAIN_INIT = new TextEncoder().encode(`EchoProtocol/v1/CHAIN_INIT`);
    const okm = hkdf_derive(rootKey, new Uint8Array(), INFO_CHAIN_INIT, 64);
    const ck0 = okm.slice(0, 32);
    const ck1 = okm.slice(32);

    const iAmLowerId = String(userId) < String(targetUserid);

    const sendingChainKey = iAmLowerId ? ck0 : ck1;
    const receivingChainKey = iAmLowerId ? ck1 : ck0;

    return { sendingChainKey, receivingChainKey };
}

export const chain_key_KDF = (chainKey) => {
    return hkdf_derive(chainKey, CHAIN_SALT, CHAIN_INFO, 64);
};