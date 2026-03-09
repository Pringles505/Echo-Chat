import { useEffect, useMemo, useRef, useState } from "react";
import PropTypes from "prop-types";
import { getSocket } from "../../../socket";
import DisplayText from "./MessageDisplay/displayText";
import GroupSendText from "./MessageInput/GroupSendText";

const GroupChat = ({ activeGroupId, activeGroupName, userId, username, currentWallpaper }) => {
  const socket = useMemo(() => getSocket(), []);
  const [messages, setMessages] = useState([]);
  const [members, setMembers] = useState([]);
  const [role, setRole] = useState(null);
  const isInitialLoadRef = useRef(true);
  const messagesEndRef = useRef(null);

  const toDisplayMessage = (m) => {
    const createdAt = m?.createdAt || m?.timestamp || new Date().toISOString();
    const id = m?._id || `${String(m?.groupId ?? activeGroupId)}:${String(m?.seq ?? createdAt)}`;
    const text = typeof m?.payload === "string" ? m.payload : typeof m?.text === "string" ? m.text : "";
    const fromUsername = m?.username || (String(m?.userId) === String(userId) ? username : "Member");

    return {
      _id: id,
      userId: String(m?.userId ?? ""),
      username: fromUsername,
      text,
      createdAt,
      seenStatus: true,
    };
  };

  useEffect(() => {
    if (!activeGroupId) return;
    let cancelled = false;

    setMessages([]);
    setMembers([]);
    setRole(null);
    isInitialLoadRef.current = true;

    socket.emit("openGroup", { groupId: activeGroupId }, (res) => {
      if (cancelled) return;
      if (!res?.success) return;
      setMembers(Array.isArray(res.members) ? res.members : []);
      setRole(res?.membership?.role ?? null);

      socket.emit("fetchGroupMessages", { groupId: activeGroupId, limit: 50 }, (msgRes) => {
        if (cancelled) return;
        if (!msgRes?.success || !Array.isArray(msgRes.messages)) return;
        setMessages(msgRes.messages.map(toDisplayMessage));
      });
    });

    const handleNewGroupMessage = (m) => {
      const gid = String(m?.groupId ?? "");
      if (gid !== String(activeGroupId)) return;
      setMessages((prev) => [...prev, toDisplayMessage(m)]);
    };

    const handleMembershipChanged = (evt) => {
      if (String(evt?.groupId ?? "") !== String(activeGroupId)) return;
      // Refresh members list from server (cheap + consistent)
      socket.emit("openGroup", { groupId: activeGroupId }, (res) => {
        if (cancelled) return;
        if (!res?.success) return;
        setMembers(Array.isArray(res.members) ? res.members : []);
        setRole(res?.membership?.role ?? null);
      });
    };

    socket.on("newGroupMessage", handleNewGroupMessage);
    socket.on("groupMemberAdded", handleMembershipChanged);
    socket.on("groupMemberRemoved", handleMembershipChanged);

    return () => {
      cancelled = true;
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

      <GroupSendText sendMessage={sendMessage} />
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
