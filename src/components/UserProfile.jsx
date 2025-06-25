import { useLocation, useNavigate, useParams } from 'react-router-dom';
import { useEffect, useState, useRef } from 'react';
import ParticlesBackground from './HomepageComponents/ParticlesBackground';
import WaveBackground from './HomepageComponents/WaveBackground';
import './styles/UserProfile.css';
import { getSocket } from '../socket';
import { jwtDecode } from 'jwt-decode';

const UserProfile = ({ user, onChangePassword }) => {
    const location = useLocation();
    const navigate = useNavigate();
    const params = useParams();
    const socket = getSocket();

    let userId =
        params.userId ||
        (location.state && location.state.userId) ||
        (user && user.id);

    let loggedInUserId = '';
    const token = localStorage.getItem('token');
    if (token) {
        try {
            const decoded = jwtDecode(token);
            loggedInUserId = decoded.id || decoded.userId || decoded._id;
        } catch {}
    }
    if (!userId && loggedInUserId) userId = loggedInUserId;

    const isOwnProfile = userId === loggedInUserId;

    const [loading, setLoading] = useState(true);
    const [currentUsername, setCurrentUsername] = useState('');
    const [aboutMe, setAboutMe] = useState('');
    const [profileImage, setProfileImage] = useState('');
    const [originalProfileImage, setOriginalProfileImage] = useState('');
    const [editingUsername, setEditingUsername] = useState(false);
    const [editingAbout, setEditingAbout] = useState(false);
    const [showPasswordChange, setShowPasswordChange] = useState(false);
    const [oldPassword, setOldPassword] = useState('');
    const [newPassword, setNewPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [passwordError, setPasswordError] = useState('');
    const [successMsg, setSuccessMsg] = useState('');
    const [showMoreAbout, setShowMoreAbout] = useState(false);
    const fileInputRef = useRef(null);
    const [copied, setCopied] = useState('');
    const [infoMsg, setInfoMsg] = useState('');
    const [showPassword, setShowPassword] = useState(false);
    const [showNewPassword, setShowNewPassword] = useState(false);
    const [showConfirmPassword, setShowConfirmPassword] = useState(false);

    const defaultAvatar = `https://ui-avatars.com/api/?name=${encodeURIComponent(currentUsername)}&background=random&color=fff&bold=true`;

    useEffect(() => {
        if (!userId) {
            navigate('/login');
            return;
        }
        setLoading(true);
        socket.emit('getUserInfo', { userId }, (response) => {
            if (response && response.success && response.user) {
                setCurrentUsername(response.user.username || '');
                setAboutMe(response.user.aboutme || '');
                setProfileImage(response.user.profilePicture || '');
                setOriginalProfileImage(response.user.profilePicture || '');
            }
            setLoading(false);
        });
    }, [userId, socket, navigate]);

    const handleCopy = (value, label) => {
        navigator.clipboard.writeText(value);
        setCopied(label);
        setTimeout(() => setCopied(''), 1200);
    };

    const handleSave = async () => {
        if (!isOwnProfile) return;
        if (showPasswordChange) {
            if (!oldPassword || !newPassword || !confirmPassword) {
                setPasswordError('Please fill all password fields.');
                setInfoMsg('');
                return;
            }
            if (newPassword !== confirmPassword) {
                setPasswordError('Passwords do not match.');
                setInfoMsg('');
                return;
            }
        }

        let dataToSend = { userId };
        if (editingUsername) dataToSend.username = currentUsername;
        if (editingAbout) dataToSend.aboutme = aboutMe;
        if (showPasswordChange && oldPassword && newPassword === confirmPassword) {
            dataToSend.oldPassword = oldPassword;
            dataToSend.newPassword = newPassword;
        }
        let isImageChanged = profileImage && profileImage !== originalProfileImage && profileImage !== defaultAvatar;
        if (isImageChanged) {
            dataToSend.profilePicture = profileImage;
        }

        if (Object.keys(dataToSend).length === 1 && !isImageChanged) {
            setSuccessMsg('');
            setPasswordError('');
            setInfoMsg('No changes to save.');
            setTimeout(() => setInfoMsg(''), 2000);
            return;
        }

        setSuccessMsg('');
        setPasswordError('');
        setInfoMsg('');
        setEditingUsername(false);
        setEditingAbout(false);
        setShowPasswordChange(false);
        socket.emit('updateUserInfo', dataToSend, (response) => {
            if (response && response.success) {
                setSuccessMsg('');
                setPasswordError('');
                setShowPasswordChange(false);
                setOldPassword('');
                setNewPassword('');
                setConfirmPassword('');
                setEditingUsername(false);
                setEditingAbout(false);
                setInfoMsg('Profile updated');
                setTimeout(() => setInfoMsg(''), 2000);
                if (response.user && response.user.profilePicture) localStorage.setItem(`profileImage-${userId}`, response.user.profilePicture);
                if (response.user && response.user.aboutme) localStorage.setItem(`aboutMe-${userId}`, response.user.aboutme);
            } else {
                setPasswordError((response && response.error) || 'Error updating profile');
                setInfoMsg('');
                setTimeout(() => setPasswordError(''), 2000);
            }
        });
    };

    const handleCancel = () => {
        setEditingUsername(false);
        setEditingAbout(false);
        setShowPasswordChange(false);
        setPasswordError('');
        setOldPassword('');
        setNewPassword('');
        setConfirmPassword('');
        setCurrentUsername('');
        setProfileImage(originalProfileImage);
        setAboutMe('');
    };

    const handleImageChange = (e) => {
        if (!isOwnProfile) return;
        const file = e.target.files[0];
        if (file) {
            const reader = new FileReader();
            reader.onload = (ev) => setProfileImage(ev.target.result);
            reader.readAsDataURL(file);
        }
    };

    const handleLogout = () => {
        localStorage.clear();
        sessionStorage.clear();
        navigate("/login", { replace: true });
    };

    const handleGoBack = () => {
        navigate(-1);
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center min-h-screen bg-[var(--color-background)]">
                <div className="text-white text-xl font-bold">Loading profile...</div>
            </div>
        );
    }

    return (
        <div className="relative min-h-screen overflow-hidden bg-[var(--color-background)]">
            <ParticlesBackground />
            <WaveBackground />
            <div className="absolute inset-0 flex items-center justify-center p-4">
                <div className="w-full max-w-xl bg-black/60 backdrop-blur-md rounded-xl p-8 border border-[var(--color-primary)]/30 shadow-xl relative z-10 overflow-y-auto max-h-[80vh]">
                    <div className="flex justify-between items-start mb-2">
                        <h2 className="text-2xl font-bold text-center mb-6 text-[var(--color-secondary)]">
                            User Profile
                        </h2>
                        {isOwnProfile && (
                            <button
                                className="px-4 py-2 bg-red-600 text-white rounded-lg font-bold transition hover:bg-red-700"
                                onClick={handleLogout}
                                type="button"
                            >
                                Log out
                            </button>
                        )}
                    </div>
                    <div className="flex flex-col gap-8 items-center w-full">
                        <div className="flex flex-col items-center">
                            <div className="relative">
                                <img
                                    src={
                                        profileImage
                                            ? profileImage.startsWith('/uploads/')
                                                ? `http://localhost:3001${profileImage}`
                                                : profileImage
                                            : defaultAvatar
                                    }
                                    alt="Profile"
                                    className="user-profile-picture"
                                />
                                {isOwnProfile && (
                                    <>
                                        <button
                                            className="user-profile-pencil-btn"
                                            type="button"
                                            onClick={() => fileInputRef.current.click()}
                                            disabled={editingUsername || editingAbout || showPasswordChange}
                                            title="Change Picture"
                                        >
                                            ✏️
                                        </button>
                                        <input
                                            type="file"
                                            accept="image/*"
                                            ref={fileInputRef}
                                            style={{ display: 'none' }}
                                            onChange={handleImageChange}
                                        />
                                    </>
                                )}
                            </div>
                        </div>
                        <div className="w-full max-w-md mx-auto">
                            {/* Username */}
                            <label className="block mb-6 w-full">
                                <span className="block text-white font-semibold mb-1">
                                    Username:
                                </span>
                                {isOwnProfile && editingUsername ? (
                                    <input
                                        className="user-profile-input user-profile-input-active"
                                        value={currentUsername}
                                        onChange={e => setCurrentUsername(e.target.value)}
                                        autoFocus
                                    />
                                ) : (
                                    <div className="flex items-center w-full">
                                        <input
                                            className="user-profile-input user-profile-input-readonly"
                                            type="text"
                                            value={currentUsername}
                                            readOnly
                                            tabIndex={-1}
                                            onDoubleClick={() => handleCopy(currentUsername, 'Username')}
                                            title="Double click to copy"
                                        />
                                        {isOwnProfile && !editingAbout && !editingUsername && !showPasswordChange && (
                                            <button
                                                className="ml-2 px-4 py-2 bg-[var(--color-primary)] text-white rounded-lg font-bold transition hover:bg-[var(--color-secondary)]"
                                                onClick={() => setEditingUsername(true)}
                                                type="button"
                                                disabled={editingAbout || showPasswordChange}
                                            >
                                                Edit
                                            </button>
                                        )}
                                    </div>
                                )}
                            </label>
                            {/* User ID */}
                            <label className="block mb-6 w-full">
                                <span className="block text-white font-semibold mb-1">
                                    User ID:
                                </span>
                                <input
                                    className="user-profile-input user-profile-input-readonly"
                                    type="text"
                                    value={userId}
                                    readOnly
                                    tabIndex={-1}
                                    onDoubleClick={() => handleCopy(userId, 'User ID')}
                                    title="Double click to copy"
                                />
                            </label>
                            {/* About me */}
                            <label className="block mb-6 w-full">
                                <span className="block text-white font-semibold mb-1">
                                    About me:
                                </span>
                                {isOwnProfile && editingAbout ? (
                                    <textarea
                                        className="user-profile-input user-profile-input-active"
                                        value={aboutMe}
                                        onChange={e => setAboutMe(e.target.value)}
                                        rows={3}
                                        autoFocus
                                        onInput={e => {
                                            e.target.style.height = 'auto';
                                            e.target.style.height = e.target.scrollHeight + 'px';
                                        }}
                                    />
                                ) : (
                                    <div className="flex items-center w-full">
                                        <input
                                            className="user-profile-input user-profile-input-readonly"
                                            style={{
                                                minHeight: 34,
                                                maxHeight: showMoreAbout ? 200 : 34,
                                                overflow: 'hidden',
                                                whiteSpace: showMoreAbout ? 'pre-wrap' : 'nowrap',
                                                textOverflow: showMoreAbout ? 'clip' : 'ellipsis',
                                                wordBreak: 'break-word',
                                                transition: 'max-height 0.2s'
                                            }}
                                            value={aboutMe}
                                            readOnly
                                            title="Description"
                                        />
                                        {!editingAbout && !editingUsername && !showPasswordChange && !showMoreAbout && aboutMe && aboutMe.length > 60 && (
                                            <button
                                                type="button"
                                                className="ml-2 px-2 py-1 bg-transparent text-[var(--color-primary)] underline rounded transition hover:text-[var(--color-secondary)]"
                                                onClick={() => setShowMoreAbout(true)}
                                            >
                                                ...más
                                            </button>
                                        )}
                                        {!editingAbout && !editingUsername && !showPasswordChange && showMoreAbout && aboutMe && aboutMe.length > 60 && (
                                            <button
                                                type="button"
                                                className="ml-2 px-2 py-1 bg-transparent text-[var(--color-primary)] underline rounded transition hover:text-[var(--color-secondary)]"
                                                onClick={() => setShowMoreAbout(false)}
                                            >
                                                menos
                                            </button>
                                        )}
                                        {isOwnProfile && !editingAbout && !editingUsername && !showPasswordChange && (
                                            <button
                                                className="ml-2 px-4 py-2 bg-[var(--color-primary)] text-white rounded-lg font-bold transition hover:bg-[var(--color-secondary)]"
                                                onClick={() => setEditingAbout(true)}
                                                type="button"
                                                disabled={editingUsername || showPasswordChange}
                                            >
                                                Edit
                                            </button>
                                        )}
                                    </div>
                                )}
                            </label>
                            {/* Password */}
                            <label className="block mb-6 w-full">
                                {isOwnProfile && !editingUsername && !editingAbout && !showPasswordChange && (
                                    <button
                                        className="inline-block px-4 py-2 bg-[var(--color-primary)] text-white rounded-lg font-bold transition hover:bg-[var(--color-secondary)] mt-2"
                                        onClick={() => setShowPasswordChange(true)}
                                        type="button"
                                        style={{width: 'auto'}}>
                                        Change Password
                                    </button>
                                )}
                                {isOwnProfile && showPasswordChange ? (
                                    <div>
                                        {/* Old password */}
                                        <div className="relative mb-3">
                                            <input
                                                className="w-full px-4 py-3 pr-10 bg-[var(--color-background)]/20 border border-[var(--color-primary)]/30 rounded-lg text-black placeholder-black/60 focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)] transition-all"
                                                type={showPassword ? "text" : "password"}
                                                placeholder="Current password"
                                                value={oldPassword}
                                                onChange={e => setOldPassword(e.target.value)}
                                                autoFocus
                                            />
                                            <button
                                                type="button"
                                                onClick={() => setShowPassword(!showPassword)}
                                                className="absolute top-1/2 right-3 transform -translate-y-1/2 text-black hover:text-[#514b96]"
                                                aria-label="Toggle current password visibility"
                                                tabIndex={-1}
                                            >
                                                <svg width="24" height="24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                                    <ellipse cx="12" cy="12" rx="8" ry="6" />
                                                    <circle cx="12" cy="12" r="2" />
                                                </svg>
                                            </button>
                                        </div>
                                        {/* New password */}
                                        <div className="relative mb-3">
                                            <input
                                                className="w-full px-4 py-3 pr-10 bg-[var(--color-background)]/20 border border-[var(--color-primary)]/30 rounded-lg text-black placeholder-black/60 focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)] transition-all"
                                                type={showNewPassword ? "text" : "password"}
                                                placeholder="New password"
                                                value={newPassword}
                                                onChange={e => setNewPassword(e.target.value)}
                                            />
                                            <button
                                                type="button"
                                                onClick={() => setShowNewPassword(!showNewPassword)}
                                                className="absolute top-1/2 right-3 transform -translate-y-1/2 text-black hover:text-[#514b96]"
                                                aria-label="Toggle new password visibility"
                                                tabIndex={-1}
                                            >
                                                <svg width="24" height="24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                                    <ellipse cx="12" cy="12" rx="8" ry="6" />
                                                    <circle cx="12" cy="12" r="2" />
                                                </svg>
                                            </button>
                                        </div>
                                        {/* Confirm new password */}
                                        <div className="relative">
                                            <input
                                                className="w-full px-4 py-3 pr-10 bg-[var(--color-background)]/20 border border-[var(--color-primary)]/30 rounded-lg text-black placeholder-black/60 focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)] transition-all"
                                                type={showConfirmPassword ? "text" : "password"}
                                                placeholder="Confirm new password"
                                                value={confirmPassword}
                                                onChange={e => setConfirmPassword(e.target.value)}
                                            />
                                            <button
                                                type="button"
                                                onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                                                className="absolute top-1/2 right-3 transform -translate-y-1/2 text-black hover:text-[#514b96]"
                                                aria-label="Toggle confirm password visibility"
                                                tabIndex={-1}
                                            >
                                                <svg width="24" height="24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                                    <ellipse cx="12" cy="12" rx="8" ry="6" />
                                                    <circle cx="12" cy="12" r="2" />
                                                </svg>
                                            </button>
                                        </div>
                                        {passwordError && <div className="user-profile-error">{passwordError}</div>}
                                    </div>
                                ) : null}
                            </label>
                        </div>
                    </div>
                    <div className="flex justify-between items-end mt-8 w-full max-w-md mx-auto">
                        {/* Only show "Go back" if not editing or changing password */}
                        <button
                            className="px-6 py-2 bg-[var(--color-primary)] text-white rounded-lg font-bold transition hover:bg-[var(--color-secondary)]"
                            onClick={handleGoBack}
                            type="button"
                        >
                            Go back
                        </button>
                        {isOwnProfile && (
                            <div className="flex gap-4">
                                {(editingUsername || editingAbout || showPasswordChange) ? (
                                    <button
                                        className="px-6 py-2 bg-red-600 text-white rounded-lg font-bold border border-red-700 transition hover:bg-red-700 hover:text-white"
                                        onClick={handleCancel}
                                        type="button"
                                    >
                                        Cancel
                                    </button>
                                ) : null}
                                <button
                                    className="px-6 py-2 bg-[var(--color-primary)] text-white rounded-lg font-bold transition hover:bg-[var(--color-secondary)]"
                                    onClick={handleSave}
                                    type="button"
                                >
                                    Save
                                </button>
                            </div>
                        )}
                    </div>
                    {infoMsg && (
                        <div className="user-profile-success" style={{ color: '#a0ffa0', marginTop: 8 }}>
                            {infoMsg}
                        </div>
                    )}
                    {successMsg && <div className="user-profile-success">{successMsg}</div>}
                    {copied && (
                        <div className="user-profile-success" style={{ color: '#a0ffa0' }}>
                            {copied} copied!
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default UserProfile;