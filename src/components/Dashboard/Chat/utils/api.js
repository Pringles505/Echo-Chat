const fetchPublicIdentityKeyX25519 = async (socket, targetUserId) => {
    return new Promise((resolve, reject) => {
        socket.emit('getPublicIdentityKeyX25519', { targetUserId }, (response) => {
            if (response.success) {
                console.log(response)
                console.log('✅ Fetched publicIdentityKey:', response.publicIdentityKeyX25519);
                resolve(response.publicIdentityKeyX25519);
            } else {
                console.log(targetUserId)
                console.error('❌ Failed to fetch publicIdentityKey:', response.error);
                reject(new Error(response.error));
            }
        });
    });
};

const fetchSignedPreKey = async (socket, targetUserId) => {
    console.log('socket', socket);
    console.log('targetUserId', targetUserId);
    return new Promise((resolve, reject) => {
        socket.emit('getSignedPreKey', { targetUserId }, (response) => {
            if (response.success) {
                console.log('✅ Fetched getSignedPreKey:', response.signedPreKey, response.signature);

                resolve({ signedPreKey: response.signedPreKey, signature: response.signature });
            } else {
                console.error('❌ Failed to fetch getSignedPreKey:', response.error);
                reject(new Error(response.error));
            }
        });
    });
};

const fetchPublicIdentityKeyEd25519 = async (socket, targetUserId) => {
    return new Promise((resolve, reject) => {
        socket.emit('getPublicIdentityKeyEd25519', { targetUserId }, (response) => {
            if (response.success) {
                console.log(response)
                console.log('✅ Fetched PublicIdentityKeyEd25519:', response.publicIdentityKeyEd25519);
                resolve(response.publicIdentityKeyEd25519);
            } else {
                console.error('❌ Failed to fetch publicIdentityKey:', response.error);
                reject(new Error(response.error));
            }
        });
    });
};

const fetchLatestMessageNumber = async (socket, userId, targetUserId) => {
    return new Promise((resolve) => {
        socket.emit('getLatestMessageNumber', { userId, targetUserId }, (response) => {
            // Always resolve with a number
            resolve(response.success ? response.messageNumber : 0);
        });
    });
};

const checkFirstMessage = async (socket, userId, targetUserId) => {
    return new Promise((resolve, reject) => {
      socket.emit('checkIfMessagesExist', { userId, targetUserId }, (response) => {
        if (response.success) {
          console.log('✅ Messages exist for this user pair');
          resolve(true); 
        } else {
          console.log('❌ No messages found for this user pair');
          resolve(false); 
        }
      });
    });
  };

export { fetchPublicIdentityKeyX25519, 
         fetchSignedPreKey, 
         fetchPublicIdentityKeyEd25519, 
         fetchLatestMessageNumber, 
         checkFirstMessage };