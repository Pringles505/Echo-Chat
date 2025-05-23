import { useState, useEffect, useRef } from 'react';
import { jwtDecode } from 'jwt-decode';
import io from 'socket.io-client';
import PropTypes from 'prop-types';
import Logo from '../canLogo/logo';
import './UserChat.css';
import SendText from './sendText';
import DisplayText from './displayText';

// Import DH and AES Rust Modules
import init, { encrypt as wasmEncrypt, decrypt as wasmDecrypt } from './../../../aes-wasm/pkg';
import init_dh, { derive_symmetric_key, diffie_hellman, generate_private_ephemeral_key, 
  generate_public_ephemeral_key, hkdf_derive  } from './../../../dh-wasm/pkg';
import init_xeddsa, {verify_signature} from './../../../xeddsa-wasm/pkg';

// Secret key and nonce for encryption
const nonce = '000102030405060708090a0b'; 

const hexToUint8Array = (hex) => {
  const bytes = [];
  for (let i = 0; i < hex.length; i += 2) {
    bytes.push(parseInt(hex.substr(i, 2), 16));
  }
  return new Uint8Array(bytes);
};

// Convert the nonce from hex to byteArray
const nonceArray = hexToUint8Array(nonce);

// Encrypt and decrypt functions from WebAssembly module
const encrypt = async (text, derivedKey) => {
  console.log("🎈🎈Encrypting with", derivedKey)
  await init();
  console.log('derivedKey:', derivedKey);

  try {
    // Ensure derivedKey is a Uint8Array
    if (!(derivedKey instanceof Uint8Array)) {
      derivedKey = new Uint8Array(derivedKey);
    }
    // Call the WebAssembly encrypt function
    const encryptedText = await wasmEncrypt(text, derivedKey, nonceArray);
    return encryptedText;
  } catch (error) {
    console.error('Encryption error:', error);
    throw error;
  }
};

const decrypt = async (text, derivedKey) => {
  console.log("🎈🎈Decrypting with", derivedKey)
  await init();

  // Ensure the derived key is computed before decryption
  if (!derivedKey) {
    console.error('Derived key is missing');
  }
  try {
    return wasmDecrypt(text, derivedKey, nonceArray);
  } catch (error) {
    console.error('Decryption error:', error);
    throw error;
  }
};

// Serialize and store a derived key per message number
const storeKey = (userId, targetUserId, messageNumber, keyUint8Array) => {
  const sessionId = [userId, targetUserId].join('-');
  const keyStorageKey = `chatKeys-${sessionId}`;
  const keyListJSON = localStorage.getItem(keyStorageKey);
  const keyList = keyListJSON ? JSON.parse(keyListJSON) : [];

  // Ensure the array has enough length to insert at `messageNumber`
  while (keyList.length < messageNumber) {
    keyList.push(null); // pad missing indices
  }

  keyList[messageNumber] = Array.from(keyUint8Array);
  localStorage.setItem(keyStorageKey, JSON.stringify(keyList));
};




const getLatestKey = (userId, targetUserId) => {
  const sessionId = [userId, targetUserId].join('-');
  const keyStorageKey = `chatKeys-${sessionId}`;
  const keyListJSON = localStorage.getItem(keyStorageKey);
  if (!keyListJSON) return null;

  const keyList = JSON.parse(keyListJSON);
  if (!Array.isArray(keyList) || keyList.length === 0) return null;

  const latestKeyArray = keyList[keyList.length - 1];
  if (!latestKeyArray || latestKeyArray.length !== 32) {
    console.error("❌ Latest key is invalid or wrong length:", latestKeyArray);
    return null;
  }

  return new Uint8Array(latestKeyArray);
};



// Retrieve the derived key for a given message number
const getKey = (userId, targetUserId, index) => {
  const sessionId = [userId, targetUserId].join('-');
  const keyStorageKey = `chatKeys-${sessionId}`;
  const keyListJSON = localStorage.getItem(keyStorageKey);
  if (!keyListJSON) return null;

  const keyList = JSON.parse(keyListJSON);
  const keyArray = keyList[index];
  if (!keyArray) return null;

  const key = new Uint8Array(keyArray);
  console.log(`🔑 Retrieved key for index ${index} (length ${key.length}):`, key);
  return key;
};



