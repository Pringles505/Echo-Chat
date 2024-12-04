import { jwtDecode } from 'jwt-decode';

import Chat from './Chat';
import Friends from './Friends';
import UserInfo from './UserInfo';

const Dashboard = () => {
    const token = localStorage.getItem('token');
    let username = '';
    let userId = '';

    if (token) {
        const decodedToken = jwtDecode(token);
        username = decodedToken.username;
        userId = decodedToken.id;
    }

    return (
        <div className="dashboard-container">
            {/* Sidebar with Friends */}
            <nav className="dashboard-nav">
                <h2>Friends</h2>
                <Friends token={token}/>
            </nav>

            {/* Main Content Area with Chat */}
            <div className="dashboard-content">
                <Chat token = {token}/>
            </div>

            <div className="user-info">
                <UserInfo username = {username} userId = {userId}/>
            </div>
        </div>
    );
};

export default Dashboard;
