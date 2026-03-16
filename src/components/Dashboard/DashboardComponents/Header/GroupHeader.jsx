import { useCallback, useEffect, useMemo, useState } from "react";
import PropTypes from "prop-types";
import { MoreHorizontal, Plus, Search, X } from "lucide-react";
import { getSocket } from "../../../../socket";
import { formatProfileImage } from "../utils/helpers";

import {
  loadGroupState,
  saveGroupState,
  buildAddCommit,
  buildRemoveCommit
} from "../../Chat/utils/crypto/groupCryptoProvider";

import { getIdentityKeys } from '../../Chat/utils/chat/keyManagement';

const GroupHeader = ({ groupId, groupName, userId }) => {
  const socket = useMemo(() => getSocket(), []);
  const [members, setMembers] = useState([]);
  const [role, setRole] = useState(null);
  const [menuOpen, setMenuOpen] = useState(false);
  const [membersOpen, setMembersOpen] = useState(false);

  const [searchTerm, setSearchTerm] = useState("");
  const [searchResult, setSearchResult] = useState(null);
  const [loading, setLoading] = useState(false);

  const [groupMeta, setGroupMeta] = useState({
    mlsEnabled: false,
    epoch: 0,
    cipherSuite: null,
  });

  const refresh = useCallback(() => {
    if (!groupId) return;
    socket.emit("openGroup", { groupId }, (res) => {
      if (!res?.success) return;
      setMembers(Array.isArray(res.members) ? res.members : []);
      setRole(res?.membership?.role ?? null);

      setGroupMeta({
        mlsEnabled: Boolean(res?.group?.mlsEnabled),
        epoch: Number.isInteger(res?.group?.epoch) ? res.group.epoch : 0,
        cipherSuite: res?.group?.cipherSuite ?? null,
      });
    });
  }, [groupId, socket]);

  const openGroupDetails = () =>
    new Promise((resolve, reject) => {
      if (!groupId) {
        reject(new Error("Missing groupId"));
        return;
      }

      socket.emit("openGroup", { groupId }, (res) => {
        if (!res?.success) {
          reject(new Error(res?.error || "Failed to open group"));
          return;
        }

        resolve(res);
      });
    });

  const emitWithAck = (eventName, payload, fallbackError) =>
    new Promise((resolve, reject) => {
      socket.emit(eventName, payload, (ack) => {
        if (!ack?.success) {
          reject(new Error(ack?.error || fallbackError));
          return;
        }
        resolve(ack);
      });
    });

  const toRoster = (groupMembers) => (Array.isArray(groupMembers) ? groupMembers : [])
    .map((m) => ({
      userId: String(m.userId),
      username: m.username ?? "",
      leafIndex: m.leafIndex,
    }))
    .filter((m) => m.userId && Number.isInteger(m.leafIndex))
    .sort((a, b) => a.leafIndex - b.leafIndex);

  useEffect(() => {
    refresh();
    setMenuOpen(false);
    setMembersOpen(false);
  }, [groupId, refresh]);

  useEffect(() => {
    const handleChanged = (evt) => {
      if (String(evt?.groupId ?? "") !== String(groupId)) return;
      refresh();
    };
    socket.on("groupMemberAdded", handleChanged);
    socket.on("groupMemberRemoved", handleChanged);
    return () => {
      socket.off("groupMemberAdded", handleChanged);
      socket.off("groupMemberRemoved", handleChanged);
    };
  }, [groupId, refresh, socket]);

  const memberCount = members.length;
  const subtitle = role === "admin" ? `Admin · ${memberCount} members` : `${memberCount} members`;

  const canAdd = role === "admin";

  const handleSearch = () => {
    const term = searchTerm.trim();
    if (!term) return;
    setLoading(true);
    setSearchResult(null);

    socket.emit("searchUser", { searchTerm: term }, (res) => {
      if (!res?.success || !res?.user) {
        setLoading(false);
        return;
      }
      const basic = res.user;
      socket.emit("getUserInfo", { userId: basic.id }, (infoRes) => {
        const profilePicture = infoRes?.success ? infoRes?.user?.profilePicture : null;
        const profileImage = formatProfileImage(profilePicture, basic.username);
        setSearchResult({ ...basic, profileImage });
        setLoading(false);
      });
    });
  };

  const handleAdd = async (memberId) => {
    if (!canAdd || !memberId) return;
    setLoading(true);

    try {
      await emitWithAck('addGroupMember', { groupId, memberId }, 'Failed to add group member');
      setSearchTerm('');
      setSearchResult(null);

      if (!groupMeta.mlsEnabled) {
        refresh();
        return;
      }

      // Load fresh roster and local state
      const groupRes = await openGroupDetails();
      const roster = toRoster(groupRes.members);
      const addedMember = roster.find((m) => String(m.userId) === String(memberId));
      if (!addedMember) throw new Error('Added member missing from refreshed group roster');

      const localState = await loadGroupState(groupId);
      if (!localState) throw new Error('Missing local MLS state for commit generation');

      // Fetch KeyPackages for ALL members in the new roster (including the new member)
      const memberInitKeys = await Promise.all(
        roster.map((m) =>
          new Promise((resolve) => {
            socket.emit('fetchKeyPackage', { userId: m.userId }, (res) => {
              if (res?.success && res.initKeyB64) {
                resolve({ userId: m.userId, leafIndex: m.leafIndex, initKeyB64: res.initKeyB64 });
              } else {
                // If a member has no KeyPackage, they can't receive the new key.
                // Log and skip — applyCommit will set their key to null.
                console.warn(`[GroupHeader] No KeyPackage for member ${m.userId}`);
                resolve(null);
              }
            });
          })
        )
      ).then((results) => results.filter(Boolean));

      const { commit, welcome, nextState } = await buildAddCommit({
        state: localState,
        newMember: addedMember,
        memberInitKeys,       // <-- pass the fetched init keys
      });

      await emitWithAck('sendGroupCommit', { groupId, commit }, 'Failed to send group commit');
      await emitWithAck('sendGroupWelcome', { groupId, recipientUserId: addedMember.userId, welcome }, 'Failed to send group welcome');
          await saveGroupState(groupId, nextState);
      refresh();
    } catch (err) {
      console.error('[GroupHeader] Failed to add member:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleRemove = async (memberId) => {
    if (!memberId) return;
    setLoading(true);

    try {
      if (!groupMeta.mlsEnabled) {
        await emitWithAck(
          "removeGroupMember",
          { groupId, memberId },
          "Failed to remove group member"
        );
        refresh();
        return;
      }

      const localState = await loadGroupState(groupId);
      if (!localState) {
        throw new Error("Missing local MLS state for remove commit generation");
      }

      // Remaining members (excluding the one being removed) need the new epoch key
      const remainingMembers = members.filter((m) => String(m.userId) !== String(memberId));
      const memberInitKeys = await Promise.all(
        remainingMembers.map((m) =>
          new Promise((resolve) => {
            socket.emit('fetchKeyPackage', { userId: m.userId }, (res) => {
              if (res?.success && res.initKeyB64) {
                resolve({ userId: m.userId, leafIndex: m.leafIndex, initKeyB64: res.initKeyB64 });
              } else {
                console.warn(`[GroupHeader] No KeyPackage for member ${m.userId}`);
                resolve(null);
              }
            });
          })
        )
      ).then((results) => results.filter(Boolean));

      const { commit, nextState } = await buildRemoveCommit({
        state: localState,
        targetUserId: memberId,
        memberInitKeys,
      });

      const isSelfRemoval = String(memberId) === String(userId);

      if (isSelfRemoval) {
        await emitWithAck("sendGroupCommit", { groupId, commit }, "Failed to send group commit");
      }

      await emitWithAck(
        "removeGroupMember",
        { groupId, memberId },
        "Failed to remove group member"
      );

      if (!isSelfRemoval) {
        await emitWithAck("sendGroupCommit", { groupId, commit }, "Failed to send group commit");
      }

      await saveGroupState(groupId, nextState);
      refresh();
    } catch (err) {
      console.error("[GroupHeader] Failed to remove member:", err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="p-4 flex justify-between items-center transition-all border-b bg-black border-gray-800">
      <div className="flex items-center gap-4 min-w-0">
        <div className="w-12 h-12 rounded-full bg-gray-700 border-2 border-black flex items-center justify-center text-white font-semibold">
          {(groupName || "Group")
            .split(" ")
            .filter(Boolean)
            .slice(0, 2)
            .map((w) => w[0]?.toUpperCase())
            .join("") || "G"}
        </div>

        <div className="min-w-0">
          <h3 className="font-semibold text-white truncate">{groupName || "Group"}</h3>
          <p className="text-sm text-gray-400 truncate">{subtitle}</p>
        </div>
      </div>

      <div className="flex gap-4 relative">
        <button
          className="p-2 rounded-full hover:bg-gray-700 transition-colors"
          aria-label="Group options"
          onClick={() => setMenuOpen((o) => !o)}
        >
          <MoreHorizontal className="w-5 h-5 text-gray-400" />
        </button>

        {menuOpen && (
          <div className="absolute right-0 mt-12 w-56 bg-black border border-gray-700 rounded-lg shadow-lg z-50 overflow-hidden">
            <button
              className="w-full text-left px-4 py-2 hover:bg-gray-700 text-white"
              onClick={() => {
                setMenuOpen(false);
                setMembersOpen(true);
              }}
            >
              Members
            </button>
            <button
              className="w-full text-left px-4 py-2 hover:bg-gray-700 text-red-400"
              onClick={() => {
                setMenuOpen(false);
                handleRemove(String(userId));
              }}
            >
              Leave group
            </button>
          </div>
        )}
      </div>

      {membersOpen && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50">
          <div className="bg-gray-900 rounded-lg p-4 max-w-xl w-full mx-4 border border-gray-700">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-white">Members</h3>
              <button onClick={() => setMembersOpen(false)} className="text-gray-400 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>

            {canAdd && (
              <div className="space-y-2 mb-4">
                <div className="text-sm text-gray-300">Add member</div>
                <div className="flex gap-2">
                  <div className="relative w-full">
                    <input
                      type="text"
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      onKeyDown={(e) => e.key === "Enter" && handleSearch()}
                      placeholder="Search username..."
                      className="w-full p-3 pr-10 bg-gray-800 text-white rounded-lg border border-gray-700 focus:outline-none focus:ring-2 focus:ring-[#8e79f2]"
                    />
                    <button
                      className="absolute right-3 top-3 text-gray-400 hover:text-white"
                      onClick={handleSearch}
                      disabled={loading}
                    >
                      <Search className="h-5 w-5" />
                    </button>
                  </div>
                </div>

                {searchResult && (
                  <div className="flex items-center justify-between p-3 bg-gray-800 rounded-lg border border-gray-700">
                    <div className="flex items-center gap-3 min-w-0">
                      <img
                        src={searchResult.profileImage}
                        alt={searchResult.username}
                        className="w-9 h-9 rounded-full object-cover border-2 border-black"
                        onError={(e) => {
                          e.target.src = `https://ui-avatars.com/api/?name=${searchResult.username}&background=8e79f2&color=fff`;
                        }}
                      />
                      <div className="truncate text-white">{searchResult.username}</div>
                    </div>
                    <button
                      className="px-3 py-2 rounded-lg text-sm flex items-center gap-2 bg-indigo-700 text-white hover:bg-[#8e79f2]"
                      disabled={loading}
                      onClick={() => handleAdd(searchResult.id)}
                    >
                      <Plus className="w-4 h-4" />
                      Add
                    </button>
                  </div>
                )}
              </div>
            )}

            <div className="space-y-2 max-h-80 overflow-y-auto">
              {members.map((m) => {
                const isSelf = String(m.userId) === String(userId);
                const canKick = role === "admin" && !isSelf && m.role !== "admin";
                const canLeave = isSelf;
                return (
                  <div
                    key={m.userId}
                    className="flex items-center justify-between p-3 bg-gray-800 rounded-lg border border-gray-700"
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <img
                        src={
                          m.profilePicture
                            ? formatProfileImage(m.profilePicture, m.username || m.userId)
                            : `https://ui-avatars.com/api/?name=${m.username || m.userId}&background=8e79f2&color=fff`
                        }
                        alt={m.username || m.userId}
                        className="w-9 h-9 rounded-full object-cover border-2 border-black"
                      />
                      <div className="min-w-0">
                        <div className="text-white truncate">
                          {m.username || m.userId}{" "}
                          {m.role === "admin" && <span className="text-xs text-indigo-300">(admin)</span>}
                          {isSelf && <span className="text-xs text-gray-300"> (you)</span>}
                        </div>
                      </div>
                    </div>
                    {(canKick || canLeave) && (
                      <button
                        className="px-3 py-2 rounded-lg text-sm bg-red-700 text-white hover:bg-red-600"
                        disabled={loading}
                        onClick={() => handleRemove(m.userId)}
                      >
                        {isSelf ? "Leave" : "Remove"}
                      </button>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

GroupHeader.propTypes = {
  groupId: PropTypes.string,
  groupName: PropTypes.string,
  userId: PropTypes.string.isRequired,
};

export default GroupHeader;

