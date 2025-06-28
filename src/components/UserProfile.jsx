import { useLocation, useNavigate, useParams } from 'react-router-dom';
import { useEffect, useState, useRef } from 'react';
import ParticlesBackground from './HomepageComponents/ParticlesBackground';
import WaveBackground from './HomepageComponents/WaveBackground';
import './styles/UserProfile.css';
import { getSocket } from '../socket';
import { jwtDecode } from 'jwt-decode';
import { Pencil } from "lucide-react";
import Toast from './Toast';

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
        } catch { }
    }
    if (!userId && loggedInUserId) userId = loggedInUserId;

    const isOwnProfile = userId === loggedInUserId;

    // State
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
    const [showMoreAbout, setShowMoreAbout] = useState(false);
    const fileInputRef = useRef(null);
    const [showPassword, setShowPassword] = useState(false);
    const [showNewPassword, setShowNewPassword] = useState(false);
    const [showConfirmPassword, setShowConfirmPassword] = useState(false);
    const [popupMsg, setPopupMsg] = useState('');
    const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

    const defaultAvatar = `https://ui-avatars.com/api/?name=${encodeURIComponent(currentUsername)}&background=random&color=fff&bold=true`;

    useEffect(() => {
        if (!userId) return;
        const cachedProfile = localStorage.getItem(`profile-${userId}`);
        if (cachedProfile) {
            try {
                const parsed = JSON.parse(cachedProfile);
                setCurrentUsername(parsed.username || '');
                setAboutMe(parsed.aboutme || '');
                setProfileImage(parsed.profilePicture || '');
                setOriginalProfileImage(parsed.profilePicture || '');
                setLoading(false);
            } catch { }
        }
    }, [userId]);

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
                localStorage.setItem(
                    `profile-${userId}`,
                    JSON.stringify({
                        username: response.user.username || '',
                        aboutme: response.user.aboutme || '',
                        profilePicture: response.user.profilePicture || ''
                    })
                );
            }
            setLoading(false);
        });
    }, [userId, socket, navigate]);

    const handleCopy = (value, label) => {
        navigator.clipboard.writeText(value);
        setPopupMsg(`${label} copied!`);
        setTimeout(() => setPopupMsg(''), 1200);
    };

    const handleSave = async () => {
        if (!isOwnProfile) return;
        if (showPasswordChange) {
            if (!oldPassword || !newPassword || !confirmPassword) {
                setPasswordError('Please fill all password fields.');
                return;
            }
            if (newPassword !== confirmPassword) {
                setPasswordError('Passwords do not match.');
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

        // Show info toast if nothing changed
        if (Object.keys(dataToSend).length === 1 && !isImageChanged) {
            setPopupMsg('No changes to be made');
            setTimeout(() => setPopupMsg(''), 2000);
            return;
        }

        setPasswordError('');
        setEditingUsername(false);
        setEditingAbout(false);
        setShowPasswordChange(false);
        socket.emit('updateUserInfo', dataToSend, (response) => {
            if (response && response.success) {
                setShowPasswordChange(false);
                setOldPassword('');
                setNewPassword('');
                setConfirmPassword('');
                setEditingUsername(false);
                setEditingAbout(false);
                setPopupMsg('Changes saved successfully');
                setTimeout(() => setPopupMsg(''), 2000);
                localStorage.setItem(
                    `profile-${userId}`,
                    JSON.stringify({
                        username: response.user.username || '',
                        aboutme: response.user.aboutme || '',
                        profilePicture: response.user.profilePicture || ''
                    })
                );
            } else {
                // If username is taken, reset the input to the original value and show warning
                if (response && response.error === "Username already taken") {
                    setCurrentUsername(prev => {
                        // Use the value from localStorage or previous state
                        const cachedProfile = localStorage.getItem(`profile-${userId}`);
                        if (cachedProfile) {
                            try {
                                const parsed = JSON.parse(cachedProfile);
                                return parsed.username || prev;
                            } catch {
                                return prev;
                            }
                        }
                        return prev;
                    });
                    setPopupMsg("Username already taken");
                    setTimeout(() => setPopupMsg(''), 2000);
                } else {
                    setPasswordError((response && response.error) || 'Error updating profile');
                    setTimeout(() => setPasswordError(''), 2000);
                }
            }
        });
    };

    // Restore original values on cancel
    const handleCancel = () => {
        setEditingUsername(false);
        setEditingAbout(false);
        setShowPasswordChange(false);
        setPasswordError('');
        setOldPassword('');
        setNewPassword('');
        setConfirmPassword('');
        setCurrentUsername(currentUsername);
        setProfileImage(originalProfileImage);
        setAboutMe(aboutMe);
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

    const handleDeleteAccount = () => {
        console.log("Attempting to delete account for userId:", userId);
        socket.emit('deleteAccount', { userId }, (response) => {
            console.log("Delete account response:", response);
            if (response && response.success) {
                setPopupMsg("Account deleted successfully");
                setTimeout(() => {
                    localStorage.clear();
                    sessionStorage.clear();
                    navigate("/login", { replace: true });
                }, 1500);
            } else {
                setPopupMsg((response && response.error) || "Error deleting account");
                setTimeout(() => setPopupMsg(''), 2000);
            }
        });
    };

    if (loading) {
        return (
            <div className="user-profile-loading-bg">
                <ParticlesBackground />
                <WaveBackground />
                <div className="user-profile-loading-container">
                    <div className="user-profile-spinner"></div>
                    <div className="user-profile-loading-text">Loading profile...</div>
                </div>
            </div>
        );
    }

    return (
        <div className="relative min-h-screen overflow-hidden bg-black">
            <ParticlesBackground />
            <WaveBackground />
            <Toast
                message={popupMsg}
                type={
                    popupMsg.toLowerCase().includes("no changes")
                        ? "info"
                        : popupMsg.toLowerCase().includes("saved") ||
                            popupMsg.toLowerCase().includes("copied") ||
                            popupMsg.toLowerCase().includes("deleted")
                            ? "success"
                            : "warning"
                }
                onClose={() => setPopupMsg("")}
            />
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
                                            <Pencil size={20} color="#514b96" />
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
                                            onDoubleClick={
                                                !editingUsername && !editingAbout && !showPasswordChange
                                                    ? () => handleCopy(currentUsername, 'Username')
                                                    : undefined
                                            }
                                            title={
                                                !editingUsername && !editingAbout && !showPasswordChange
                                                    ? "Double click to copy"
                                                    : ""
                                            }
                                            style={{
                                                cursor:
                                                    !editingUsername && !editingAbout && !showPasswordChange
                                                        ? "copy"
                                                        : "not-allowed",
                                                background: "#e5e7eb"
                                            }}
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
                                    onDoubleClick={
                                        !editingUsername && !editingAbout && !showPasswordChange
                                            ? () => handleCopy(userId, 'User ID')
                                            : undefined
                                    }
                                    title={
                                        !editingUsername && !editingAbout && !showPasswordChange
                                            ? "Double click to copy"
                                            : ""
                                    }
                                    style={{
                                        cursor:
                                            !editingUsername && !editingAbout && !showPasswordChange
                                                ? "copy"
                                                : "not-allowed",
                                        background: "#e5e7eb"
                                    }}
                                />
                            </label>
                            {/* About me */}
                                <label className="block mb-6 w-full">
                                <span className="block text-white font-semibold mb-1">
                                    About me:
                                </span>
                                {isOwnProfile && editingAbout ? (
                                    <textarea
                                    className="w-full px-4 py-2 bg-white text-black rounded-lg border border-gray-300 focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)] transition-all"
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
                                    <div className="flex items-start w-full">
                                    <div className="flex-1">
                                        <div
                                        className="user-profile-input user-profile-input-readonly"
                                        style={{
                                            minHeight: '40px',
                                            wordBreak: 'break-word'
                                        }}
                                        >
                                        {aboutMe || <span className="text-gray-500 italic">No description yet</span>}
                                        </div>
                                    </div>
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
                                        style={{ width: 'auto' }}>
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
                    {isOwnProfile && (
                        <div className="mt-4">
                            <button
                                className="w-full px-4 py-2 bg-red-600 text-white rounded-lg font-bold transition hover:bg-red-700"
                                onClick={() => setShowDeleteConfirm(true)}
                                type="button"
                            >
                                Delete Account
                            </button>
                            {showDeleteConfirm && (
                                <div className="mt-4 p-4 bg-red-500/10 border border-red-500 rounded-lg">
                                    <p className="text-red-500 font-semibold mb-2">
                                        Are you sure you want to delete your account?
                                    </p>
                                    <div className="flex gap-2">
                                        <button
                                            className="flex-1 px-4 py-2 bg-red-600 text-white rounded-lg font-bold transition hover:bg-red-700"
                                            onClick={() => {
                                                setShowDeleteConfirm(false);
                                                handleDeleteAccount();
                                            }}
                                            type="button"
                                        >
                                            Yes, delete it
                                        </button>
                                        <button
                                            className="flex-1 px-4 py-2 bg-gray-700 text-white rounded-lg font-bold transition hover:bg-gray-800"
                                            onClick={() => setShowDeleteConfirm(false)}
                                            type="button"
                                        >
                                            Cancel
                                        </button>
                                    </div>
                                </div>
                            )}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default UserProfile;