import { useLocation, Navigate } from "react-router-dom";
import { useState, useRef, useEffect } from "react";
import "./styles/UserProfile.css";

const UserProfile = () => {
  const location = useLocation();
  const {
    username,
    userId,
    password = "",
    about = "",
    profilePic = "",
  } = location.state || {};

  // All hooks must be called before any early return
  const [currentUsername, setCurrentUsername] = useState(username);
  const [editingUsername, setEditingUsername] = useState(false);
  const [editingAbout, setEditingAbout] = useState(false);
  const [showPasswordChange, setShowPasswordChange] = useState(false);
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [passwordError, setPasswordError] = useState("");
  const [successMsg, setSuccessMsg] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const [aboutMe, setAboutMe] = useState("");
  const [profileImage, setProfileImage] = useState("");
  const fileInputRef = useRef(null);

  // For clipboard feedback
  const [copied, setCopied] = useState("");

  // Load profile image and about me from localStorage on mount
  useEffect(() => {
    const storedImage = localStorage.getItem(`profileImage-${userId}`);
    setProfileImage(storedImage || profilePic || "");
    const storedAbout = localStorage.getItem(`aboutMe-${userId}`);
    setAboutMe(storedAbout !== null ? storedAbout : about);
  }, [userId, profilePic, about]);

  if (!username || !userId) {
    return <Navigate to="/login" />;
  }

  // Clipboard copy logic
  const handleCopy = (value, label) => {
    navigator.clipboard.writeText(value);
    setCopied(label);
    setTimeout(() => setCopied(""), 1200);
  };

  const handleActionButton = () => {
    if (showPasswordChange) {
      if (!newPassword || !confirmPassword) {
        setPasswordError("Please fill both fields.");
        return;
      }
      if (newPassword !== confirmPassword) {
        setPasswordError("Passwords do not match.");
        return;
      }
      setPasswordError("");
      setShowPasswordChange(false);
      setNewPassword("");
      setConfirmPassword("");
      setSuccessMsg("Password changed!");
      setTimeout(() => setSuccessMsg(""), 2000);
    } else {
      setEditingUsername(false);
      setEditingAbout(false);
      setSuccessMsg("Profile updated!");
      setTimeout(() => setSuccessMsg(""), 2000);
      // Save profile image and about me to localStorage
      if (profileImage) {
        localStorage.setItem(`profileImage-${userId}`, profileImage);
      }
      localStorage.setItem(`aboutMe-${userId}`, aboutMe);
    }
  };

  const handleCancel = () => {
    setEditingUsername(false);
    setEditingAbout(false);
    setShowPasswordChange(false);
    setPasswordError("");
    setNewPassword("");
    setConfirmPassword("");
    setCurrentUsername(username);
    // Restore aboutMe and profileImage from localStorage or initial
    const storedImage = localStorage.getItem(`profileImage-${userId}`);
    setProfileImage(storedImage || profilePic || "");
    const storedAbout = localStorage.getItem(`aboutMe-${userId}`);
    setAboutMe(storedAbout !== null ? storedAbout : about);
  };

  // Handle profile image upload
  const handleImageChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (ev) => {
        setProfileImage(ev.target.result);
      };
      reader.readAsDataURL(file);
    }
  };

  return (
    <div className="user-profile-container">
      <h2>User Profile</h2>
      <div className="user-profile-details user-profile-details-flex">
        <div className="user-profile-picture-side">
          <div className="user-profile-picture-wrapper">
            <img
              src={profileImage || "/echo-logo.svg"}
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
              style={{ display: "none" }}
              onChange={handleImageChange}
            />
          </div>
        </div>
        <div className="user-profile-main-fields">
          <label className="user-profile-label-row">
            <span>Username:</span>
            {editingUsername ? (
              <input
                className="user-profile-input"
                value={currentUsername}
                onChange={(e) => setCurrentUsername(e.target.value)}
                autoFocus
              />
            ) : (
              <>
                <span
                  className="user-profile-value"
                  style={{ cursor: "pointer" }}
                  onDoubleClick={() => handleCopy(currentUsername, "Username")}
                  title="Double click to copy"
                >
                  {currentUsername}
                </span>
                {!editingAbout && !editingUsername && !showPasswordChange && (
                  <button
                    className="user-profile-action-btn"
                    onClick={() => setEditingUsername(true)}
                    type="button"
                    disabled={editingAbout || showPasswordChange}
                  >
                    Edit
                  </button>
                )}
              </>
            )}
          </label>
          <label>
            User ID:
            <span
              className="user-profile-value"
              style={{ cursor: "pointer" }}
              onDoubleClick={() => handleCopy(userId, "User ID")}
              title="Double click to copy"
            >
              {userId}
            </span>
          </label>
          <label className="user-profile-label-row">
            <span>About me:</span>
            {editingAbout ? (
              <textarea
                className="user-profile-input"
                value={aboutMe}
                onChange={(e) => setAboutMe(e.target.value)}
                rows={3}
                autoFocus
              />
            ) : (
              <>
                <span
                  className="user-profile-value"
                  style={{ cursor: "pointer" }}
                >
                  {aboutMe || ""}
                </span>
                {!editingAbout && !editingUsername && !showPasswordChange && (
                  <button
                    className="user-profile-action-btn"
                    onClick={() => setEditingAbout(true)}
                    type="button"
                    disabled={editingUsername || showPasswordChange}
                  >
                    Edit
                  </button>
                )}
              </>
            )}
          </label>
          <label>
            Password:
            {showPasswordChange ? (
              <div className="user-profile-password-fields">
                <div style={{ position: "relative" }}>
                  <input
                    className="user-profile-input"
                    type={showNewPassword ? "text" : "password"}
                    placeholder="New password"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                  />
                  <button
                    type="button"
                    className="user-profile-eye-btn"
                    tabIndex={-1}
                    onMouseDown={() => setShowNewPassword(true)}
                    onMouseUp={() => setShowNewPassword(false)}
                    onMouseLeave={() => setShowNewPassword(false)}
                    onTouchStart={() => setShowNewPassword(true)}
                    onTouchEnd={() => setShowNewPassword(false)}
                    aria-label="Show new password"
                  >
                    {showPassword ? (
                      <svg
                        xmlns="http://www.w3.org/2000/svg"
                        className="h-5 w-5"
                        fill="none"
                        viewBox="0 0 24 24"
                        stroke="currentColor"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M3 3l18 18"
                        />
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M10.477 10.477a3 3 0 104.046 4.046"
                        />
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M12 5c4.477 0 8.268 2.943 9.542 7-1.18 3.753-4.614 6.518-8.665 6.902"
                        />
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M6.343 6.343A9.957 9.957 0 003 12c1.274 4.057 5.065 7 9.542 7"
                        />
                      </svg>
                    ) : (
                      <svg
                        xmlns="http://www.w3.org/2000/svg"
                        className="h-5 w-5"
                        fill="none"
                        viewBox="0 0 24 24"
                        stroke="currentColor"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
                        />
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M2.458 12C3.732 7.943 7.523 5 12 5c4.477 0 8.268 2.943 9.542 7-1.274 4.057-5.065 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"
                        />
                      </svg>
                    )}
                  </button>
                </div>
                <div style={{ position: "relative" }}>
                  <input
                    className="user-profile-input"
                    type={showConfirmPassword ? "text" : "password"}
                    placeholder="Confirm new password"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                  />
                  <button
                    type="button"
                    className="user-profile-eye-btn"
                    tabIndex={-1}
                    onMouseDown={() => setShowConfirmPassword(true)}
                    onMouseUp={() => setShowConfirmPassword(false)}
                    onMouseLeave={() => setShowConfirmPassword(false)}
                    onTouchStart={() => setShowConfirmPassword(true)}
                    onTouchEnd={() => setShowConfirmPassword(false)}
                    aria-label="Show confirm password"
                  >
                    {showPassword ? (
                      <svg
                        xmlns="http://www.w3.org/2000/svg"
                        className="h-5 w-5"
                        fill="none"
                        viewBox="0 0 24 24"
                        stroke="currentColor"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M3 3l18 18"
                        />
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M10.477 10.477a3 3 0 104.046 4.046"
                        />
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M12 5c4.477 0 8.268 2.943 9.542 7-1.18 3.753-4.614 6.518-8.665 6.902"
                        />
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M6.343 6.343A9.957 9.957 0 003 12c1.274 4.057 5.065 7 9.542 7"
                        />
                      </svg>
                    ) : (
                      <svg
                        xmlns="http://www.w3.org/2000/svg"
                        className="h-5 w-5"
                        fill="none"
                        viewBox="0 0 24 24"
                        stroke="currentColor"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
                        />
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M2.458 12C3.732 7.943 7.523 5 12 5c4.477 0 8.268 2.943 9.542 7-1.274 4.057-5.065 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"
                        />
                      </svg>
                    )}
                  </button>
                </div>
                {passwordError && (
                  <div className="user-profile-error">{passwordError}</div>
                )}
              </div>
            ) : (
              <span
                className="user-profile-value"
                style={{ position: "relative" }}
              >
                {showPassword ? password || "password" : "••••••••"}
                <button
                  type="button"
                  className="user-profile-eye-btn"
                  tabIndex={-1}
                  onMouseDown={() => setShowPassword(true)}
                  onMouseUp={() => setShowPassword(false)}
                  onMouseLeave={() => setShowPassword(false)}
                  onTouchStart={() => setShowPassword(true)}
                  onTouchEnd={() => setShowPassword(false)}
                  aria-label="Show password"
                  disabled={editingUsername || editingAbout}
                >
                  {showPassword ? (
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      className="h-5 w-5"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M3 3l18 18"
                      />
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M10.477 10.477a3 3 0 104.046 4.046"
                      />
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M12 5c4.477 0 8.268 2.943 9.542 7-1.18 3.753-4.614 6.518-8.665 6.902"
                      />
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M6.343 6.343A9.957 9.957 0 003 12c1.274 4.057 5.065 7 9.542 7"
                      />
                    </svg>
                  ) : (
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      className="h-5 w-5"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
                      />
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M2.458 12C3.732 7.943 7.523 5 12 5c4.477 0 8.268 2.943 9.542 7-1.274 4.057-5.065 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"
                      />
                    </svg>
                  )}
                </button>
                {!editingUsername && !editingAbout && (
                  <button
                    className="user-profile-action-btn"
                    onClick={() => setShowPasswordChange(true)}
                    type="button"
                  >
                    Change Password
                  </button>
                )}
              </span>
            )}
          </label>
        </div>
      </div>
      <div className="user-profile-actions-bottom">
        <button
          className="user-profile-action-btn"
          onClick={handleActionButton}
          type="button"
        >
          Save
        </button>
        <button
          className="user-profile-action-btn cancel"
          onClick={handleCancel}
          type="button"
        >
          Cancel
        </button>
      </div>
      {successMsg && <div className="user-profile-success">{successMsg}</div>}
      {copied && (
        <div className="user-profile-success" style={{ color: "#a0ffa0" }}>
          {copied} copied!
        </div>
      )}
    </div>
  );
};

export default UserProfile;
