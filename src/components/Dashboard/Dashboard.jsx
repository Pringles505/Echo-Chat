import Chat from './Chat';
import Friends from './Friends';

const Dashboard = () => {
    return (
        <div className="dashboard-container">
            {/* Sidebar with Friends */}
            <nav className="dashboard-nav">
                <h2>Friends</h2>
                <Friends />
            </nav>

            {/* Main Content Area with Chat */}
            <div className="dashboard-content">
                <Chat />
            </div>
        </div>
    );
};

export default Dashboard;
