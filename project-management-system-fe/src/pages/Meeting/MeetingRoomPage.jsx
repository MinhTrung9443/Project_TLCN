import React, { useState, useEffect, useCallback, useRef } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { LiveKitRoom, VideoConference, RoomAudioRenderer, useRoomContext, useParticipants } from "@livekit/components-react";
import { RoomEvent } from "livekit-client";
import "@livekit/components-styles";
import {
  joinMeeting,
  endMeeting as endMeetingAPI,
  kickParticipant as kickParticipantAPI,
  uploadChatHistory,
  uploadRecording,
} from "../../services/meetingService";
import { recordingManager } from "../../utils/recordingUtils.js";
import { toast } from "react-toastify";
import ConfirmationModal from "../../components/common/ConfirmationModal";

const MeetingHeader = ({ meetingInfo }) => {
  const [time, setTime] = useState(new Date());

  useEffect(() => {
    const timer = setInterval(() => setTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  const timeStr = time.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });

  return (
    <div className="absolute top-0 left-0 right-0 z-40 px-5 py-2.5 bg-neutral-900/95 backdrop-blur-sm border-b border-white/5">
      <div className="flex items-center justify-between h-12">
        <div className="flex items-center gap-3 min-w-0">
          <div className="flex items-center justify-center w-8 h-8 bg-blue-600/20 rounded-lg">
            <svg className="w-5 h-5 text-blue-400" fill="currentColor" viewBox="0 0 24 24">
              <path d="M17 10.5V7c0-.55-.45-1-1-1H4c-.55 0-1 .45-1 1v10c0 .55.45 1 1 1h12c.55 0 1-.45 1-1v-3.5l4 4v-11l-4 4z" />
            </svg>
          </div>
          <div className="flex items-center gap-2 min-w-0">
            <span className="text-sm font-medium text-white truncate">{meetingInfo?.title || "Meeting Room"}</span>
            <span className="text-xs text-gray-400 flex items-center gap-1.5 whitespace-nowrap">
              <span className="relative flex h-1.5 w-1.5">
                <span className="animate-pulse inline-flex h-full w-full rounded-full bg-green-500"></span>
              </span>
              LIVE
            </span>
          </div>
        </div>
        <div className="flex items-center gap-2 text-xs text-gray-400">
          <span>{timeStr}</span>
        </div>
      </div>
    </div>
  );
};

const ChatPanel = ({ chatMessages, onClose, room, onSendMessage }) => {
  const [messageInput, setMessageInput] = useState("");
  const messagesEndRef = useRef(null);

  useEffect(() => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: "smooth" });
    }
  }, [chatMessages]);

  const handleSend = async () => {
    if (!messageInput.trim() || !room) return;

    const text = messageInput.trim();

    try {
      await room.localParticipant.publishData(new TextEncoder().encode(text), { reliable: true });

      // Add message to local chat immediately
      if (onSendMessage) {
        onSendMessage(text);
      }

      setMessageInput("");
    } catch (error) {
      console.error("Failed to send message:", error);
      toast.error("Failed to send message");
    }
  };

  return (
    <div className="flex flex-col h-full">
      <div className="flex-1 overflow-y-auto px-4 py-3 space-y-3">
        {chatMessages.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-center px-4">
            <svg className="w-12 h-12 text-gray-300 mb-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={1.5}
                d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z"
              />
            </svg>
            <p className="text-sm text-gray-500">No messages yet</p>
          </div>
        ) : (
          chatMessages.map((msg, idx) => (
            <div key={idx} className={`flex ${msg.from === "You" ? "justify-end" : "justify-start"}`}>
              <div className={`max-w-xs px-3 py-2 rounded-lg ${msg.from === "You" ? "bg-blue-600 text-white" : "bg-gray-100 text-gray-900"}`}>
                {msg.from !== "You" && (
                  <p className={`text-xs font-semibold mb-1 ${msg.from === "You" ? "text-blue-100" : "text-gray-700"}`}>{msg.from}</p>
                )}
                <p className="text-sm break-words">{msg.message}</p>
                <p className={`text-xs mt-1 ${msg.from === "You" ? "text-blue-100" : "text-gray-500"}`}>
                  {new Date(msg.timestamp).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                </p>
              </div>
            </div>
          ))
        )}
        <div ref={messagesEndRef} />
      </div>

      <div className="px-4 py-3 border-t border-gray-200 flex-shrink-0">
        <div className="flex items-center gap-2">
          <input
            type="text"
            value={messageInput}
            onChange={(e) => setMessageInput(e.target.value)}
            onKeyPress={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                handleSend();
              }
            }}
            placeholder="Type a message..."
            className="flex-1 px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
          <button
            onClick={handleSend}
            disabled={!messageInput.trim()}
            className="px-3 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-300 text-white text-sm font-medium rounded-lg transition-colors"
          >
            <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
              <path d="M16.6915026,12.4744748 L3.50612381,13.2599618 C3.19218622,13.2599618 3.03521743,13.4170592 3.03521743,13.5741566 L1.15159189,20.0151496 C0.8376543,20.8006365 0.99,21.89 1.77946707,22.52 C2.41,22.99 3.50612381,23.1 4.13399899,22.8429026 L21.714504,14.0454487 C22.6563168,13.5741566 23.1272231,12.6315722 22.9702544,11.6889879 L4.13399899,1.16390237 C3.34915502,0.9 2.40734225,0.9 1.77946707,1.4 C0.994623095,2.0 0.837654326,3.1 1.15159189,3.89 L3.03521743,10.3701237 C3.03521743,10.5272211 3.34915502,10.6843185 3.50612381,10.6843185 L16.6915026,11.4698054 C16.6915026,11.4698054 17.1624089,11.4698054 17.1624089,12.0698054 C17.1624089,12.6698054 16.6915026,12.4744748 16.6915026,12.4744748 Z" />
            </svg>
          </button>
        </div>
      </div>
    </div>
  );
};

