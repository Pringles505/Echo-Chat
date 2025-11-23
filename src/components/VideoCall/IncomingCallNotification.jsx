import { useNavigate } from "react-router-dom";
import { getSocket } from "../../socket";

const IncomingCallNotification = ({ callData, onClose }) => {
  const navigate = useNavigate();

  const handleAnswer = () => {
    onClose();
    navigate(`/video-call/${callData.callerId}`, {
      state: {
        callId: callData.callId,
        callerName: callData.callerName
      }
    });
  };

  const handleDecline = () => {
    const socket = getSocket();
    socket.emit('declineCall', {
      callerId: callData.callerId,
      callId: callData.callId
    });
    onClose();
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-gray-800 p-6 rounded-lg shadow-xl max-w-sm w-full mx-4">
        <div className="text-center">
          <div className="w-20 h-20 bg-gray-700 rounded-full mx-auto mb-4 flex items-center justify-center">
            <i className="fa-solid fa-user text-gray-400 text-3xl"></i>
          </div>
          <h3 className="text-white text-xl font-semibold mb-2">
            {callData.callerName}
          </h3>
          <p className="text-gray-400 mb-6">Incoming video call...</p>

          <div className="flex justify-center gap-6">
            <button
              onClick={handleDecline}
              className="p-4 rounded-full bg-red-600 hover:bg-red-500 transition-colors"
              aria-label="Decline call"
            >
              <i className="fa-solid fa-phone-slash text-white text-xl"></i>
            </button>
            <button
              onClick={handleAnswer}
              className="p-4 rounded-full bg-green-600 hover:bg-green-500 transition-colors"
              aria-label="Answer call"
            >
              <i className="fa-solid fa-phone text-white text-xl"></i>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default IncomingCallNotification;