const getNextSharedMessageNumber = (userId, targetUserId) => {
  const sessionId = [userId, targetUserId].join('-');
  const key = `chatSession-${sessionId}-counter`;
  const currentValue = parseInt(localStorage.getItem(key) || '0', 10);
  const nextValue = currentValue + 1;
  localStorage.setItem(key, nextValue.toString());
  return nextValue;
};



// Main chat component
function Chat({ token, activeChat }) {
  const socket = io(import.meta.env.VITE_SOCKET_URL, {
    auth: { token },
  });

  // Convert the Base64 string into a Uint8Array
  // Used when extracting the private key from localstorage, localstorage only stores strings
  const base64ToArrayBuffer = (base64String) => {
    const binaryString = atob(base64String);
    const byteArray = new Uint8Array(binaryString.length);
    for (let i = 0; i < binaryString.length; i++) {
      byteArray[i] = binaryString.charCodeAt(i);
    }
    return byteArray;
  };

  const arrayBufferToBase64 = (buffer) => {
    let binary = '';
    const bytes = new Uint8Array(buffer);
    const len = bytes.byteLength;
    for (let i = 0; i < len; i++) {
      binary += String.fromCharCode(bytes[i]);
    }
    console.log('CONVERTED ARRAY BUFFER TO BASE64:', btoa(binary));
    return btoa(binary);
  };

  // Extract the private key from localstorage and convert it to a ByteArray
  const storedPrivateKey = localStorage.getItem('privateKeyX25519');
  const privateKeyArray = base64ToArrayBuffer(storedPrivateKey);

  // Fetches the pubIK from the current targetUser
  const fetchPublicIdentityKeyX25519 = async (targetUserId) => {
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

  const fetchLatestMessageNumber = async () => {
    return new Promise((resolve, reject) => {
      socket.emit('getLatestMessageNumber', { userId, targetUserId }, (response) => {
        if (response.success) {
          const messageNumber = (response.messageNumber !== undefined) ? response.messageNumber : 0;
          const retrievedUserId = response.userId || userId;
          console.log('✅ Latest message number:', messageNumber);  
          console.log('by: ', retrievedUserId)
          resolve(messageNumber, retrievedUserId);
        } else {
          console.log('No messages found, starting with messageNumber 1');
          resolve(0);
        }
      });
    });
  };
  const checkFirstMessage = async () => {
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

  // Fetches the pubIK from the current targetUser
  const fetchPublicIdentityKeyEd25519 = async (targetUserId) => {
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

  // Fetches the pubSPK from the current targetUser
  const fetchSignedPreKey = async (targetUserId) => {
    return new Promise((resolve, reject) => {
      socket.emit('getSignedPreKey', { targetUserId }, (response) => {
        if (response.success) {
          console.log('✅ Fetched getSignedPreKey:', response.signedPreKey, response.signature);

          resolve({signedPreKey: response.signedPreKey, signature: response.signature});
        } else {
          console.error('❌ Failed to fetch getSignedPreKey:', response.error);
          reject(new Error(response.error));
        }
      });
    });
  };

  const updateSavedMessages = (message) => {
    console.log('📂 Updating saved messages');
    console.log('📂 Saved message:', message);
 
    const savedSessionKey = `chatSession-${userId}-${targetUserId}`;
    const savedSession = localStorage.getItem(savedSessionKey);
    let savedMessages = [];

    if (savedSession) {
      const parsedSession = JSON.parse(savedSession);
      savedMessages = parsedSession.savedMessages || [];

      if (savedMessages.some(msg => msg._id === message._id)) {
        console.log('⚠️ Duplicate message ignored:', message._id);
        
        return;
      }
    }

    savedMessages.push(message);
    const updatedSession = {
      savedMessages,
    };
    localStorage.setItem(savedSessionKey, JSON.stringify(updatedSession));
    console.log('📂 Updated saved messages:', savedMessages);

    setMessages(savedMessages);
    
  }

  const userId = token ? jwtDecode(token).id : '';
  const targetUserId = activeChat;
  const username = token ? jwtDecode(token).username : '';
  const [messages, setMessages] = useState([]);
  const [globalDerivedKey, setDerivedKey] = useState();
  const [messageNumber, setMessageNumber] = useState(0);
  const [continueChain, setContinueChain] = useState(false);
  const messagesEndRef = useRef(null);

  // Compute the derived key using Diffie-Hellman key exchange
  // and derive a symmetric key from the shared secret
  const computeDerivedKey = async () => {
    await init_dh();

    // Fetch the pubIk and convert it to a ByteArray
    const encTargetPublicIdentityKey = await fetchPublicIdentityKeyX25519(targetUserId);
    const targetPublicIdentityKey = base64ToArrayBuffer(encTargetPublicIdentityKey);

    console.log('Target Public Identity Key:', targetPublicIdentityKey);
    console.log('Private Key:', privateKeyArray);

    // Compute the shared secret using X3DH
    const sharedSecret = await diffie_hellman(privateKeyArray, targetPublicIdentityKey);
    const derivedKey = await derive_symmetric_key(sharedSecret);


    console.log('🖥️Derived key:', derivedKey);
    setDerivedKey(derivedKey);
    return derivedKey;
  };

  const initializeDoubleRatchet = async (ephemeralKey_private, publicEphemeralKey) => {
    await init_dh();
    console.log('🗝️⚠️⚠️Initializing Double Ratchet...');
    const encTargetPublicIdentityKeyX25519 = await fetchPublicIdentityKeyX25519(targetUserId);
    const targetPublicIdentityKeyX25519 = base64ToArrayBuffer(encTargetPublicIdentityKeyX25519);
    console.log('BINGO');
    const { signedPreKey, signature } = await fetchSignedPreKey(targetUserId);
    const targetSignedPreKey = base64ToArrayBuffer(signedPreKey);
    const targetSignature = base64ToArrayBuffer(signature);

    console.log('🗝️⚠️⚠️Init XEdDSA with', targetSignedPreKey, targetSignature, targetPublicIdentityKeyX25519);

    await init_xeddsa();
    const isValidSignature = await verify_signature(
      targetSignature,
      targetSignedPreKey,
      targetPublicIdentityKeyX25519);
    console.log('Signature valid:', isValidSignature);


    const publicIdentityKeyX25519 = localStorage.getItem('publicKeyX25519');
    console.log("🗝️🎈 publicIdentityKeyX25519: ", publicIdentityKeyX25519)
    console.log("🗝️🎈 publicEphemeralKey: ", publicEphemeralKey)

    console.log("🎈🎈 Init DR with: ")
    console.log("🎈", "target Public IK: ", targetPublicIdentityKeyX25519)
    console.log("🎈", "target Public PK: ", targetSignedPreKey)
    console.log("🎈", "private EK: ", ephemeralKey_private)
    console.log("🎈", "private IK", privateKeyArray)


    const dh1 = await diffie_hellman(privateKeyArray, targetSignedPreKey);
    const dh2 = await diffie_hellman(ephemeralKey_private, targetPublicIdentityKeyX25519);
    const dh3 = await diffie_hellman(ephemeralKey_private, targetSignedPreKey);

    console.log('DH1:', dh1);
    console.log('Private Key:', privateKeyArray);
    console.log('Target Signed PreKey:', targetSignedPreKey);

    console.log('DH2:', dh2);
    console.log('Target Public Identity Key:', targetPublicIdentityKeyX25519);
    console.log('Private Ephemeral Key:', ephemeralKey_private);

    console.log('DH3:', dh3);

    
    const IKM = new Uint8Array(dh1.length + dh2.length + dh3.length);
    IKM.set(dh1, 0);
    IKM.set(dh2, dh1.length);
    IKM.set(dh3, dh1.length + dh2.length);
    console.log('IKM:', IKM);

    //HKDF the IKM to produce the root key
    const root_key = hkdf_derive(IKM, 0, "EchoProtocol", 32)
    console.log('Root Key:', root_key);

    return root_key;
  }

  const continueDoubleRatchetChain = async (previousTargetPublicEphemeralKeyBase64, privateEphemeralKey) => {
    console.log("🚧🚧Continue DR Chain🚧🚧")
    console.log("🚧🚧Previous Target Public Ephemeral Key Base64: ", previousTargetPublicEphemeralKeyBase64)
    console.log("🚧🚧Private Ephemeral Key: ", privateEphemeralKey)

    // Only convert if not already a Uint8Array
    let previousTargetPublicEphemeralKey;
    if (previousTargetPublicEphemeralKeyBase64 instanceof Uint8Array) {
      previousTargetPublicEphemeralKey = previousTargetPublicEphemeralKeyBase64;
    } else {
      previousTargetPublicEphemeralKey = base64ToArrayBuffer(previousTargetPublicEphemeralKeyBase64);
    }
    console.log("🚧🚧Previous Target Public Ephemeral Key: ", previousTargetPublicEphemeralKey)

    await init_dh();
    const DH4 = await diffie_hellman(privateEphemeralKey, previousTargetPublicEphemeralKey);
    const chainKey = hkdf_derive(DH4, 0, "EchoProtocol", 32);

    return chainKey;
  }
  const initializeDoubleRatchetResponse = async (message) => {
    console.log("🚧🚧DR Response🚧🚧")
    
    
    await init_dh();
    // Retrieve the privatePreKey from local storage
    const storedPrivatePreKey = localStorage.getItem('privatePreKey');
    if (!storedPrivatePreKey) {
      throw new Error('Private PreKey not found in local storage');
    }
    const privatePreKey = base64ToArrayBuffer(storedPrivatePreKey);

    const encTargetPublicIdentityKey = await fetchPublicIdentityKeyX25519(targetUserId);
    const targetPublicIdentityKey = base64ToArrayBuffer(encTargetPublicIdentityKey);

    const encTargetPublicEphemeralKey = message.publicEphemeralKey;
    const targetPublicEphemeralKey = base64ToArrayBuffer(encTargetPublicEphemeralKey);


    console.log("🎈🎈 Init DR Response with: ");
    console.log("🎈", "target Public IK: ", targetPublicIdentityKey)
    console.log("🎈", "private PreKey: ", privatePreKey)
    console.log("🎈", "target Public EK: ", targetPublicEphemeralKey)

    const dh1 = await diffie_hellman(privatePreKey, targetPublicIdentityKey);
    const dh2 = await diffie_hellman(privateKeyArray, targetPublicEphemeralKey);
    const dh3 = await diffie_hellman(privatePreKey, targetPublicEphemeralKey);

    console.log('DH1:', dh1);
    console.log('Private PreKey:', privatePreKey);
    console.log('Target Public Identity Key:', targetPublicIdentityKey);

    console.log('DH2:', dh2);
    console.log('Target Public Ephemeral Key:', targetPublicEphemeralKey);

    console.log('DH3:', dh3);
    console.log('Private Key:', privateKeyArray);

    const IKM = new Uint8Array(dh1.length + dh2.length + dh3.length); 
    IKM.set(dh1, 0);
    IKM.set(dh2, dh1.length);
    IKM.set(dh3, dh1.length + dh2.length);
    console.log('IKM:', IKM);

    const root_key = hkdf_derive(IKM, 0, "EchoProtocol", 32)
    console.log('Root Key:', root_key);
    return root_key;
  }

  useEffect(() => {
    if (!userId || !targetUserId) return;
  
    console.log(`🔄 Fetching messages for chat: User ${userId} ↔ Target ${targetUserId}`);

    // Clear messages when switching chats, messages are not stored in local storage
    // Clear derivedKey
    setMessages([]);
    setDerivedKey(null);
  
    const initChat = async () => {

      // Fetch the latest message number
      const latestMessageNumber = await fetchLatestMessageNumber();
      console.log('📩 Latest message number:', latestMessageNumber);
      setMessageNumber(latestMessageNumber);
  
      // Initialize the socket connection and emit the 'ready' event
      socket.emit('ready', { userId, targetUserId });

      // Handle incoming chat messages in real-time
      const handleChatMessage = async (payload) => {

        const messages = Array.isArray(payload) ? payload : [payload];

        for (const message of messages) {
          try {

            // Skip own messages
            if (message.userId === userId) {
              console.log("📩 Received my own message");

              const derivedKey = getKey(userId, targetUserId, message.messageNumber);
              if (!derivedKey) {
                console.error(`❌ No key found for self message number ${message.messageNumber}`);
                return;
              }

              const decryptedMessage = {
                ...message,
                text: await decrypt(message.text, derivedKey),
              };

              const targetPublicEphemeralKeyBase64 = message.publicEphemeralKey;
              localStorage.setItem('previousTargetPublicEphemeralKey', targetPublicEphemeralKeyBase64);

              updateSavedMessages(decryptedMessage);
              continue;
          }

            console.log('📩 Received real-time message:', message);

            const targetPublicEphemeralKeyBase64 = message.publicEphemeralKey;
            localStorage.setItem('previousTargetPublicEphemeralKey', targetPublicEphemeralKeyBase64);

            const sender = String(message.userId);

            if (activeChat === sender) {
              socket.emit('messageSeen', { userId, targetUserId });
            }
            let derived_rootKey = null;
            if (message.is_initial == true) {
              derived_rootKey = await initializeDoubleRatchetResponse(message);
            } else {
              const sessionId = [userId, targetUserId].join('-');
              const privateEphemeralBase64 = localStorage.getItem(`ephPriv-${sessionId}`)
              const privateEphemeral = base64ToArrayBuffer(privateEphemeralBase64);

              derived_rootKey = await continueDoubleRatchetChain(message.publicEphemeralKey, privateEphemeral);
            }
            console.log("Computed Derived Key", derived_rootKey)
            storeKey(userId, message.userId, message.messageNumber, derived_rootKey)
          
          } catch (err) {
            console.error('❌ Error handling message:', err, message);
          }

          const derivedKey = getKey(userId, targetUserId, message.messageNumber);
          console.log("Derived Key: ", derivedKey)
          if (!derivedKey) {
            console.error(`❌ No key found for message number ${message.messageNumber}`);
            return;
          }

          const decryptedMessage = {
            ...message,
            text: await decrypt(message.text, derivedKey),
          };

          updateSavedMessages(decryptedMessage);
          localStorage.setItem('messages', JSON.stringify(decryptedMessage));
        }
      };
  
      // Listen for incoming messages and initial messages
      socket.on('newMessage', handleChatMessage);
    };
  
    initChat();
  
    // Cleanup function to remove listeners when the component unmounts or when userId or targetUserId changes
    return () => {
      console.log(`🧹 Cleaning up listeners for chat: User ${userId} ↔ Target ${targetUserId}`);
      socket.off('initChat');
      socket.off('newMessage');
    };
  }, [userId, targetUserId]);
  

  // Scroll to the bottom of the messages container when new messages are added
  useEffect(() => {
    const container = document.querySelector(".messages-container");
    if (container) {
      container.scrollTop = container.scrollHeight;
    }
  }, [messages]);

  // Mark messages as seen when the user opens the chat
  const markMessagesAsSeen = (messages) => {
    // Check if the current user is the target user of the messages
    const unseenMessages = messages.filter((msg) => msg.userId !== userId);
    // if the messages are not seen and belong to the target user mark as seen
    if (unseenMessages.length > 0 && unseenMessages.seenStatus === false) {
      socket.emit('messageSeen', { userId, targetUserId });
      console.log('👀 Marking all UnseenMessages as seen');
    }
  };

  // Send message function
  const sendMessage = async (text) => {
    console.log('🧑‍🤝‍🧑 Checking Session State 🧑‍🤝‍🧑')
    const currentMessageNumber = getNextSharedMessageNumber (userId, targetUserId);

    console.log("🧮 Using message number:", currentMessageNumber);

      // THIS WILL BE CHANGED TO AN ENCRYPTED LOCAL DB INSTEAD OF THE PUBLIC ACCESS LOCALSTORAGE
      const currentKeyChain = getLatestKey(userId, targetUserId);
      console.log("🗝️Current Key Chain: ", currentKeyChain)

       // Set inital message to false and publicEphemeralKey local var
      let isInitialMessage = false;
      let publicEphemeralKeyBase64 = null;
      let root_key = null;

      if (currentKeyChain) {
        console.log('currentKeyChain:', currentKeyChain);
        console.log("⛓️⛓️ Continuing ⛓️⛓️");
        const randomBytes = crypto.getRandomValues(new Uint8Array(32));

        await init_dh();
        const privateEphemeralKey = generate_private_ephemeral_key(randomBytes);
        const publicEphemeralKey = generate_public_ephemeral_key(privateEphemeralKey);

        const sessionId = [userId, targetUserId].join('-');
        localStorage.setItem(`ephPriv-${sessionId}`, arrayBufferToBase64(privateEphemeralKey));

        publicEphemeralKeyBase64 = arrayBufferToBase64(publicEphemeralKey);

        console.log('Saved To State: ', publicEphemeralKeyBase64);
        console.log('🗝️🗝️ Generated ephemeral keys:', publicEphemeralKey, privateEphemeralKey);

        const previousTargetPublicEphemeralKey = localStorage.getItem('previousTargetPublicEphemeralKey');
        const previousTargetPublicEphemeralKeyArray = base64ToArrayBuffer(previousTargetPublicEphemeralKey);
        
        let new_root_key = null;
        if (previousTargetPublicEphemeralKey){
          console.log("Previous Target Public Ephemeral Key: ", previousTargetPublicEphemeralKey)
          new_root_key = await continueDoubleRatchetChain(previousTargetPublicEphemeralKeyArray, privateEphemeralKey);
          console.log("New Root Key: ", new_root_key)
        } else {
          console.log("No previous target public ephemeral key found")
          new_root_key = await continueDoubleRatchetChain(currentKeyChain, currentKeyChain);
        }
        storeKey(userId, targetUserId, currentMessageNumber, new_root_key);

      } else {
        console.log("⛓️⛓️ No chain, initializing new chain ⛓️⛓️")
        // If no session data is found, check if it's the first message
        isInitialMessage = !(await checkFirstMessage());
        console.log('Is this the first message?', isInitialMessage);

        console.log('📂No session data found, generating new session...📂');
        const randomBytes = crypto.getRandomValues(new Uint8Array(32));

        await init_dh();
        const privateEphemeralKey = generate_private_ephemeral_key(randomBytes);
        const publicEphemeralKey = generate_public_ephemeral_key(privateEphemeralKey);

        publicEphemeralKeyBase64 = arrayBufferToBase64(publicEphemeralKey);

        console.log('Saved To State: ', publicEphemeralKeyBase64);
        console.log('🗝️ Generated ephemeral keys:', publicEphemeralKey, privateEphemeralKey);

        const sessionId = [userId, targetUserId].join('-');
        localStorage.setItem(`ephPriv-${sessionId}`, arrayBufferToBase64(privateEphemeralKey));

        if (isInitialMessage) {
          console.log("🤪🤪🤪🤪🤪")
          const root = await initializeDoubleRatchet(privateEphemeralKey, publicEphemeralKey);
          root_key = root
          localStorage.setItem('derivedKey', root_key);
          setDerivedKey(root_key);
          console.log('✅Setting The Derived Key to the Root:', root_key);
        }
      }

    // check if the text is empty
    if (!text.trim()) return;


    try {
      // Encrypt the message using the derived key

      let encryptedText = null;
      const latestMessageNumber = await fetchLatestMessageNumber();
      console.log("🚧🚧root_key: ", root_key, "currentKeyChain: ", currentKeyChain)
      if (!continueChain && !isInitialMessage) {
        console.log("🚧🚧Encrypting with: ", currentKeyChain)

        const currentKeyChainU8 = getLatestKey(userId, targetUserId);

        encryptedText = await encrypt(text, currentKeyChainU8);  
        storeKey(userId, targetUserId, latestMessageNumber + 1, currentKeyChainU8);


      }else{
        console.log("🚧Encrypting with: ", root_key)
        encryptedText = await encrypt(text, root_key);  

        if (isInitialMessage) {
          storeKey(userId, targetUserId, 0, root_key);
        } else {
          storeKey(userId, targetUserId, latestMessageNumber, root_key);
        }
      }

    // Emit the message to the server with additional fields
    if (isInitialMessage) {
      socket.emit('newMessage', {
      text: encryptedText,
      userId,
      targetUserId,
      username,
      is_initial: isInitialMessage,
      messageNumber: 0,
      publicEphemeralKey: publicEphemeralKeyBase64,
      });
    } else {
      socket.emit('newMessage', {
      text: encryptedText,
      userId,
      targetUserId,
      username,
      is_initial: isInitialMessage,
      messageNumber: currentMessageNumber,
      publicEphemeralKey: publicEphemeralKeyBase64,
    });
    }

    console.log('📤 Sent message:', {
      text: encryptedText,
      is_initial: isInitialMessage,
      messageNumber: currentMessageNumber,
      publicEphemeralKey: publicEphemeralKeyBase64,
    });
    } catch (error) {
      console.error('Failed to send message:', error);
    }
  };

  // Listen for messageSeenUpdatem wehn the target user sees the message
  // In this case, targetUserId=userId and userId=targetUserId, since its sent from the target user
  socket.on('messageSeenUpdate', ({ userId, targetUserId }) => {
    console.log('👀', targetUserId, 'Message seen by:', userId);
    setMessages((prevMessages) =>
      prevMessages.map((msg) => {
        return { ...msg, seenStatus: true };
      })
    );
  });

  return (
    <div className="app-container">
      <div className="logo-container">
        <Logo />
      </div>
      <div className="chat-container">
        <div className="messages-container">
          <DisplayText messages={messages} currentUserId={userId} />
          <div ref={messagesEndRef} />
        </div>
        <SendText sendMessage={sendMessage} />
      </div>
    </div>
  );
}

Chat.propTypes = {
  token: PropTypes.string.isRequired,
  activeChat: PropTypes.string.isRequired,
};

export default Chat;