const MeetingControls = ({
  meetingId,
  isHost,
  meetingInfo,
  chatMessages,
  setChatMessages,
  showParticipants,
  setShowParticipants,
  showChat,
  setShowChat,
  showInfo,
  setShowInfo,
}) => {
  const room = useRoomContext();
  const participants = useParticipants();
  const navigate = useNavigate();
  const [isMicOn, setIsMicOn] = useState(true);
  const [isCameraOn, setIsCameraOn] = useState(true);
  const [isScreenSharing, setIsScreenSharing] = useState(false);
  const [confirmModal, setConfirmModal] = useState({
    isOpen: false,
    type: null,
    title: "",
    message: "",
    onConfirm: null,
    confirmText: "Yes",
  });

  const handleKick = async (participantId) => {
    setConfirmModal({
      isOpen: true,
      type: "kick",
      title: "Remove Participant",
      message: "Are you sure you want to remove this participant from the meeting?",
      confirmText: "Remove",
      onConfirm: async () => {
        setConfirmModal({ isOpen: false });
        try {
          await kickParticipantAPI(meetingId, participantId);
          toast.success("Participant removed");
        } catch (error) {
          toast.error("Failed to remove participant");
        }
      },
    });
  };

  const handleEndMeeting = async () => {
    setConfirmModal({
      isOpen: true,
      type: "end",
      title: "End Meeting",
      message: "Are you sure you want to end this meeting for everyone? This action cannot be undone.",
      confirmText: "End Meeting",
      onConfirm: async () => {
        setConfirmModal({ isOpen: false });
        let recordingBlob = null;

        try {
          console.log("[handleEndMeeting] isHost:", isHost, "recordingActive:", recordingManager.isActive());
          // Stop and save recording if host
          if (isHost && recordingManager.isActive()) {
            console.log("[handleEndMeeting] Stopping recording...");
            toast.info("Saving recording...");
            try {
              recordingBlob = await recordingManager.stopRecording();
              console.log("[handleEndMeeting] Recording blob size:", recordingBlob?.size);
            } catch (error) {
              console.error("Failed to stop recording:", error);
              toast.warn("Failed to save recording");
            }
          }

          // Auto-export chat history if there are messages (non-blocking)
          if (chatMessages.length > 0) {
            const chatText = chatMessages.map((msg) => `[${new Date(msg.timestamp).toLocaleString()}] ${msg.from}: ${msg.message}`).join("\n");
            const blob = new Blob([chatText], { type: "text/plain;charset=utf-8" });
            const file = new File([blob], `meeting-chat-${new Date().toISOString().slice(0, 10)}.txt`, {
              type: "text/plain",
            });

            // Upload chat history in background
            uploadChatHistory(meetingId, file)
              .then(() => {
                console.log("[handleEndMeeting] Chat history uploaded successfully");
              })
              .catch((error) => {
                console.error("Failed to upload chat history:", error);
              });
          }

          // Upload recording in background if available (non-blocking)
          if (recordingBlob) {
            console.log("[handleEndMeeting] Scheduling background upload for recording blob...");
            const recordingFile = new File([recordingBlob], `meeting-${meetingId}-${new Date().toISOString().slice(0, 19).replace(/:/g, "-")}.webm`, {
              type: "video/webm",
            });
            console.log("[handleEndMeeting] Recording file created:", recordingFile.name, recordingFile.size);

            // Upload in background - don't block user from leaving
            toast.info("Recording will be uploaded in background. You can leave now.");
            uploadRecording(meetingId, recordingFile, (progress) => {
              console.log(`Upload progress: ${progress.toFixed(0)}%`);
            })
              .then((response) => {
                console.log("[handleEndMeeting] Upload response:", response);
                toast.success("Recording uploaded successfully!");
              })
              .catch((error) => {
                console.error("[handleEndMeeting] Failed to upload recording:", error);
                toast.error("Recording upload failed");
              });
          } else {
            console.log("[handleEndMeeting] No recording blob to upload");
          }

          // End meeting and disconnect immediately - don't wait for uploads
          await endMeetingAPI(meetingId);
          toast.success("Meeting ended");
          room.disconnect();
          navigate(-1);
        } catch (error) {
          toast.error("Failed to end meeting");
        }
      },
    });
  };

  const handleLeave = () => {
    setConfirmModal({
      isOpen: true,
      type: "leave",
      title: "Leave Meeting",
      message: "Are you sure you want to leave this meeting?",
      confirmText: "Leave",
      onConfirm: () => {
        setConfirmModal({ isOpen: false });
        room.disconnect();
        navigate(-1);
      },
    });
  };

  const toggleMic = () => {
    if (room?.localParticipant) {
      room.localParticipant.setMicrophoneEnabled(!isMicOn);
      setIsMicOn(!isMicOn);
    }
  };

  const toggleCamera = () => {
    if (room?.localParticipant) {
      room.localParticipant.setCameraEnabled(!isCameraOn);
      setIsCameraOn(!isCameraOn);
    }
  };

  const toggleScreenShare = async () => {
    if (!room?.localParticipant) return;

    try {
      if (isScreenSharing) {
        await room.localParticipant.setScreenShareEnabled(false);
        setIsScreenSharing(false);
        toast.info("Screen sharing stopped");
      } else {
        await room.localParticipant.setScreenShareEnabled(true);
        setIsScreenSharing(true);
        toast.success("Screen sharing started");
      }
    } catch (error) {
      console.error("Screen share error:", error);
      toast.error("Failed to toggle screen share");
    }
  };

  return (
    <>
      <div className="absolute bottom-0 left-0 right-0 z-40 pb-8 flex items-center justify-center pointer-events-none">
        <div className="flex items-center justify-center pointer-events-auto">
          <div className="flex items-center gap-1.5 bg-gray-800/95 backdrop-blur-md rounded-full px-3 py-2 shadow-2xl border border-white/10">
            <button
              onClick={toggleMic}
              className={`p-2.5 rounded-full transition-all ${isMicOn ? "bg-gray-700 hover:bg-gray-600" : "bg-red-600 hover:bg-red-700"}`}
              title={isMicOn ? "Turn off microphone" : "Turn on microphone"}
            >
              {isMicOn ? (
                <svg className="w-5 h-5 text-gray-200" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z"
                  />
                </svg>
              ) : (
                <svg className="w-5 h-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M5.586 15H4a1 1 0 01-1-1v-4a1 1 0 011-1h1.586l4.707-4.707C10.923 3.663 12 4.109 12 5v14c0 .891-1.077 1.337-1.707.707L5.586 15z"
                  />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2" />
                </svg>
              )}
            </button>

            <button
              onClick={toggleCamera}
              className={`p-2.5 rounded-full transition-all ${isCameraOn ? "bg-gray-700 hover:bg-gray-600" : "bg-red-600 hover:bg-red-700"}`}
              title={isCameraOn ? "Turn off camera" : "Turn on camera"}
            >
              {isCameraOn ? (
                <svg className="w-5 h-5 text-gray-200" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z"
                  />
                </svg>
              ) : (
                <svg className="w-5 h-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z"
                  />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 3l18 18" />
                </svg>
              )}
            </button>

            <button
              onClick={toggleScreenShare}
              className={`p-2.5 rounded-full transition-all ${isScreenSharing ? "bg-blue-600 hover:bg-blue-700" : "bg-gray-700 hover:bg-gray-600"}`}
              title={isScreenSharing ? "Stop screen share" : "Share screen"}
            >
              <svg className="w-5 h-5 text-gray-200" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"
                />
              </svg>
            </button>

            <div className="w-px h-8 bg-gray-700 mx-1"></div>

            <button
              onClick={() => setShowParticipants(!showParticipants)}
              className={`p-2.5 rounded-full transition-all relative ${
                showParticipants ? "bg-blue-600 hover:bg-blue-700" : "bg-gray-700 hover:bg-gray-600"
              }`}
              title="Show participants"
            >
              <svg className="w-5 h-5 text-gray-200" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z"
                />
              </svg>
              {participants.length > 0 && (
                <span className="absolute -top-2 -right-2 bg-blue-600 text-white text-[10px] font-bold px-1.5 py-0.5 rounded-full min-w-[18px] text-center">
                  {participants.length}
                </span>
              )}
            </button>

            <button
              onClick={() => setShowChat(!showChat)}
              className={`p-2.5 rounded-full transition-all relative ${showChat ? "bg-blue-600 hover:bg-blue-700" : "bg-gray-700 hover:bg-gray-600"}`}
              title="Chat"
            >
              <svg className="w-5 h-5 text-gray-200" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z"
                />
              </svg>
              {chatMessages.length > 0 && <span className="absolute -top-1 -right-1 w-2 h-2 bg-red-500 rounded-full"></span>}
            </button>

            <button
              onClick={() => setShowInfo(!showInfo)}
              className="p-2.5 bg-gray-700 hover:bg-gray-600 rounded-full transition-all"
              title="Meeting details"
            >
              <svg className="w-5 h-5 text-gray-200" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </button>

            {isHost ? (
              <button
                onClick={handleEndMeeting}
                className="p-2.5 bg-red-600 hover:bg-red-700 rounded-full transition-all"
                title="End meeting for all"
              >
                <svg className="w-5 h-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M16 8l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2M5 3a2 2 0 00-2 2v1c0 8.284 6.716 15 15 15h1a2 2 0 002-2v-3.28a1 1 0 00-.684-.948l-4.493-1.498a1 1 0 00-1.21.502l-1.13 2.257a11.042 11.042 0 01-5.516-5.517l2.257-1.128a1 1 0 00.502-1.21L9.228 3.683A1 1 0 008.279 3H5z"
                  />
                </svg>
              </button>
            ) : (
              <button onClick={handleLeave} className="p-2.5 bg-red-600 hover:bg-red-700 rounded-full transition-all" title="Leave call">
                <svg className="w-5 h-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M16 8l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2M5 3a2 2 0 00-2 2v1c0 8.284 6.716 15 15 15h1a2 2 0 002-2v-3.28a1 1 0 00-.684-.948l-4.493-1.498a1 1 0 00-1.21.502l-1.13 2.257a11.042 11.042 0 01-5.516-5.517l2.257-1.128a1 1 0 00.502-1.21L9.228 3.683A1 1 0 008.279 3H5z"
                  />
                </svg>
              </button>
            )}
          </div>
        </div>
      </div>

      <ConfirmationModal
        isOpen={confirmModal.isOpen}
        title={confirmModal.title}
        message={confirmModal.message}
        confirmText={confirmModal.confirmText}
        onConfirm={confirmModal.onConfirm}
        onClose={() => setConfirmModal({ isOpen: false })}
      />
    </>
  );
};

