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

  const [stream, setStream] = useState(null);
  const [isMuted, setIsMuted] = useState(false);
  const [isCameraOff, setIsCameraOff] = useState(false);
  const [callId, setCallId] = useState('');
  const [isInCall, setIsInCall] = useState(false);
  const [callStatus, setCallStatus] = useState('idle'); // idle, calling, connected

  // Check if we're answering a call (came from notification)
  const isAnswering = location.state?.callId;
  const callerName = location.state?.callerName;

  useEffect(() => {
    const socket = getSocket();

    // Initialize peer connection
    pcRef.current = new RTCPeerConnection(servers);
    remoteStreamRef.current = new MediaStream();

    const startCamera = async () => {
      try {
        const mediaStream = await navigator.mediaDevices.getUserMedia({
          video: true,
          audio: true
        });
        localStreamRef.current = mediaStream;
        setStream(mediaStream);

        if (localVideoRef.current) {
          localVideoRef.current.srcObject = mediaStream;
        }

        // Push tracks from local stream to peer connection
        mediaStream.getTracks().forEach((track) => {
          pcRef.current.addTrack(track, mediaStream);
        });

        // Pull tracks from remote stream, add to video stream
        pcRef.current.ontrack = (event) => {
          event.streams[0].getTracks().forEach((track) => {
            remoteStreamRef.current.addTrack(track);
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
          }, 500);
        } else {
          // If initiating a call, create offer and notify the target user
          handleCreateCall();
        }
      } catch (error) {
        console.error("Error accessing camera:", error);
        alert("Could not access camera/microphone. Please check permissions.");
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
      stopMedia();
      navigate(-1);
    });

    // Listen for call ended by other user
    socket.on('callEnded', () => {
      console.log('Other user ended the call');
      stopMedia();
      navigate(-1);
    });

    return () => {
      stopMedia();
      socket.off('connect', initCall);
      socket.off('callDeclined');
      socket.off('callEnded');
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
    socket.emit('endCall', { odebukiUserId });

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

    // Clear the stream state
    setStream(null);

    // Close peer connection
    if (pcRef.current) {
      pcRef.current.close();
      pcRef.current = null;
    }

    navigate(-1);
  };

  const toggleMute = () => {
    if (localStreamRef.current) {
      localStreamRef.current.getAudioTracks().forEach(track => {
        track.enabled = !track.enabled;
      });
      setIsMuted(!isMuted);
    }
  };

  const toggleCamera = () => {
    if (localStreamRef.current) {
      localStreamRef.current.getVideoTracks().forEach(track => {
        track.enabled = !track.enabled;
      });
      setIsCameraOff(!isCameraOff);
    }
  };

  return (
    <div className="h-screen bg-black flex flex-col">
      {/* Video area */}
      <div className="flex-1 relative flex items-center justify-center">
        {/* Remote video */}
        <div className="w-full h-full bg-gray-900 flex items-center justify-center">
          <video
            ref={remoteVideoRef}
            autoPlay
            playsInline
            className="w-full h-full object-cover"
          />
          {callStatus !== 'connected' && (
            <div className="absolute inset-0 flex items-center justify-center">
              <i className="fa-solid fa-user text-gray-600 text-9xl"></i>
            </div>
          )}
        </div>

        {/* Local video (small overlay) */}
        <div className="absolute bottom-4 right-4 w-64 h-48 bg-gray-800 rounded-lg border-2 border-gray-700 overflow-hidden">
          {stream && !isCameraOff ? (
            <video
              ref={localVideoRef}
              autoPlay
              muted
              playsInline
              className="w-full h-full object-cover"
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center">
              <i className="fa-solid fa-user text-gray-500 text-2xl"></i>
            </div>
          )}
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
