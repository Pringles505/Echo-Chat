import { useCallback, useMemo, useRef, useState } from "react";
import PropTypes from "prop-types";
import { X, Plus, Search } from "lucide-react";
import { getSocket } from "../../../socket";
import { formatProfileImage } from "../DashboardComponents/utils/helpers";

const CreateGroupModal = ({ open, onClose, onCreated, userId }) => {
  const [name, setName] = useState("");
  const [searchTerm, setSearchTerm] = useState("");
  const [results, setResults] = useState([]);
  const [selected, setSelected] = useState([]);
  const [loading, setLoading] = useState(false);
  const socketRef = useRef(null);

  const socket = useMemo(() => {
    if (!socketRef.current) socketRef.current = getSocket();
    return socketRef.current;
  }, []);

  const isSelected = (id) => selected.some((u) => String(u.id) === String(id));

  const addSelected = (user) => {
    if (!user?.id) return;
    if (String(user.id) === String(userId)) return;
    setSelected((prev) => (isSelected(user.id) ? prev : [...prev, user]));
  };

  const removeSelected = (id) => {
    setSelected((prev) => prev.filter((u) => String(u.id) !== String(id)));
  };

  const handleSearch = useCallback(() => {
    const term = searchTerm.trim();
    if (!term) return;
    setLoading(true);

    socket.emit("searchUser", { searchTerm: term }, (response) => {
      if (!response?.success || !response?.user) {
        setLoading(false);
        return;
      }

      const basicUser = response.user;
      socket.emit("getUserInfo", { userId: basicUser.id }, (profileResponse) => {
        const profilePicture = profileResponse?.success ? profileResponse?.user?.profilePicture : null;
        const formattedProfileImage = formatProfileImage(profilePicture, basicUser.username);
        const u = { ...basicUser, profileImage: formattedProfileImage };

        setResults((prev) => {
          const exists = prev.some((x) => String(x.id) === String(u.id));
          if (exists) return prev;
          return [...prev, u];
        });
        setLoading(false);
      });
    });
  }, [searchTerm, socket]);

  const handleCreate = async () => {
    const groupName = name.trim();
    if (!groupName) return;
    const memberIds = selected.map((u) => u.id).filter(Boolean);
    if (memberIds.length === 0) return;

    setLoading(true);
    socket.emit("createGroup", { name: groupName, memberIds }, (ack) => {
      setLoading(false);
      if (!ack?.success) return;
      onCreated?.(ack.group);
      setName("");
      setSearchTerm("");
      setResults([]);
      setSelected([]);
      onClose?.();
    });
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50">
      <div className="bg-gray-900 rounded-lg p-4 max-w-xl w-full mx-4 border border-gray-700">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-white">Create a group</h3>
          <button onClick={onClose} className="text-gray-400 hover:text-white">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="space-y-3">
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Group name"
            className="w-full p-3 bg-gray-800 text-white rounded-lg border border-gray-700 focus:outline-none focus:ring-2 focus:ring-[#8e79f2]"
          />

          <div className="flex gap-2">
            <div className="relative w-full">
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleSearch()}
                placeholder="Search username to add..."
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

          {selected.length > 0 && (
            <div className="bg-gray-800/60 border border-gray-700 rounded-lg p-3">
              <div className="text-sm text-gray-300 mb-2">Members</div>
              <div className="flex flex-wrap gap-2">
                {selected.map((u) => (
                  <button
                    key={u.id}
                    onClick={() => removeSelected(u.id)}
                    className="px-2 py-1 bg-gray-700 text-white rounded-full text-xs hover:bg-gray-600"
                    title="Remove"
                  >
                    {u.username} <span className="text-gray-300">×</span>
                  </button>
                ))}
              </div>
            </div>
          )}

          <div className="grid grid-cols-1 gap-2 max-h-56 overflow-y-auto">
            {results.map((u) => (
              <div
                key={u.id}
                className="flex items-center justify-between p-3 bg-gray-800 rounded-lg border border-gray-700"
              >
                <div className="flex items-center gap-3 min-w-0">
                  <img
                    src={u.profileImage}
                    alt={u.username}
                    className="w-9 h-9 rounded-full object-cover border-2 border-black"
                    onError={(e) => {
                      e.target.src = `https://ui-avatars.com/api/?name=${u.username}&background=8e79f2&color=fff`;
                    }}
                  />
                  <div className="truncate text-white">{u.username}</div>
                </div>
                <button
                  className={`px-3 py-2 rounded-lg text-sm flex items-center gap-2 ${
                    isSelected(u.id) ? "bg-gray-700 text-gray-300 cursor-not-allowed" : "bg-indigo-700 text-white hover:bg-[#8e79f2]"
                  }`}
                  disabled={isSelected(u.id) || loading || String(u.id) === String(userId)}
                  onClick={() => addSelected(u)}
                >
                  <Plus className="w-4 h-4" />
                  Add
                </button>
              </div>
            ))}
          </div>

          <button
            onClick={handleCreate}
            disabled={loading || !name.trim() || selected.length === 0}
            className={`w-full p-3 rounded-lg font-semibold ${
              loading || !name.trim() || selected.length === 0
                ? "bg-gray-700 text-gray-400 cursor-not-allowed"
                : "bg-indigo-700 text-white hover:bg-[#8e79f2]"
            }`}
          >
            {loading ? "Creating..." : "Create group"}
          </button>
        </div>
      </div>
    </div>
  );
};

CreateGroupModal.propTypes = {
  open: PropTypes.bool.isRequired,
  onClose: PropTypes.func.isRequired,
  onCreated: PropTypes.func,
  userId: PropTypes.string,
};

export default CreateGroupModal;

