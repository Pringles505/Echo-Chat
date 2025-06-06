import { useLocation, Navigate } from 'react-router-dom';
import { useState, useRef, useEffect } from 'react';
import ParticlesBackground from './HomepageComponents/ParticlesBackground';
import WaveBackground from './HomepageComponents/WaveBackground';
import './styles/UserProfile.css';

const UserProfile = () => {
    const location = useLocation();
    const { username, userId, password = '', about = '', profilePic = '' } = location.state || {};

    const [currentUsername, setCurrentUsername] = useState(username);
    const [editingUsername, setEditingUsername] = useState(false);
    const [editingAbout, setEditingAbout] = useState(false);
    const [showPasswordChange, setShowPasswordChange] = useState(false);
    const [newPassword, setNewPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [passwordError, setPasswordError] = useState('');
    const [successMsg, setSuccessMsg] = useState('');
    const [showPassword, setShowPassword] = useState(false);
    const [showNewPassword, setShowNewPassword] = useState(false);
    const [showConfirmPassword, setShowConfirmPassword] = useState(false);

    const [aboutMe, setAboutMe] = useState('');
    const [profileImage, setProfileImage] = useState('');
    const [showMoreAbout, setShowMoreAbout] = useState(false);
    const fileInputRef = useRef(null);
    const [copied, setCopied] = useState('');

    const defaultAvatar = `https://ui-avatars.com/api/?name=${encodeURIComponent(username)}&background=random&color=fff&bold=true`;

    useEffect(() => {
        setProfileImage(localStorage.getItem(`profileImage-${userId}`) || profilePic || defaultAvatar);
        setAboutMe(localStorage.getItem(`aboutMe-${userId}`) ?? about);
    }, [userId, profilePic, about, defaultAvatar]);

    if (!username || !userId) return <Navigate to="/login" />;

    const handleCopy = (value, label) => {
        navigator.clipboard.writeText(value);
        setCopied(label);
        setTimeout(() => setCopied(''), 1200);
    };

    const handleActionButton = () => {
        if (showPasswordChange) {
            if (!newPassword || !confirmPassword) {
                setPasswordError('Please fill all fields.');
                return;
            }
            if (newPassword !== confirmPassword) {
                setPasswordError('Passwords do not match.');
                return;
            }
            setPasswordError('');
            setShowPasswordChange(false);
            setNewPassword('');
            setConfirmPassword('');
            setSuccessMsg('Password changed!');
            setTimeout(() => setSuccessMsg(''), 2000);
        } else {
            setEditingUsername(false);
            setEditingAbout(false);
            setSuccessMsg('Profile updated!');
            setTimeout(() => setSuccessMsg(''), 2000);
            if (profileImage) localStorage.setItem(`profileImage-${userId}`, profileImage);
            localStorage.setItem(`aboutMe-${userId}`, aboutMe);
        }
    };

    const handleCancel = () => {
        setEditingUsername(false);
        setEditingAbout(false);
        setShowPasswordChange(false);
        setPasswordError('');
        setNewPassword('');
        setConfirmPassword('');
        setCurrentUsername(username);
        setProfileImage(localStorage.getItem(`profileImage-${userId}`) || profilePic || defaultAvatar);
        setAboutMe(localStorage.getItem(`aboutMe-${userId}`) ?? about);
    };

    const handleImageChange = (e) => {
        const file = e.target.files[0];
        if (file) {
            const reader = new FileReader();
            reader.onload = (ev) => setProfileImage(ev.target.result);
            reader.readAsDataURL(file);
        }
    };

    return (
        <div className="relative min-h-screen overflow-hidden bg-[var(--color-background)]">
            <ParticlesBackground />
            <WaveBackground />
            <div className="absolute inset-0 flex items-center justify-center p-4">
                <div className="w-full max-w-xl bg-black/60 backdrop-blur-md rounded-xl p-8 border border-[var(--color-primary)]/30 shadow-xl relative z-10">
                    <h2 className="text-2xl font-bold text-center mb-6 text-[var(--color-secondary)]">
                        User Profile
                    </h2>
                    <div className="flex flex-col gap-8 items-center w-full">
                        <div className="flex flex-col items-center">
                            <div className="relative">
                                <img
                                    src={profileImage || '/echo-logo.svg'}
                                    alt="Profile"
                                    className="user-profile-picture"
                                />
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
                            </div>
                        </div>
                        <div className="w-full max-w-md mx-auto">
                            {/* Username */}
                            <label className="block mb-6 w-full">
                                <span className="block text-white font-semibold mb-1">
                                    Username:
                                </span>
                                {editingUsername ? (
                                    <input
                                        className="w-full px-4 py-3 bg-[var(--color-background)]/20 border border-[var(--color-primary)]/30 rounded-lg text-black placeholder-black/60 focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)] transition-all"
                                        value={currentUsername}
                                        onChange={e => setCurrentUsername(e.target.value)}
                                        autoFocus
                                    />
                                ) : (
                                    <div className="flex items-center w-full">
                                        <input
                                            className="w-full px-4 py-3 bg-[var(--color-background)]/20 border border-[var(--color-primary)]/30 rounded-lg text-black placeholder-black/60 focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)] transition-all"
                                            type="text"
                                            value={currentUsername}
                                            readOnly
                                            tabIndex={-1}
                                            onDoubleClick={() => handleCopy(currentUsername, 'Username')}
                                            title="Double click to copy"
                                        />
                                        {!editingAbout && !editingUsername && !showPasswordChange && (
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
                                    className="w-full px-4 py-3 bg-[var(--color-background)]/20 border border-[var(--color-primary)]/30 rounded-lg text-black placeholder-black/60 focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)] transition-all"
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
                                {editingAbout ? (
                                    <textarea
                                        className="w-full px-4 py-3 bg-[var(--color-background)]/20 border border-[var(--color-primary)]/30 rounded-lg text-black placeholder-black/60 focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)] transition-all resize-none"
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
                                            className="w-full px-4 py-3 bg-[var(--color-background)]/20 border border-[var(--color-primary)]/30 rounded-lg text-black font-medium transition-all"
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
                                        {!editingAbout && !editingUsername && !showPasswordChange && (
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
                                {showPasswordChange ? (
                                    <div>
                                        {/* Current password */}
                                        <div className="relative mb-3">
                                            <input
                                                className="w-full px-4 py-3 pr-10 bg-[var(--color-background)]/20 border border-[var(--color-primary)]/30 rounded-lg text-black placeholder-black/60 focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)] transition-all"
                                                type={showPassword ? "text" : "password"}
                                                placeholder="Current password"
                                                value={password}
                                                onChange={e => setNewPassword(e.target.value)}
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
                                ) : (
                                    <button
                                        className="px-4 py-2 bg-[var(--color-primary)] text-white rounded-lg font-bold transition hover:bg-[var(--color-secondary)] mt-2"
                                        onClick={() => setShowPasswordChange(true)}
                                        type="button"
                                    >
                                        Change Password
                                    </button>
                                )}
                            </label>
                        </div>
                    </div>
                    <div className="flex justify-end gap-4 mt-8 w-full max-w-md mx-auto">
                        <button
                            className="px-6 py-2 bg-[var(--color-primary)] text-white rounded-lg font-bold transition hover:bg-[var(--color-secondary)]"
                            onClick={handleActionButton}
                            type="button"
                        >
                            Save
                        </button>
                        <button
                            className="px-6 py-2 bg-red-600 text-white rounded-lg font-bold border border-red-700 transition hover:bg-red-700 hover:text-white"
                            onClick={handleCancel}
                            type="button"
                        >
                            Cancel
                        </button>
                    </div>
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