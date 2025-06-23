import { MessageCircle, User, Users, LogOut } from "lucide-react";

const getConsistentColor = (username) => {
  const colors = ['FF5733', '33FF57', '3357FF', 'F033FF', 'FF33F0'];
  const index = username.length % colors.length;
  return colors[index];
};

const Sidebar = ({ 
  activeView, 
  handleViewChange, 
  handleProfileClick, 
  handleLogout, 
  profileImage, 
  username,
  unreadMessages 
}) => {
  const totalUnread = Object.values(unreadMessages).reduce((a, b) => a + b, 0);

  return (
    <div className="w-16 h-full bg-[#303030] flex flex-col items-center py-4 space-y-6 border-r border-gray-800">
      {/* Navegación principal */}
      <nav className="flex flex-col items-center space-y-6 flex-grow">
        {/* Botón de chats */}
        <button 
          className={`relative p-3 rounded-xl transition-all ${activeView === 'chats' ? 'bg-indigo-600 text-white' : 'text-gray-400 hover:bg-gray-700'}`}
          onClick={() => handleViewChange('chats')}
        >
          <MessageCircle className="w-5 h-5" />
          {totalUnread > 0 && (
            <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs font-bold rounded-full h-5 w-5 flex items-center justify-center">
              {totalUnread}
            </span>
          )}
        </button>

        {/* Botón de amigos */}
        <button 
          className={`p-3 rounded-xl transition-all ${activeView === 'friends' ? 'bg-indigo-600 text-white' : 'text-gray-400 hover:bg-gray-700'}`}
          onClick={() => handleViewChange('friends')}
        >
          <Users className="w-5 h-5" />
        </button>

        {/* Botón de perfil */}
        <button 
          className="p-3 rounded-xl text-gray-400 hover:bg-gray-700 transition-all"
          onClick={handleProfileClick}
        >
          <User className="w-5 h-5" />
        </button>
      </nav>

      {/* Sección inferior */}
      <div className="flex flex-col items-center space-y-6">
        {/* Botón de logout con hover rojo */}
        <button 
          className="p-3 rounded-xl text-gray-400 hover:bg-red-600 hover:text-white transition-all"
          onClick={handleLogout}
        >
          <LogOut className="w-5 h-5" />
        </button>

        {/* Avatar de usuario */}
        <div 
          className="relative w-10 h-10 rounded-full overflow-hidden border-2 border-indigo-500 cursor-pointer"
          onClick={handleProfileClick}
        >
          <img
            src={profileImage || `https://ui-avatars.com/api/?name=${username}&background=${getConsistentColor(username)}&color=fff`}
            alt="User Avatar"
            className="w-full h-full object-cover"
            onError={(e) => {
              e.target.src = `https://ui-avatars.com/api/?name=${username}&background=${getConsistentColor(username)}&color=fff`;
            }}
          />
        </div>
      </div>
    </div>
  );
};

export default Sidebar;