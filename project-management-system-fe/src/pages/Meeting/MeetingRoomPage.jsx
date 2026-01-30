import React, { useState, useEffect, useCallback } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { LiveKitRoom, VideoConference, RoomAudioRenderer, useRoomContext, useParticipants } from "@livekit/components-react";
import { RoomEvent } from "livekit-client";
import "@livekit/components-styles";
import { joinMeeting, endMeeting as endMeetingAPI, kickParticipant as kickParticipantAPI } from "../../services/meetingService";
import { toast } from "react-toastify";
import { saveAs } from "file-saver";

// Compact Header Component
const MeetingHeader = ({ meetingInfo, chatMessages }) => {
  const exportChat = () => {
    if (chatMessages.length === 0) {
      toast.info("No messages to export");
      return;
    }
    const chatText = chatMessages.map((msg) => `[${new Date(msg.timestamp).toLocaleString()}] ${msg.from}: ${msg.message}`).join("\n");
    const blob = new Blob([chatText], { type: "text/plain;charset=utf-8" });
    saveAs(blob, `meeting-chat-${new Date().toISOString().slice(0, 10)}.txt`);
    toast.success("Chat exported");
  };

  return (
    <div className="absolute top-0 left-0 right-0 z-40 bg-gradient-to-b from-black/60 to-transparent backdrop-blur-sm">
      <div className="max-w-7xl mx-auto px-4 py-3 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 bg-primary-500 rounded-lg flex items-center justify-center">
            <svg className="w-5 h-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z"
              />
            </svg>
          </div>
          <h1 className="text-sm font-semibold text-white truncate max-w-sm">{meetingInfo?.title || "Meeting Room"}</h1>
        </div>

        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1.5 bg-green-500/20 px-2.5 py-1 rounded-md">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-green-500"></span>
            </span>
            <span className="text-xs font-medium text-green-400">LIVE</span>
          </div>
          <button
            onClick={exportChat}
            className="px-2.5 py-1 bg-neutral-800/60 hover:bg-neutral-700/60 text-white text-xs rounded-md transition-colors flex items-center gap-1"
          >
            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
            </svg>
            <span className="hidden sm:inline">Export Chat</span>
          </button>
        </div>
      </div>
    </div>
  );
};

