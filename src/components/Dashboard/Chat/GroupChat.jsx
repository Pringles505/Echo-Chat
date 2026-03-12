import { useEffect, useMemo, useRef, useState } from "react";
import PropTypes from "prop-types";
import { getSocket } from "../../../socket";
import DisplayText from "./MessageDisplay/displayText";
import GroupSendText from "./MessageInput/GroupSendText";

import {
  applyCommit,
  createNewGroupState,
  decryptApplicationMessage,
  encryptApplicationMessage,
  loadGroupState,
  saveGroupState,
  processWelcome,
} from "./utils/crypto/groupCryptoProvider";

const TEXT_ENCODER = new TextEncoder();
const TEXT_DECODER = new TextDecoder();
const MLS_UNAVAILABLE_TEXT = "[Unable to decrypt message]";
const MLS_KEY_MISSING_REASON = "MLS state is not ready on this device yet";
const DEFAULT_MLS_CIPHER_SUITE = "MLS-MVP/X25519_AES256GCM_SHA256";

const GroupChat = ({ activeGroupId, activeGroupName, userId, username, currentWallpaper }) => {
  const socket = useMemo(() => getSocket(), []);
  const [messages, setMessages] = useState([]);
  const [members, setMembers] = useState([]);
  const [role, setRole] = useState(null);
  const [groupCryptoState, setGroupCryptoState] = useState(null);
  const [groupMeta, setGroupMeta] = useState({
    mlsEnabled: false,
    epoch: 0,
    cipherSuite: null,
    createdBy: null,
  });

  const isInitialLoadRef = useRef(true);
  const messagesEndRef = useRef(null);
  const groupCryptoStateRef = useRef(null);
  const groupMetaRef = useRef(groupMeta);

  useEffect(() => {
    groupCryptoStateRef.current = groupCryptoState;
  }, [groupCryptoState]);

  useEffect(() => {
    groupMetaRef.current = groupMeta;
  }, [groupMeta]);

  const buildRoster = (serverMembers) =>
    Array.isArray(serverMembers)
      ? serverMembers.map((member, index) => ({
          userId: String(member?.userId ?? member?.id ?? ""),
          username: member?.username ?? "Member",
          leafIndex: Number.isInteger(member?.leafIndex) ? member.leafIndex : index,
        }))
      : [];

  const parseArtifactPayload = (message) => {
    if (typeof message?.payload !== "string" || message.payload.length === 0) return null;

    try {
      return JSON.parse(message.payload);
    } catch (err) {
      console.error("[GroupChat] Failed to parse stored MLS artifact payload:", err);
      return null;
    }
  };

  const syncLocalStateFromServer = async ({ roster, responseGroup, responseMembership }) => {
    const currentState = await loadGroupState(activeGroupId);
    const serverLeafIndex = Number.isInteger(responseMembership?.leafIndex)
      ? responseMembership.leafIndex
      : roster.find((member) => String(member.userId) === String(userId))?.leafIndex ?? null;

    if (!currentState) {
      if (responseGroup?.mlsEnabled && String(responseGroup?.createdBy ?? "") !== String(userId)) {
        return saveGroupState(activeGroupId, {
          groupId: activeGroupId,
          epoch: Number.isInteger(responseGroup?.epoch) ? responseGroup.epoch : 0,
          cipherSuite: responseGroup?.cipherSuite ?? DEFAULT_MLS_CIPHER_SUITE,
          selfUserId: userId,
          selfLeafIndex: serverLeafIndex,
          groupKeyB64: null,
          applicationMessageCounter: 0,
          roster,
          tree: { nodes: [], root: null },
          secrets: { epochSecretsB64: null, initSecretB64: null },
          pendingCommits: [],
        });
      }

      return createNewGroupState({
        groupId: activeGroupId,
        creatorUserId: userId,
        roster,
        cipherSuite: responseGroup?.cipherSuite ?? DEFAULT_MLS_CIPHER_SUITE,
      });
    }

    const nextState = {
      ...currentState,
      epoch: Number.isInteger(responseGroup?.epoch) ? responseGroup.epoch : currentState.epoch,
      cipherSuite: responseGroup?.cipherSuite ?? currentState.cipherSuite,
      selfLeafIndex: serverLeafIndex,
      roster,
    };

    const rosterChanged = JSON.stringify(currentState.roster ?? []) !== JSON.stringify(roster);
    const needsSave =
      rosterChanged ||
      currentState.epoch !== nextState.epoch ||
      currentState.cipherSuite !== nextState.cipherSuite ||
      currentState.selfLeafIndex !== nextState.selfLeafIndex;

    return needsSave ? saveGroupState(activeGroupId, nextState) : nextState;
  };

  const formatMessage = async (message, cryptoState, meta) => {
    const createdAt = message?.createdAt || message?.timestamp || new Date().toISOString();
    const id = message?._id || `${String(message?.groupId ?? activeGroupId)}:${String(message?.seq ?? createdAt)}`;
    const fromUsername =
      message?.username || (String(message?.userId) === String(userId) ? username : "Member");

    let text = "";

    if (meta?.mlsEnabled && message?.contentType === "application" && message?.headerB64 && message?.ciphertextB64) {
      try {
        const plaintextBytes = await decryptApplicationMessage({
          state: cryptoState,
          header: message.headerB64,
          ciphertext: message.ciphertextB64,
        });
        text = TEXT_DECODER.decode(plaintextBytes);
      } catch (err) {
        console.error("[GroupChat] Failed to decrypt MLS message:", err);
        text = MLS_UNAVAILABLE_TEXT;
      }
    } else if (typeof message?.payload === "string") {
      text = message.payload;
    } else if (typeof message?.text === "string") {
      text = message.text;
    }

    return {
      _id: id,
      userId: String(message?.userId ?? ""),
      username: fromUsername,
      text,
      createdAt,
      seenStatus: true,
    };
  };

  const replayFetchedMessages = async ({ fetchedMessages, initialState, initialMeta }) => {
    let replayState = initialState;
    let replayMeta = initialMeta;
    const formattedMessages = [];

    for (const message of Array.isArray(fetchedMessages) ? fetchedMessages : []) {
      if (initialMeta?.mlsEnabled && message?.contentType === "commit") {
        const commit = parseArtifactPayload(message);
        if (!commit) continue;

        replayState = await applyCommit({
          state: replayState,
          commit,
        });
        replayState = await saveGroupState(activeGroupId, replayState);
        replayMeta = {
          ...replayMeta,
          epoch: Number.isInteger(commit?.epoch) ? commit.epoch : replayMeta.epoch,
        };
        continue;
      }

      if (initialMeta?.mlsEnabled && message?.contentType === "welcome") {
        const welcome = parseArtifactPayload(message);
        if (!welcome || String(welcome.recipientUserId ?? "") !== String(userId)) continue;

        replayState = await processWelcome({
          welcome,
          selfUserId: userId,
        });
        replayState = await saveGroupState(activeGroupId, replayState);
        continue;
      }

      formattedMessages.push(await formatMessage(message, replayState, replayMeta));
    }

    return {
      formattedMessages,
      replayState,
      replayMeta,
    };
  };

  useEffect(() => {
    if (!activeGroupId) return;
    let cancelled = false;

    setMessages([]);
    setMembers([]);
    setRole(null);
    setGroupCryptoState(null);
    setGroupMeta({
      mlsEnabled: false,
      epoch: 0,
      cipherSuite: null,
      createdBy: null,
    });
    groupMetaRef.current = {
      mlsEnabled: false,
      epoch: 0,
      cipherSuite: null,
      createdBy: null,
    };
    groupCryptoStateRef.current = null;
    isInitialLoadRef.current = true;

    socket.emit("openGroup", { groupId: activeGroupId }, async (res) => {
      if (cancelled || !res?.success) return;

      const roster = buildRoster(res.members);
      const nextMeta = {
        mlsEnabled: res?.group?.mlsEnabled === true,
        epoch: Number.isInteger(res?.group?.epoch) ? res.group.epoch : 0,
        cipherSuite: res?.group?.cipherSuite ?? null,
        createdBy: res?.group?.createdBy ?? null,
      };

      setMembers(Array.isArray(res.members) ? res.members : []);
      setRole(res?.membership?.role ?? null);
      setGroupMeta(nextMeta);

      const localState = await syncLocalStateFromServer({
        roster,
        responseGroup: res?.group,
        responseMembership: res?.membership,
      });

      if (cancelled) return;

      setGroupCryptoState(localState);
      groupCryptoStateRef.current = localState;

      socket.emit("fetchGroupMessages", { groupId: activeGroupId, limit: 50 }, async (msgRes) => {
        if (cancelled || !msgRes?.success || !Array.isArray(msgRes.messages)) return;

        const replayed = await replayFetchedMessages({
          fetchedMessages: msgRes.messages,
          initialState: localState,
          initialMeta: nextMeta,
        });

        if (!cancelled) {
          setMessages(replayed.formattedMessages);
          setGroupCryptoState(replayed.replayState);
          groupCryptoStateRef.current = replayed.replayState;
          setGroupMeta(replayed.replayMeta);
          groupMetaRef.current = replayed.replayMeta;
        }
      });
    });

    const handleNewGroupMessage = async (message) => {
      if (String(message?.groupId ?? "") !== String(activeGroupId)) return;

      const formatted = await formatMessage(
        message,
        groupCryptoStateRef.current,
        groupMetaRef.current
      );

      if (!cancelled) {
        setMessages((prev) => [...prev, formatted]);
      }
    };

    const handleMembershipChanged = (evt) => {
      if (String(evt?.groupId ?? "") !== String(activeGroupId)) return;

      socket.emit("openGroup", { groupId: activeGroupId }, async (res) => {
        if (cancelled || !res?.success) return;

        const roster = buildRoster(res.members);
        const nextMeta = {
          mlsEnabled: res?.group?.mlsEnabled === true,
          epoch: Number.isInteger(res?.group?.epoch) ? res.group.epoch : 0,
          cipherSuite: res?.group?.cipherSuite ?? null,
          createdBy: res?.group?.createdBy ?? null,
        };

        setMembers(Array.isArray(res.members) ? res.members : []);
        setRole(res?.membership?.role ?? null);
        setGroupMeta(nextMeta);

        const nextState = await syncLocalStateFromServer({
          roster,
          responseGroup: res?.group,
          responseMembership: res?.membership,
        });

        if (!cancelled) {
          setGroupCryptoState(nextState);
          groupCryptoStateRef.current = nextState;
        }
      });
    };

    const handleGroupWelcome = async ({ groupId, welcome }) => {
      if (String(groupId ?? "") !== String(activeGroupId)) return;

      try {
        const nextState = await processWelcome({
          welcome, 
          selfUserId: userId,
        });

        const persistedState = await saveGroupState(activeGroupId, nextState);

        if (cancelled) return;  
        setGroupCryptoState(persistedState);
        groupCryptoStateRef.current = persistedState;
      } catch (err) {
        console.error("[GroupChat] Failed to process group welcome:", err);
      }
    };

    const handleGroupCommit = async ({ groupId, commit }) => {
      if (String(groupId ?? "") !== String(activeGroupId)) return;

      try {
        const nextState = await applyCommit({
          state: groupCryptoStateRef.current,
          commit,
        });
        const persistedState = await saveGroupState(activeGroupId, nextState);

        if (cancelled) return;
        setGroupCryptoState(persistedState);
        groupCryptoStateRef.current = persistedState;
        setGroupMeta((prev) => {
          const nextMeta = {
            ...prev,
            epoch: Number.isInteger(commit?.epoch) ? commit.epoch : prev.epoch,
          };
          groupMetaRef.current = nextMeta;
          return nextMeta;
        });
      } catch (err) {
        console.error("[GroupChat] Failed to apply group commit:", err);
      }
    };

    socket.on("groupCommit", handleGroupCommit);
    socket.on("groupWelcome", handleGroupWelcome);
    socket.on("newGroupMessage", handleNewGroupMessage);
    socket.on("groupMemberAdded", handleMembershipChanged);
    socket.on("groupMemberRemoved", handleMembershipChanged);

    return () => {
      cancelled = true;
      socket.off("groupCommit", handleGroupCommit);
      socket.off("groupWelcome", handleGroupWelcome);
      socket.off("newGroupMessage", handleNewGroupMessage);
      socket.off("groupMemberAdded", handleMembershipChanged);
      socket.off("groupMemberRemoved", handleMembershipChanged);
    };
  }, [activeGroupId, socket, userId, username]);

  useEffect(() => {
    if (!messagesEndRef.current) return;
    const behavior = isInitialLoadRef.current ? "auto" : "smooth";
    messagesEndRef.current.scrollIntoView({ behavior });
    isInitialLoadRef.current = false;
  }, [messages]);

  const sendMessage = async (text) => {
    const currentMeta = groupMetaRef.current;

    if (currentMeta?.mlsEnabled) {
      const currentState = groupCryptoStateRef.current;
      if (!currentState?.groupKeyB64) {
        throw new Error(MLS_KEY_MISSING_REASON);
      }

      const encrypted = await encryptApplicationMessage({
        state: currentState,
        plaintextBytes: TEXT_ENCODER.encode(text),
      });

      return new Promise((resolve, reject) => {
        socket.emit(
          "sendGroupMessage",
          {
            groupId: activeGroupId,
            nonce: encrypted.nonceB64,
            messageType: "text",
            contentType: "application",
            headerB64: encrypted.headerB64,
            ciphertextB64: encrypted.ciphertextB64,
            epoch: encrypted.header.epoch,
            senderLeafIndex: encrypted.header.senderLeafIndex,
          },
          async (ack) => {
            if (ack?.success) {
              const persistedState = await saveGroupState(activeGroupId, encrypted.newState);
              setGroupCryptoState(persistedState);
              groupCryptoStateRef.current = persistedState;
              resolve(ack);
              return;
            }

            const msg = ack?.details
              ? `${ack?.error || "Failed to send group message"}: ${ack.details}`
              : (ack?.error || "Failed to send group message");
            reject(new Error(msg));
          }
        );
      });
    }

    const nonce = (globalThis.crypto?.randomUUID && globalThis.crypto.randomUUID()) || String(Date.now());
    return new Promise((resolve, reject) => {
      socket.emit(
        "sendGroupMessage",
        { groupId: activeGroupId, payload: text, nonce, messageType: "text" },
        (ack) => {
          if (ack?.success) resolve(ack);
          else {
            const msg = ack?.details ? `${ack?.error || "Failed to send group message"}: ${ack.details}` : (ack?.error || "Failed to send group message");
            reject(new Error(msg));
          }
        }
      );
    });
  };

  const sendDisabled = groupMeta.mlsEnabled && !groupCryptoState?.groupKeyB64;

  return (
    <div className="app-container h-full flex flex-col">
      <div className="chat-container flex-1 flex flex-col relative overflow-y-auto">
        <div className="messages-container flex-1 relative" data-wallpaper={currentWallpaper}>
          <div className="relative z-10 h-full flex flex-col">
            <DisplayText messages={messages} currentUserId={String(userId)} />
            <div ref={messagesEndRef} />
          </div>
        </div>
      </div>

      <GroupSendText
        sendMessage={sendMessage}
        disabled={sendDisabled}
        disabledReason={MLS_KEY_MISSING_REASON}
      />

    </div>
  );
};

GroupChat.propTypes = {
  activeGroupId: PropTypes.string,
  activeGroupName: PropTypes.string,
  userId: PropTypes.string.isRequired,
  username: PropTypes.string,
  currentWallpaper: PropTypes.string,
};

export default GroupChat;