// Component inside LiveKitRoom to handle chat message receiving
const ChatMessageListener = ({ setChatMessages }) => {
  const room = useRoomContext();

  useEffect(() => {
    if (!room) return;

    const handleDataReceived = (payload, participant) => {
      try {
        const decoder = new TextDecoder();
        const messageText = decoder.decode(payload);

        // Add received message to chat
        setChatMessages((prev) => [
          ...prev,
          {
            from: participant?.name || participant?.identity || "Unknown",
            message: messageText,
            timestamp: Date.now(),
          },
        ]);
      } catch (error) {
        console.error("Failed to decode message:", error);
      }
    };

    room.on(RoomEvent.DataReceived, handleDataReceived);

    return () => {
      room.off(RoomEvent.DataReceived, handleDataReceived);
    };
  }, [room, setChatMessages]);

  return null;
};

// Component to auto-start recording when connected (needs to be inside LiveKitRoom)
const RecordingStarter = ({ isHost }) => {
  const room = useRoomContext();
  const [hasStarted, setHasStarted] = React.useState(false);
  const screenStreamRef = React.useRef(null);

  React.useEffect(() => {
    if (!isHost || !room || hasStarted) return;

    console.log("[RecordingStarter] Room connected, waiting for participants to join...");
    // Increase delay to 5 seconds to ensure remote participants have connected and published their audio
    const timer = setTimeout(async () => {
      try {
        console.log("[RecordingStarter] Starting recording setup...");
        console.log("[RecordingStarter] Current participants:", room.remoteParticipants?.size || 0);

        // Request screen share locally (not published to LiveKit)
        toast.info("Please share your screen to start recording (only for recording, not visible to others)");
        console.log("[RecordingStarter] Requesting local screen share...");

        try {
          // Get screen share stream directly without publishing to LiveKit
          const screenStream = await navigator.mediaDevices.getDisplayMedia({
            video: {
              cursor: "always",
              displaySurface: "monitor",
            },
            audio: true, // Enable system audio capture from tab/screen (user must check "Share audio" in browser dialog)
          });

          console.log("[RecordingStarter] Screen share obtained successfully");
          console.log(
            "[RecordingStarter] Screen share tracks:",
            screenStream.getTracks().map((t) => `${t.kind}: ${t.label}`),
          );
          screenStreamRef.current = screenStream;

          // Listen for when user stops sharing via browser UI
          screenStream.getVideoTracks()[0].addEventListener("ended", () => {
            console.log("[RecordingStarter] Screen share ended by user");
            toast.warn("Screen sharing stopped - recording may only show camera");
          });
        } catch (error) {
          console.error("[RecordingStarter] Screen share failed:", error);
          toast.error("Screen share is required for recording. Recording will use camera instead.");
          // Continue without screen share - will fallback to camera
        }

        // Now start recording with screen stream
        console.log("[RecordingStarter] Attempting to start recording...");
        const success = await recordingManager.startRecording(room, screenStreamRef.current);
        console.log("[RecordingStarter] Recording start result:", success);

        if (success) {
          toast.success(screenStreamRef.current ? "Recording started with screen share (private)" : "Recording started with camera");
          setHasStarted(true);
        } else {
          toast.warn("Recording could not be started");
        }
      } catch (error) {
        console.error("[RecordingStarter] Error during recording setup:", error);
        toast.error("Failed to start recording");
      }
    }, 5000); // Increase to 5 seconds to wait for remote participants

    return () => clearTimeout(timer);
  }, [room, isHost, hasStarted]);

  return null;
};