// Professional Controls Component
const MeetingControls = ({ meetingId, isHost, meetingInfo }) => {
  const room = useRoomContext();
  const participants = useParticipants();
  const navigate = useNavigate();
  const [showInfo, setShowInfo] = useState(false);
  const [showParticipants, setShowParticipants] = useState(false);

  const handleKick = async (participantId) => {
    if (!window.confirm("Remove this participant?")) return;
    try {
      await kickParticipantAPI(meetingId, participantId);
      toast.success("Participant removed");
    } catch (error) {
      toast.error("Failed to remove participant");
    }
  };

  const handleEndMeeting = async () => {
    if (!window.confirm("End meeting for everyone?")) return;
    try {
      await endMeetingAPI(meetingId);
      toast.success("Meeting ended");
      room.disconnect();
      setTimeout(() => navigate(-1), 1000);
    } catch (error) {
      toast.error("Failed to end meeting");
    }
  };

  const handleLeave = () => {
    if (window.confirm("Leave meeting?")) {
      room.disconnect();
      navigate(-1);
    }
  };

  return (
    <>
      {/* Top Right Controls Bar */}
      <div className="absolute top-3 right-3 z-50 flex items-center gap-1.5 bg-neutral-900/80 backdrop-blur-sm rounded-lg p-1.5 shadow-lg">
        <button
          onClick={() => setShowInfo(!showInfo)}
          className="px-2.5 py-1.5 hover:bg-neutral-700 text-white rounded transition-colors text-xs flex items-center gap-1.5"
          title="Meeting Info"
        >
          <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <span className="hidden sm:inline">Info</span>
        </button>

        <div className="w-px h-4 bg-neutral-700"></div>

        <button
          onClick={() => setShowParticipants(!showParticipants)}
          className="px-2.5 py-1.5 hover:bg-neutral-700 text-white rounded transition-colors text-xs flex items-center gap-1.5 relative"
          title="Participants"
        >
          <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z"
            />
          </svg>
          <span className="font-medium">{participants.length}</span>
          {participants.length > 0 && <span className="absolute top-0 right-0 w-1.5 h-1.5 bg-green-500 rounded-full"></span>}
        </button>

        <div className="w-px h-4 bg-neutral-700"></div>

        {isHost ? (
          <button
            onClick={handleEndMeeting}
            className="px-2.5 py-1.5 bg-red-600 hover:bg-red-700 text-white rounded transition-colors text-xs flex items-center gap-1.5"
            title="End Meeting"
          >
            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
            <span className="hidden sm:inline">End</span>
          </button>
        ) : (
          <button
            onClick={handleLeave}
            className="px-2.5 py-1.5 bg-orange-600 hover:bg-orange-700 text-white rounded transition-colors text-xs flex items-center gap-1.5"
            title="Leave Meeting"
          >
            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1"
              />
            </svg>
            <span className="hidden sm:inline">Leave</span>
          </button>
        )}
      </div>

      {/* Info Panel */}
      {showInfo && (
        <div className="absolute top-12 right-3 z-50 w-72 bg-white rounded-lg shadow-xl overflow-hidden">
          <div className="bg-primary-600 px-3 py-2.5 flex items-center justify-between">
            <h3 className="text-white font-semibold text-sm">Meeting Info</h3>
            <button onClick={() => setShowInfo(false)} className="text-white hover:bg-white/20 rounded p-0.5">
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
          <div className="p-3 space-y-2.5 max-h-64 overflow-y-auto custom-scrollbar">
            <div>
              <p className="text-xs text-neutral-500 font-medium">Title</p>
              <p className="text-sm text-neutral-900 mt-0.5">{meetingInfo?.title}</p>
            </div>
            {meetingInfo?.description && (
              <div>
                <p className="text-xs text-neutral-500 font-medium">Description</p>
                <p className="text-sm text-neutral-700 mt-0.5">{meetingInfo.description}</p>
              </div>
            )}
            {meetingInfo?.startTime && (
              <div>
                <p className="text-xs text-neutral-500 font-medium">Start</p>
                <p className="text-sm text-neutral-900 mt-0.5">{new Date(meetingInfo.startTime).toLocaleString()}</p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Participants Panel */}
      {showParticipants && (
        <div className="absolute top-12 right-3 z-50 w-72 bg-white rounded-lg shadow-xl overflow-hidden">
          <div className="bg-primary-600 px-3 py-2.5 flex items-center justify-between">
            <h3 className="text-white font-semibold text-sm">Participants ({participants.length})</h3>
            <button onClick={() => setShowParticipants(false)} className="text-white hover:bg-white/20 rounded p-0.5">
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
          <div className="p-2 max-h-64 overflow-y-auto custom-scrollbar">
            {participants.map((p) => (
              <div key={p.identity} className="flex items-center justify-between p-2 hover:bg-neutral-50 rounded group">
                <div className="flex items-center gap-2">
                  <div className="w-7 h-7 bg-gradient-to-br from-primary-500 to-primary-600 rounded-full flex items-center justify-center text-white text-xs font-semibold">
                    {(p.name || p.identity).charAt(0).toUpperCase()}
                  </div>
                  <div>
                    <p className="text-sm font-medium text-neutral-900">{p.name || p.identity}</p>
                    {p.identity === room.localParticipant.identity && <span className="text-xs text-primary-600">You</span>}
                  </div>
                </div>
                {isHost && p.identity !== room.localParticipant.identity && (
                  <button
                    onClick={() => handleKick(p.identity)}
                    className="opacity-0 group-hover:opacity-100 px-2 py-0.5 text-xs bg-red-500 hover:bg-red-600 text-white rounded transition-all"
                  >
                    Remove
                  </button>
                )}
              </div>
            ))}
          </div>
        </div>
      )}
    </>
  );
};

const MeetingRoomPage = () => {
  const { meetingId } = useParams();
  const [token, setToken] = useState("");
  const [serverUrl, setServerUrl] = useState("");
  const [loading, setLoading] = useState(true);
  const [meetingInfo, setMeetingInfo] = useState(null);
  const [isHost, setIsHost] = useState(false);
  const [chatMessages, setChatMessages] = useState([]);
  const [connectionError, setConnectionError] = useState("");

  useEffect(() => {
    const initMeeting = async () => {
      try {
        const response = await joinMeeting(meetingId);
        const { token, serverUrl, meeting, isHost } = response.data;
        const tokenString = typeof token === "string" ? token : JSON.stringify(token);
        setToken(tokenString);
        setServerUrl(serverUrl);
        setMeetingInfo(meeting);
        setIsHost(isHost);
        setLoading(false);
      } catch (error) {
        const message = error.response?.data?.message || "Failed to join meeting";
        toast.error(message);
        setConnectionError(message);
        setLoading(false);
      }
    };
    initMeeting();
  }, [meetingId]);

  const handleConnected = useCallback((room) => {
    if (!room) return;
    Promise.all([room.localParticipant.setCameraEnabled(true), room.localParticipant.setMicrophoneEnabled(true)]).catch(() => {
      toast.error("Camera/microphone access denied");
    });
    room.on(RoomEvent.DataReceived, (payload, participant) => {
      const message = new TextDecoder().decode(payload);
      setChatMessages((prev) => [...prev, { from: participant?.name || "Unknown", message, timestamp: Date.now() }]);
    });
  }, []);

  const handleDisconnect = () => {
    toast.info("Disconnected");
    setConnectionError("Disconnected");
  };

  const handleError = useCallback((error) => {
    console.error("LiveKit error:", error);
    toast.error(error?.message || "Connection failed");
    setConnectionError(error?.message || "Connection failed");
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen bg-neutral-900">
        <div className="text-center">
          <div className="w-16 h-16 mx-auto mb-4 border-4 border-primary-500 border-t-transparent rounded-full animate-spin"></div>
          <h2 className="text-xl font-semibold text-white">Joining Meeting...</h2>
          <p className="text-neutral-400 text-sm mt-2">Please wait</p>
        </div>
      </div>
    );
  }

  if (connectionError || !token || !serverUrl) {
    return (
      <div className="flex items-center justify-center h-screen bg-neutral-900">
        <div className="max-w-md bg-neutral-800 rounded-xl p-8 text-center">
          <div className="w-16 h-16 mx-auto mb-4 bg-red-500/20 rounded-full flex items-center justify-center">
            <svg className="w-8 h-8 text-red-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
              />
            </svg>
          </div>
          <h1 className="text-xl font-bold text-white mb-2">Unable to Join</h1>
          <p className="text-neutral-400 mb-6">{connectionError || "Connection failed"}</p>
          <button
            onClick={() => window.location.reload()}
            className="px-6 py-2 bg-primary-600 hover:bg-primary-700 text-white rounded-lg transition-colors"
          >
            Try Again
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="h-screen bg-neutral-900 relative">
      <LiveKitRoom
        className="h-full"
        video={true}
        audio={true}
        token={token}
        serverUrl={serverUrl}
        connect={true}
        onConnected={handleConnected}
        onDisconnected={handleDisconnect}
        onError={handleError}
        options={{
          adaptiveStream: true,
          dynacast: true,
          publishDefaults: { audioPreset: { maxBitrate: 64000 }, screenShareEncoding: { maxBitrate: 2000000 } },
        }}
      >
        <MeetingHeader meetingInfo={meetingInfo} chatMessages={chatMessages} />
        <MeetingControls meetingId={meetingId} isHost={isHost} meetingInfo={meetingInfo} />
        <div className="h-full w-full flex items-center justify-center p-4">
          <div className="w-full h-full max-w-6xl max-h-[calc(100vh-120px)]">
            <VideoConference className="w-full h-full rounded-lg overflow-hidden" />
          </div>
        </div>
        <RoomAudioRenderer />
      </LiveKitRoom>
    </div>
  );
};

export default MeetingRoomPage;
