import { useNavigate, useParams, useLocation } from "react-router-dom";
import { useEffect, useRef, useState } from "react";
import firebase from 'firebase/compat/app';
import 'firebase/compat/firestore';
import { getSocket } from '../../socket';

// Firebase config
const firebaseConfig = {
  apiKey: "AIzaSyC3dqQgY1dEE4F2Cdb6zv0rQRcC91CxZVo",
  authDomain: "webrtc-app-a0607.firebaseapp.com",
  projectId: "webrtc-app-a0607",
  storageBucket: "webrtc-app-a0607.firebasestorage.app",
  messagingSenderId: "429607886523",
  appId: "1:429607886523:web:df9c41d3e8c69cf746939e",
  measurementId: "G-WSBW8BK3P4"
};

if (!firebase.apps.length) {
  firebase.initializeApp(firebaseConfig);
}
const firestore = firebase.firestore();

const servers = {
  iceServers: [
    {
      urls: ['stun:stun1.l.google.com:19302', 'stun:stun2.l.google.com:19302'],
    },
  ],
  iceCandidatePoolSize: 10,
};

const VideoCall = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { odebukiUserId } = useParams();
  const localVideoRef = useRef(null);
  const remoteVideoRef = useRef(null);
  const pcRef = useRef(null);
  const localStreamRef = useRef(null);
  const remoteStreamRef = useRef(null);

  const [isMuted, setIsMuted] = useState(false);
  const [isCameraOff, setIsCameraOff] = useState(false);
  const [callId, setCallId] = useState('');
  const [isInCall, setIsInCall] = useState(false);
  const [callStatus, setCallStatus] = useState('idle');
  const [hasAudioPermission, setHasAudioPermission] = useState(true);
  const [hasVideoPermission, setHasVideoPermission] = useState(true);
  const [remoteVideoEnabled, setRemoteVideoEnabled] = useState(true);
  const [localUserProfile, setLocalUserProfile] = useState(null);
  const [remoteUserProfile, setRemoteUserProfile] = useState(null);

  const hasStartedCallRef = useRef(false);

  // Check if we're answering a call (came from notification)
  const isAnswering = location.state?.callId;
  const callerName = location.state?.callerName;

  // Fetch user profiles
  useEffect(() => {
    const fetchProfiles = () => {
      const socket = getSocket();
      const username = localStorage.getItem('username');
      const userId = localStorage.getItem('userId');

      // Get local user profile from localStorage using the correct key pattern
      const storedProfile = localStorage.getItem(`profile-${userId}`);
      if (storedProfile) {
        try {
          const profile = JSON.parse(storedProfile);
          setLocalUserProfile({
            username: profile.username || username,
            profileImage: profile.profilePicture || profile.profileImage || null
          });
          console.log('👤 Local user profile loaded from localStorage:', {
            username: profile.username,
            rawProfilePicture: profile.profilePicture,
            hasProfileImage: !!(profile.profilePicture || profile.profileImage)
          });
        } catch (e) {
          console.error('Error parsing stored profile:', e);
        }
      } else {
        // Fallback to just username
        setLocalUserProfile({
          username: username || 'You',
          profileImage: null
        });
        console.log('👤 Local user profile from username (no cached profile):', username);
      }

      // Fetch remote user profile via socket - ALWAYS prefer fresh data from server
      socket.emit('fetchUsername', odebukiUserId, (response) => {
        console.log('📡 fetchUsername response:', response);
        if (response) {
          // Backend might send profilePicture or profileImage
          let profilePic = response.profilePicture || response.profileImage || null;

          // If socket doesn't return profile picture, check localStorage as fallback
          if (!profilePic) {
            console.log('⚠️ No profile picture in socket response, checking localStorage...');
            const cachedProfile = localStorage.getItem(`profile-${odebukiUserId}`);
            if (cachedProfile) {
              try {
                const parsed = JSON.parse(cachedProfile);
                profilePic = parsed.profilePicture || parsed.profileImage || null;
                console.log('📦 Found profile picture in localStorage cache:', !!profilePic);
              } catch (e) {
                console.error('Error parsing cached profile:', e);
              }
            }
          }

          setRemoteUserProfile({
            username: response.username || 'User',
            profileImage: profilePic
          });

          // Update localStorage cache with data from server (keep cached pic if server doesn't have one)
          localStorage.setItem(`profile-${odebukiUserId}`, JSON.stringify({
            username: response.username,
            profilePicture: profilePic
          }));

          console.log('👤 Remote user profile set:', {
            username: response.username,
            rawProfilePicture: response.profilePicture,
            rawProfileImage: response.profileImage,
            finalProfileImage: profilePic,
            hasProfileImage: !!profilePic,
            profileImagePreview: profilePic?.substring(0, 50) + '...'
          });
        } else {
          console.error('❌ fetchUsername returned no response');
        }
      });
    };

    fetchProfiles();
  }, [odebukiUserId]);

  // Listen for profile updates (both local and remote users)
  useEffect(() => {
    const socket = getSocket();

    // Handle local user profile updates
    const handleLocalProfileUpdate = () => {
      const username = localStorage.getItem('username');
      const userId = localStorage.getItem('userId');
      const storedProfile = localStorage.getItem(`profile-${userId}`);

      if (storedProfile) {
        try {
          const profile = JSON.parse(storedProfile);
          setLocalUserProfile({
            username: profile.username || username,
            profileImage: profile.profilePicture || profile.profileImage || null
          });
          console.log('🔄 Local profile updated in video call:', {
            username: profile.username,
            rawProfilePicture: profile.profilePicture,
            hasProfileImage: !!(profile.profilePicture || profile.profileImage)
          });
        } catch (e) {
          console.error('Error updating local profile:', e);
        }
      }
    };

    // Handle remote user profile updates via socket
    const handleRemoteProfileUpdate = (data) => {
      console.log('👤 Remote user profile update received in VideoCall:', data);
      const { userId: updatedUserId, username, profilePicture } = data;

      // Check if this is the remote user we're calling
      if (updatedUserId === odebukiUserId) {
        console.log('🔄 Updating remote user profile in video call');
        setRemoteUserProfile({
          username: username || 'User',
          profileImage: profilePicture || null
        });

        // Also update localStorage cache
        const cachedProfile = localStorage.getItem(`profile-${updatedUserId}`);
        if (cachedProfile) {
          try {
            const parsed = JSON.parse(cachedProfile);
            localStorage.setItem(`profile-${updatedUserId}`, JSON.stringify({
              ...parsed,
              username: username || parsed.username,
              profilePicture: profilePicture
            }));
          } catch (e) {
            console.error('Error updating cached profile:', e);
          }
        }
      }
    };

    window.addEventListener('profileUpdated', handleLocalProfileUpdate);
    socket.on('userProfileUpdated', handleRemoteProfileUpdate);

    return () => {
      window.removeEventListener('profileUpdated', handleLocalProfileUpdate);
      socket.off('userProfileUpdated', handleRemoteProfileUpdate);
    };
  }, [odebukiUserId]);

  // Debug logging for state changes
  useEffect(() => {
    console.log('🔍 VideoCall State changed:', {
      isCameraOff,
      hasVideoPermission,
      hasLocalProfile: !!localUserProfile,
      localUsername: localUserProfile?.username,
      hasRemoteProfile: !!remoteUserProfile,
      remoteUsername: remoteUserProfile?.username,
      remoteProfileImage: remoteUserProfile?.profileImage,
      shouldShowProfilePic: isCameraOff || !hasVideoPermission,
      callStatus,
      remoteVideoEnabled
    });
  }, [isCameraOff, hasVideoPermission, localUserProfile, remoteUserProfile, callStatus, remoteVideoEnabled]);

  useEffect(() => {
    const socket = getSocket();

    // Initialize peer connection
    pcRef.current = new RTCPeerConnection(servers);
    remoteStreamRef.current = new MediaStream();

    const startCamera = async () => {
      if (hasStartedCallRef.current) {
        console.log('[VideoCall] startCamera already ran, skipping');
        return;
      }
      hasStartedCallRef.current = true;

      try {
        // Try to get both video and audio
        let mediaStream;
        try {
          mediaStream = await navigator.mediaDevices.getUserMedia({
            video: true,
            audio: true
          });
          setHasAudioPermission(true);
          setHasVideoPermission(true);
        } catch (error) {
          console.log('Could not get both video and audio, trying individually...', error);

          // Try video only
          let videoStream = null;
          try {
            videoStream = await navigator.mediaDevices.getUserMedia({ video: true });
            setHasVideoPermission(true);
          } catch (videoError) {
            console.log('Video permission denied', videoError);
            setHasVideoPermission(false);
            setIsCameraOff(true);
          }

          // Try audio only
          let audioStream = null;
          try {
            audioStream = await navigator.mediaDevices.getUserMedia({ audio: true });
            setHasAudioPermission(true);
          } catch (audioError) {
            console.log('Audio permission denied', audioError);
            setHasAudioPermission(false);
            setIsMuted(true);
          }

          // Combine streams
          mediaStream = new MediaStream();
          if (videoStream) {
            videoStream.getTracks().forEach(track => mediaStream.addTrack(track));
          }
          if (audioStream) {
            audioStream.getTracks().forEach(track => mediaStream.addTrack(track));
          }

          // If neither permission granted, throw error
          if (!videoStream && !audioStream) {
            throw new Error('No media permissions granted');
          }
        }

        localStreamRef.current = mediaStream;

        if (localVideoRef.current) {
          localVideoRef.current.srcObject = mediaStream;
          console.log('📹 Local video stream set:', {
            hasVideo: mediaStream.getVideoTracks().length > 0,
            hasAudio: mediaStream.getAudioTracks().length > 0,
            videoEnabled: mediaStream.getVideoTracks()[0]?.enabled,
            audioEnabled: mediaStream.getAudioTracks()[0]?.enabled
          });
        }

        // Push tracks from local stream to peer connection
        mediaStream.getTracks().forEach((track) => {
          pcRef.current.addTrack(track, mediaStream);
        });

        // Pull tracks from remote stream, add to video stream
        pcRef.current.ontrack = (event) => {
          event.streams[0].getTracks().forEach((track) => {
            remoteStreamRef.current.addTrack(track);

            // Listen for track enabled/disabled events
            track.onended = () => {
              console.log('Remote track ended:', track.kind);
            };

            // Monitor remote video track state
            if (track.kind === 'video') {
              track.onmute = () => setRemoteVideoEnabled(false);
              track.onunmute = () => setRemoteVideoEnabled(true);
            }
          });
        };

        if (remoteVideoRef.current) {
          remoteVideoRef.current.srcObject = remoteStreamRef.current;
        }

        // If answering a call, automatically answer
        if (isAnswering) {
          setCallId(location.state.callId);
          setTimeout(() => {
            handleAnswerCall(location.state.callId);
            socket.emit('acceptCall', { callId: location.state.callId });

          }, 500);
        } else {
          // If initiating a call, create offer and notify the target user
          handleCreateCall();
        }
      } catch (error) {
        console.error("Error accessing camera/microphone:", error);
        alert("Could not access camera or microphone. The call will start without media.");
        // Continue with call even without permissions
        if (isAnswering) {
          setCallId(location.state.callId);
          setTimeout(() => {
            handleAnswerCall(location.state.callId);
            socket.emit('acceptCall', { callId: location.state.callId });
          }, 500);
        } else {
          handleCreateCall();
        }
      }
    };

    // Wait for socket to connect then start camera
    const initCall = () => {
      console.log('Socket connected, initializing call...');
      startCamera();
    };

    if (socket.connected) {
      initCall();
    } else {
      socket.on('connect', initCall);
    }

    // Helper to stop all media
    const stopMedia = () => {
      // Stop all tracks
      if (localStreamRef.current) {
        localStreamRef.current.getTracks().forEach(track => {
          track.stop();
          console.log(`Cleanup stopped track: ${track.kind}`);
        });
        localStreamRef.current = null;
      }
      // Clear video element sources
      if (localVideoRef.current) {
        localVideoRef.current.srcObject = null;
      }
      if (remoteVideoRef.current) {
        remoteVideoRef.current.srcObject = null;
      }
      if (remoteStreamRef.current) {
        remoteStreamRef.current = null;
      }
      // Close peer connection
      if (pcRef.current) {
        pcRef.current.close();
        pcRef.current = null;
      }
    };

    // Listen for call declined
    socket.on('callDeclined', () => {
      alert('Call was declined');
      socket.emit('declineCall', { callerId, callId });
      stopMedia();
      navigate(-1);
    });

    // Listen for call ended by other user
    socket.on('callEnded', () => {
      console.log('Other user ended the call');
      stopMedia();
      navigate(-1);
    });

    // Listen for remote video state changes
    socket.on('videoStateChanged', ({ isEnabled }) => {
      console.log('Remote video state changed:', isEnabled);
      setRemoteVideoEnabled(isEnabled);
    });

    // Listen for remote audio state changes (optional, for future UI indicators)
    socket.on('audioStateChanged', ({ isEnabled }) => {
      console.log('Remote audio state changed:', isEnabled);
      // Could add a state variable to show muted indicator on remote user
    });

    return () => {
      stopMedia();
      socket.off('connect', initCall);
      socket.off('callDeclined');
      socket.off('callEnded');
      socket.off('videoStateChanged');
      socket.off('audioStateChanged');
    };
  }, [navigate]);

  // Create a call (caller)
  const handleCreateCall = async () => {
    if (!pcRef.current || !localStreamRef.current) return;

    const socket = getSocket();
    const callDoc = firestore.collection('calls').doc();
    const offerCandidates = callDoc.collection('offerCandidates');
    const answerCandidates = callDoc.collection('answerCandidates');

    setCallId(callDoc.id);
    setCallStatus('calling');

    // Get candidates for caller, save to db
    pcRef.current.onicecandidate = (event) => {
      event.candidate && offerCandidates.add(event.candidate.toJSON());
    };

    // Create offer
    const offerDescription = await pcRef.current.createOffer();
    await pcRef.current.setLocalDescription(offerDescription);

    const offer = {
      sdp: offerDescription.sdp,
      type: offerDescription.type,
    };

    await callDoc.set({ offer });

    // Send call notification to target user via socket
    const callerId = localStorage.getItem('userId');
    // Try to get username from token if not in localStorage
    let callerName = localStorage.getItem('username');
    if (!callerName) {
      try {
        const token = localStorage.getItem('token');
        if (token) {
          const payload = JSON.parse(atob(token.split('.')[1]));
          callerName = payload.username;
        }
      } catch (e) {
        console.error('Error parsing token for username:', e);
      }
    }
    callerName = callerName || 'Someone';

    console.log('Emitting initiateCall:', {
      targetUserId: odebukiUserId,
      callId: callDoc.id,
      callerId,
      callerName
    });

    socket.emit('initiateCall', {
      targetUserId: odebukiUserId,
      callId: callDoc.id,
      callerId,
      callerName
    });

    // Listen for remote answer
    callDoc.onSnapshot((snapshot) => {
      const data = snapshot.data();
      if (!pcRef.current.currentRemoteDescription && data?.answer) {
        const answerDescription = new RTCSessionDescription(data.answer);
        pcRef.current.setRemoteDescription(answerDescription);
        setCallStatus('connected');
      }
    });

    // When answered, add candidate to peer connection
    answerCandidates.onSnapshot((snapshot) => {
      snapshot.docChanges().forEach((change) => {
        if (change.type === 'added') {
          const candidate = new RTCIceCandidate(change.doc.data());
          pcRef.current.addIceCandidate(candidate);
        }
      });
    });

    setIsInCall(true);
  };

  // Answer a call (callee)
  const handleAnswerCall = async (incomingCallId) => {
    const callIdToUse = incomingCallId || callId;
    if (!callIdToUse || !pcRef.current) return;

    const callDoc = firestore.collection('calls').doc(callIdToUse);
    const answerCandidates = callDoc.collection('answerCandidates');
    const offerCandidates = callDoc.collection('offerCandidates');

    pcRef.current.onicecandidate = (event) => {
      event.candidate && answerCandidates.add(event.candidate.toJSON());
    };

    const callData = (await callDoc.get()).data();

    if (!callData) {
      alert("Call not found!");
      return;
    }

    const offerDescription = callData.offer;
    await pcRef.current.setRemoteDescription(new RTCSessionDescription(offerDescription));

    const answerDescription = await pcRef.current.createAnswer();
    await pcRef.current.setLocalDescription(answerDescription);

    const answer = {
      type: answerDescription.type,
      sdp: answerDescription.sdp,
    };

    await callDoc.update({ answer });

    offerCandidates.onSnapshot((snapshot) => {
      snapshot.docChanges().forEach((change) => {
        if (change.type === 'added') {
          let data = change.doc.data();
          pcRef.current.addIceCandidate(new RTCIceCandidate(data));
        }
      });
    });

    setIsInCall(true);
    setCallStatus('connected');
  };

  const handleEndCall = () => {
    const socket = getSocket();

    // Notify the other user
    socket.emit('endCall', { odebukiUserId, callId });
    
    // Stop all media tracks (camera and microphone)
    if (localStreamRef.current) {
      localStreamRef.current.getTracks().forEach(track => {
        track.stop();
        console.log(`Stopped track: ${track.kind}`);
      });
      localStreamRef.current = null;
      
    }

    // Clear video element sources
    if (localVideoRef.current) {
      localVideoRef.current.srcObject = null;
    }
    if (remoteVideoRef.current) {
      remoteVideoRef.current.srcObject = null;
    }
    if (remoteStreamRef.current) {
      remoteStreamRef.current = null;
    }

    // Close peer connection
    if (pcRef.current) {
      pcRef.current.close();
      pcRef.current = null;
    }

    navigate(-1);
  };

  const toggleMute = () => {
    if (localStreamRef.current) {
      const audioTracks = localStreamRef.current.getAudioTracks();
      if (audioTracks.length > 0) {
        const newMutedState = !isMuted;
        audioTracks.forEach(track => {
          track.enabled = !newMutedState;
        });
        setIsMuted(newMutedState);

        console.log('🔊 Audio toggled:', {
          muted: newMutedState,
          trackEnabled: audioTracks[0].enabled
        });

        // Notify remote user about audio state change
        const socket = getSocket();
        socket.emit('audioStateChanged', {
          targetUserId: odebukiUserId,
          isEnabled: !newMutedState
        });
      }
    }
  };

  const toggleCamera = () => {
    if (localStreamRef.current) {
      const videoTracks = localStreamRef.current.getVideoTracks();
      if (videoTracks.length > 0) {
        const newCameraOffState = !isCameraOff;
        videoTracks.forEach(track => {
          track.enabled = !newCameraOffState;
        });
        setIsCameraOff(newCameraOffState);

        console.log('📹 Camera toggled:', {
          cameraOff: newCameraOffState,
          trackEnabled: videoTracks[0].enabled,
          hasVideoPermission,
          localUserProfile: localUserProfile?.username
        });

        // Notify remote user about video state change
        const socket = getSocket();
        socket.emit('videoStateChanged', {
          targetUserId: odebukiUserId,
          isEnabled: !newCameraOffState
        });
      } else {
        console.log('⚠️ No video tracks available to toggle');
      }
    }
  };

  // Helper function for consistent avatar colors
  const getConsistentColor = (username) => {
    const colors = ['FF5733', '33FF57', '3357FF', 'F033FF', 'FF33F0'];
    return colors[username.length % colors.length];
  };

  // Get profile image with fallback
  const getProfileImage = (profile) => {
    if (!profile) {
      console.log('⚠️ getProfileImage: No profile provided');
      return null;
    }

    // Check if profile has a custom image (not empty string, null, or undefined)
    const hasCustomImage = profile.profileImage && profile.profileImage.trim().length > 0;

    let imageUrl;
    if (hasCustomImage) {
      // If the path starts with /, prepend the backend URL
      imageUrl = profile.profileImage.startsWith('/')
        ? `http://localhost:3001${profile.profileImage}`
        : profile.profileImage;
    } else {
      // Fallback to UI Avatars
      imageUrl = `https://ui-avatars.com/api/?name=${profile.username}&background=${getConsistentColor(profile.username)}&color=fff`;
    }

    console.log('🖼️ getProfileImage called:', {
      username: profile.username,
      rawProfileImage: profile.profileImage,
      profileImageType: typeof profile.profileImage,
      profileImageLength: profile.profileImage?.length,
      hasCustomImage,
      willUseBackendUrl: profile.profileImage?.startsWith('/'),
      finalImageUrl: imageUrl?.substring(0, 80) + (imageUrl?.length > 80 ? '...' : '')
    });
    return imageUrl;
  };

  return (
    <div className="h-screen bg-black flex flex-col">
      {/* Video area */}
      <div className="flex-1 relative flex items-center justify-center">
        {/* Remote video */}
        <div className="w-full h-full bg-gray-900 flex items-center justify-center relative">
          <video
            ref={remoteVideoRef}
            autoPlay
            playsInline
            className={`w-full h-full object-cover ${!remoteVideoEnabled && callStatus === 'connected' ? 'hidden' : ''}`}
          />
          {callStatus !== 'connected' && (
            <div className="absolute inset-0 flex flex-col items-center justify-center">
              {remoteUserProfile ? (
                <>
                  <img
                    src={getProfileImage(remoteUserProfile)}
                    alt={remoteUserProfile.username}
                    className="w-48 h-48 rounded-full object-cover mb-4"
                    onError={(e) => {
                      e.target.src = `https://ui-avatars.com/api/?name=${remoteUserProfile.username}&background=${getConsistentColor(remoteUserProfile.username)}&color=fff`;
                    }}
                  />
                  <p className="text-white text-xl">{remoteUserProfile.username}</p>
                </>
              ) : (
                <i className="fa-solid fa-user text-gray-600 text-9xl"></i>
              )}
            </div>
          )}
          {callStatus === 'connected' && !remoteVideoEnabled && (
            <div className="absolute inset-0 flex flex-col items-center justify-center bg-gray-900">
              {remoteUserProfile ? (
                <>
                  <img
                    src={getProfileImage(remoteUserProfile)}
                    alt={remoteUserProfile.username}
                    className="w-48 h-48 rounded-full object-cover mb-4"
                    onError={(e) => {
                      e.target.src = `https://ui-avatars.com/api/?name=${remoteUserProfile.username}&background=${getConsistentColor(remoteUserProfile.username)}&color=fff`;
                    }}
                  />
                  <p className="text-white text-xl">{remoteUserProfile.username}</p>
                </>
              ) : (
                <i className="fa-solid fa-user text-gray-600 text-9xl"></i>
              )}
            </div>
          )}
        </div>

        {/* Local video (small overlay) */}
        <div className="absolute bottom-4 right-4 w-64 h-48 bg-gray-800 rounded-lg border-2 border-gray-700 overflow-hidden relative">
          <video
            ref={localVideoRef}
            autoPlay
            muted
            playsInline
            className={`w-full h-full object-cover ${isCameraOff || !hasVideoPermission ? 'hidden' : ''}`}
          />
          {(isCameraOff || !hasVideoPermission) && (() => {
            console.log('🎨 Rendering profile picture overlay for local user:', {
              hasProfile: !!localUserProfile,
              username: localUserProfile?.username,
              isCameraOff,
              hasVideoPermission
            });
            return (
              <div className="absolute inset-0 w-full h-full flex flex-col items-center justify-center bg-gray-800">
                {localUserProfile ? (
                  <>
                    <img
                      src={getProfileImage(localUserProfile)}
                      alt={localUserProfile.username}
                      className="w-24 h-24 rounded-full object-cover mb-2"
                      onError={(e) => {
                        console.error('❌ Image failed to load, using fallback');
                        e.target.src = `https://ui-avatars.com/api/?name=${localUserProfile.username}&background=${getConsistentColor(localUserProfile.username)}&color=fff`;
                      }}
                      onLoad={() => {
                        console.log('✅ Profile image loaded successfully');
                      }}
                    />
                    <p className="text-white text-sm">{localUserProfile.username}</p>
                  </>
                ) : (
                  <i className="fa-solid fa-user text-gray-500 text-2xl"></i>
                )}
              </div>
            );
          })()}
        </div>

        {/* Call status */}
        {callStatus === 'calling' && (
          <div className="absolute top-4 left-1/2 transform -translate-x-1/2 bg-gray-800 p-4 rounded-lg">
            <p className="text-white text-sm">Calling...</p>
          </div>
        )}

        {callStatus === 'connected' && (
          <div className="absolute top-4 left-1/2 transform -translate-x-1/2 bg-green-800 p-2 rounded-lg">
            <p className="text-white text-sm">Connected</p>
          </div>
        )}
      </div>

      {/* Controls */}
      <div className="bg-gray-900 p-6 flex justify-center gap-6">
        <button
          className={`p-4 rounded-full transition-colors ${isMuted ? 'bg-red-600 hover:bg-red-500' : 'bg-gray-700 hover:bg-gray-600'}`}
          aria-label="Toggle microphone"
          onClick={toggleMute}
        >
          <i className={`fa-solid ${isMuted ? 'fa-microphone-slash' : 'fa-microphone'} text-white text-xl`}></i>
        </button>

        <button
          className={`p-4 rounded-full transition-colors ${isCameraOff ? 'bg-red-600 hover:bg-red-500' : 'bg-gray-700 hover:bg-gray-600'}`}
          aria-label="Toggle camera"
          onClick={toggleCamera}
        >
          <i className={`fa-solid ${isCameraOff ? 'fa-video-slash' : 'fa-video'} text-white text-xl`}></i>
        </button>

        <button
          className="p-4 rounded-full bg-red-600 hover:bg-red-500 transition-colors"
          aria-label="End call"
          onClick={handleEndCall}
        >
          <i className="fa-solid fa-phone-slash text-white text-xl"></i>
        </button>
      </div>
    </div>
  );
};

export default VideoCall;