const MeetingRoomPageContent = ({
  meetingId,
  token,
  serverUrl,
  meetingInfo,
  isHost,
  handleDisconnect,
  handleError,
  chatMessages,
  setChatMessages,
}) => {
  return (
    <div className="h-screen bg-gray-900 flex flex-col overflow-hidden">
      <LiveKitRoom
        className="flex-1 flex flex-col overflow-hidden"
        video={true}
        audio={true}
        token={token}
        serverUrl={serverUrl}
        connect={true}
        onDisconnected={handleDisconnect}
        onError={handleError}
        options={{
          adaptiveStream: true,
          dynacast: true,
          publishDefaults: { audioPreset: { maxBitrate: 64000 }, screenShareEncoding: { maxBitrate: 2000000 } },
        }}
      >
        <ChatMessageListener setChatMessages={setChatMessages} />
        <RecordingStarter isHost={isHost} />
        <MeetingRoomContent
          meetingId={meetingId}
          meetingInfo={meetingInfo}
          isHost={isHost}
          chatMessages={chatMessages}
          setChatMessages={setChatMessages}
        />
        <RoomAudioRenderer />
      </LiveKitRoom>
    </div>
  );
};

// Inner component that uses LiveKit hooks - rendered INSIDE LiveKitRoom
const MeetingRoomContent = ({ meetingId, meetingInfo, isHost, chatMessages, setChatMessages }) => {
  const room = useRoomContext();
  const participants = useParticipants();
  const [showParticipants, setShowParticipants] = useState(false);
  const [showChat, setShowChat] = useState(false);
  const [showInfo, setShowInfo] = useState(false);

  const handleKick = async (participantId) => {
    try {
      await kickParticipantAPI(meetingId, participantId);
      toast.success("Participant removed");
    } catch (error) {
      toast.error("Failed to remove participant");
    }
  };

  return (
    <>
      <MeetingHeader meetingInfo={meetingInfo} chatMessages={chatMessages} />

      {/* Main content area with responsive panels */}
      <div className="flex-1 flex overflow-hidden">
        {/* Video area - shrinks when panels open */}
        <div className={`flex flex-col pt-14 pb-24 transition-all duration-300 ${showParticipants || showChat ? "flex-1" : "w-full"}`}>
          <VideoConference className="w-full h-full" />
        </div>

        {/* Right panels container */}
        {(showParticipants || showChat) && (
          <div
            className={`flex bg-gray-800 border-l border-gray-700 overflow-hidden transition-all duration-300 ${
              showParticipants && showChat ? "w-[640px]" : "w-96"
            }`}
          >
            {/* Participants panel */}
            {showParticipants && (
              <div className={`flex flex-col bg-white ${showChat ? "w-1/2 border-r border-gray-200" : "w-full"}`}>
                <div className="px-5 py-4 border-b border-gray-200 flex items-center justify-between flex-shrink-0">
                  <h3 className="text-base font-medium text-gray-900">Participants ({participants.length})</h3>
                  <button onClick={() => setShowParticipants(false)} className="p-1 hover:bg-gray-100 rounded-full transition-colors">
                    <svg className="w-5 h-5 text-gray-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </div>
                <div className="flex-1 overflow-y-auto">
                  {participants.map((p) => (
                    <div key={p.identity} className="flex items-center justify-between px-5 py-3 hover:bg-gray-50 group transition-colors">
                      <div className="flex items-center gap-3 min-w-0">
                        <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-blue-600 rounded-full flex items-center justify-center text-white text-sm font-medium flex-shrink-0">
                          {(p.name || p.identity).charAt(0).toUpperCase()}
                        </div>
                        <div className="min-w-0">
                          <p className="text-sm font-medium text-gray-900 truncate">{p.name || p.identity}</p>
                          {p.identity === room.localParticipant.identity && <span className="text-xs text-gray-500">(You)</span>}
                        </div>
                      </div>
                      {isHost && p.identity !== room.localParticipant.identity && (
                        <button
                          onClick={() => handleKick(p.identity)}
                          className="opacity-0 group-hover:opacity-100 px-3 py-1.5 text-xs font-medium bg-gray-100 hover:bg-red-50 text-gray-700 hover:text-red-600 rounded-md transition-all flex-shrink-0"
                        >
                          Remove
                        </button>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Chat panel */}
            {showChat && (
              <div className={`flex flex-col bg-white ${showParticipants ? "w-1/2" : "w-full"}`}>
                <div className="flex items-center justify-between px-4 py-3 border-b border-gray-200 flex-shrink-0">
                  <div className="flex items-center gap-2">
                    <h3 className="text-sm font-medium text-gray-900">In-call messages</h3>
                    <span className="text-xs text-gray-500">({chatMessages.length})</span>
                  </div>
                  <button onClick={() => setShowChat(false)} className="p-2 hover:bg-gray-100 rounded-full transition-colors">
                    <svg className="w-4 h-4 text-gray-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </div>
                <ChatPanel
                  chatMessages={chatMessages}
                  onClose={() => setShowChat(false)}
                  room={room}
                  onSendMessage={(text) => {
                    setChatMessages((prev) => [
                      ...prev,
                      {
                        from: room.localParticipant.name || room.localParticipant.identity || "You",
                        message: text,
                        timestamp: Date.now(),
                      },
                    ]);
                  }}
                />
              </div>
            )}
          </div>
        )}
      </div>

      <MeetingControls
        meetingId={meetingId}
        isHost={isHost}
        meetingInfo={meetingInfo}
        chatMessages={chatMessages}
        setChatMessages={setChatMessages}
        showParticipants={showParticipants}
        setShowParticipants={setShowParticipants}
        showChat={showChat}
        setShowChat={setShowChat}
        showInfo={showInfo}
        setShowInfo={setShowInfo}
      />

      {showInfo && (
        <div className="absolute bottom-24 left-1/2 transform -translate-x-1/2 z-50 w-96 bg-white rounded-lg shadow-2xl">
          <div className="px-5 py-4 border-b border-gray-200 flex items-center justify-between">
            <h3 className="text-base font-medium text-gray-900">Meeting details</h3>
            <button onClick={() => setShowInfo(false)} className="p-1 hover:bg-gray-100 rounded-full transition-colors">
              <svg className="w-5 h-5 text-gray-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
          <div className="p-5 space-y-4 max-h-80 overflow-y-auto">
            <div>
              <p className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-1.5">Meeting title</p>
              <p className="text-sm text-gray-900">{meetingInfo?.title}</p>
            </div>
            {meetingInfo?.description && (
              <div>
                <p className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-1.5">Description</p>
                <p className="text-sm text-gray-700">{meetingInfo.description}</p>
              </div>
            )}
            {meetingInfo?.startTime && (
              <div>
                <p className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-1.5">Started at</p>
                <p className="text-sm text-gray-900">{new Date(meetingInfo.startTime).toLocaleString()}</p>
              </div>
            )}
            {meetingInfo?.attachments && meetingInfo.attachments.length > 0 && (
              <div>
                <p className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-2">Attachments ({meetingInfo.attachments.length})</p>
                <div className="space-y-2 p-2 bg-gray-50 rounded-lg border border-gray-200">
                  {meetingInfo.attachments.map((attachment) => (
                    <a
                      key={attachment._id}
                      href={attachment.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-2 p-2 text-blue-600 hover:text-blue-700 hover:bg-blue-50 rounded transition-colors group"
                    >
                      <span className="material-symbols-outlined text-base flex-shrink-0">attach_file</span>
                      <span className="text-sm truncate flex-1">{attachment.filename}</span>
                      <span className="material-symbols-outlined text-sm opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0">
                        open_in_new
                      </span>
                    </a>
                  ))}
                </div>
              </div>
            )}
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
        // Clean up immediately after use
        localStorage.removeItem(`meeting_data_${meetingId}`);
      } catch (error) {
        toast.error("Failed to parse meeting data.");
        setConnectionError("Failed to parse meeting data.");
      } finally {
        setLoading(false);
      }
    };
    initMeeting();
  }, [meetingId]);

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
      <div className="flex items-center justify-center h-screen bg-gray-900">
        <div className="text-center">
          <div className="w-14 h-14 mx-auto mb-4 border-4 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
          <h2 className="text-lg font-medium text-white">Joining meeting...</h2>
          <p className="text-sm text-gray-400 mt-2">Please wait</p>
        </div>
      </div>
    );
  }

  if (connectionError || !token || !serverUrl) {
    return (
      <div className="flex items-center justify-center h-screen bg-gray-900">
        <div className="max-w-md bg-white rounded-xl p-8 text-center shadow-2xl">
          <div className="w-16 h-16 mx-auto mb-4 bg-red-100 rounded-full flex items-center justify-center">
            <svg className="w-8 h-8 text-red-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
              />
            </svg>
          </div>
          <h1 className="text-xl font-semibold text-gray-900 mb-2">Can't join meeting</h1>
          <p className="text-sm text-gray-600 mb-6">{connectionError || "Connection failed"}</p>
          <button
            onClick={() => window.location.reload()}
            className="px-6 py-2.5 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium rounded-lg transition-colors shadow-sm"
          >
            Try again
          </button>
        </div>
      </div>
    );
  }

  return (
    <MeetingRoomPageContent
      meetingId={meetingId}
      token={token}
      serverUrl={serverUrl}
      meetingInfo={meetingInfo}
      isHost={isHost}
      handleDisconnect={handleDisconnect}
      handleError={handleError}
      chatMessages={chatMessages}
      setChatMessages={setChatMessages}
    />
  );
};

export default MeetingRoomPage;
