import { useState, useEffect, useCallback } from "react";
import io from "socket.io-client";
import PropTypes from "prop-types";
import { jwtDecode } from "jwt-decode";
import { formatProfileImage } from "../DashboardComponents/utils/helpers";
import {Users} from "lucide-react";

const Friends = ({ token, onActiveChatChange, searchTerm }) => {
  const [chatList, setSearchList] = useState([]);
  const [notifications, setNotifications] = useState([]);
  const [friends, setFriends] = useState([]);
  const [isLoadingFriends, setIsLoadingFriends] = useState(true);

  useEffect(() => {
    const socket = io(import.meta.env.VITE_SOCKET_URL, {
      auth: { token },
    });

    socket.on("connect", () => {
      console.log("Socket connected");

      if (token) {
        const user = jwtDecode(token);
        socket.emit("getFriendsList", { userId: user.id }, (response) => {
          if (response && response.success) {
            const formattedFriends = response.friends.map((friend) => ({
              ...friend,
              profileImage: formatProfileImage(
                friend.profilePicture,
                friend.username
              ),
            }));
            setFriends(formattedFriends);
          }
          setIsLoadingFriends(false);
        });
      }
    });

    socket.on("notification", (notification) => {
      const formattedProfileImage = formatProfileImage(
        notification.messageData.profileImage,
        notification.messageData.username
      );

      setNotifications((prevNotifications) => [
        ...prevNotifications,
        {
          ...notification,
          messageData: {
            ...notification.messageData,
            profileImage: formattedProfileImage,
          },
        },
      ]);
    });

    socket.on("disconnect", () => {
      console.log("Socket disconnected");
    });

    return () => {
      socket.disconnect();
    };
  }, [token]);

  const handleSearch = useCallback(() => {
    const user = token ? jwtDecode(token) : "";
    const tempSocket = io(import.meta.env.VITE_SOCKET_URL);

    tempSocket.on("connect", () => {
      console.log("TempSocket connected");
    });

    if (!searchTerm || searchTerm === user.username) {
      tempSocket.disconnect();
      return;
    }

    tempSocket.emit("searchUser", { searchTerm }, (response) => {
      if (response && response.user) {
        const basicUser = response.user;

        tempSocket.emit(
          "getUserInfo",
          { userId: basicUser.id },
          (profileResponse) => {
            let profilePicture = basicUser.profileImage;

            if (
              profileResponse &&
              profileResponse.success &&
              profileResponse.user
            ) {
              profilePicture = profileResponse.user.profilePicture;
            }

            const formattedProfileImage = formatProfileImage(
              profilePicture,
              basicUser.username
            );

            const targetUser = {
              ...basicUser,
              profileImage: formattedProfileImage,
            };

            setSearchList((prevChatList) => {
              // Evitar duplicados
              const userExists = prevChatList.some(
                (user) => user.id === targetUser.id
              );
              return userExists ? prevChatList : [...prevChatList, targetUser];
            });

            tempSocket.disconnect();
          }
        );
      } else {
        tempSocket.disconnect();
      }
    });
  }, [searchTerm, token]);

  useEffect(() => {
    if (searchTerm && searchTerm.trim() !== "") {
      handleSearch();
    } else {
      setSearchList([]);
    }
  }, [searchTerm, handleSearch]);

  return (
    <div className="flex flex-col h-full">
      {/* Sección superior (búsqueda y notificaciones) - Scrollable */}
      <div className="overflow-y-auto flex-1">
        <ul className="divide-y divide-gray-700">
          {/* Resultados de búsqueda */}
          {chatList.map((targetUser, index) => (
            <li
              key={`search-${index}`}
              onClick={() =>
                onActiveChatChange({
                  id: targetUser.id,
                  username: targetUser.username,
                  profileImage: targetUser.profileImage,
                })
              }
              className="p-3 hover:bg-[#8e79f2]/20 cursor-pointer transition-colors duration-200 group"
            >
              <div className="flex items-center space-x-3">
                <div className="relative">
                  <img
                    src={targetUser.profileImage}
                    alt={targetUser.username}
                    className="w-10 h-10 rounded-full object-cover border-2 border-black"
                    onError={(e) => {
                      e.target.src = `https://ui-avatars.com/api/?name=${targetUser.username}&background=8e79f2&color=fff`;
                    }}
                  />
                </div>
                <div>
                  <p className="text-white font-medium group-hover:text-white">
                    {targetUser.username}
                  </p>
                </div>
              </div>
            </li>
          ))}

          {/* Notificaciones */}
          {notifications.map((notification, index) => (
            <li
              key={`notification-${index}`}
              onClick={() =>
                onActiveChatChange({
                  id: notification.messageData.id,
                  username: notification.messageData.username,
                  profileImage: notification.messageData.profileImage,
                })
              }
              className="p-3 hover:bg-[#8e79f2]/30 cursor-pointer transition-colors duration-200 group"
            >
              <div className="flex items-center space-x-3">
                <div className="relative">
                  <img
                    src={notification.messageData.profileImage}
                    alt={notification.messageData.username}
                    className="w-10 h-10 rounded-full object-cover border-2 border-black"
                    onError={(e) => {
                      e.target.src = `https://ui-avatars.com/api/?name=${notification.messageData.username}&background=8e79f2&color=fff`;
                    }}
                  />
                  <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs rounded-full h-5 w-5 flex items-center justify-center">
                    !
                  </span>
                </div>
                <div className="flex-1">
                  <p className="text-white font-medium group-hover:text-white">
                    {notification.messageData.username}
                  </p>
                  <p className="text-sm text-gray-300 truncate group-hover:text-white">
                    {notification.message}
                  </p>
                </div>
              </div>
            </li>
          ))}
        </ul>
      </div>

      <div className="h-1/2 flex flex-col">
        <div className="flex items-center px-3 py-2 text-gray-400 sticky top-0 bg-[#1e1e1e] z-10">
          <Users size={18} className="mr-2" /> 
          <span className="text-sm font-medium">Friends</span>
        </div>
        <div className="overflow-y-auto flex-1">
          {!isLoadingFriends ? (
            friends.length > 0 ? (
              <ul className="divide-y divide-gray-700">
                {friends.map((friend, index) => (
                  <li
                    key={`friend-${index}`}
                    onClick={() =>
                      onActiveChatChange({
                        id: friend.id,
                        username: friend.username,
                        profileImage: friend.profileImage,
                      })
                    }
                    className="p-3 hover:bg-[#8e79f2]/20 cursor-pointer transition-colors duration-200 group"
                  >
                    <div className="flex items-center space-x-3">
                      <div className="relative">
                        <img
                          src={friend.profileImage}
                          alt={friend.username}
                          className="w-10 h-10 rounded-full object-cover border-2 border-black"
                          onError={(e) => {
                            e.target.src = `https://ui-avatars.com/api/?name=${friend.username}&background=8e79f2&color=fff`;
                          }}
                        />
                      </div>
                      <div>
                        <p className="text-white font-medium group-hover:text-white">
                          {friend.username}
                        </p>
                      </div>
                    </div>
                  </li>
                ))}
              </ul>
            ) : (
              <div className="px-3 py-4 text-sm text-gray-400 text-center">
                You don't have any friends added
              </div>
            )
          ) : (
            <div className="px-3 py-4 text-sm text-gray-400 text-center">
              Loading friends...
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

Friends.propTypes = {
  token: PropTypes.string.isRequired,
  onActiveChatChange: PropTypes.func.isRequired,
  searchTerm: PropTypes.string,
};

export default Friends;
