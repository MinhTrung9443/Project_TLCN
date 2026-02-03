/**
 * Client-side recording utility using MediaRecorder API
 * Records audio and video streams directly in the browser
 */

class RecordingManager {
  constructor() {
    this.mediaRecorder = null;
    this.recordedChunks = [];
    this.isRecording = false;
    this.stream = null;
  }

  /**
   * Start recording (auto-captures all active streams)
   * @param {Object} room - LiveKit Room object (optional, for better track capture)
   * @param {MediaStream} screenStream - Local screen share stream (optional, not published to LiveKit)
   * @returns {boolean} - Success status
   */
  async startRecording(room = null, screenStream = null) {
    try {
      // Combine all active audio/video streams from the page
      const combinedStream = new MediaStream();

      let hasAudio = false;
      let hasVideo = false;

      // Priority 1: Explicitly capture host's microphone using getUserMedia
      try {
        console.log("[Recording] Attempting to capture host's microphone...");
        const micStream = await navigator.mediaDevices.getUserMedia({
          audio: {
            echoCancellation: false, // Disable echo cancellation to preserve raw audio
            noiseSuppression: false, // Disable noise suppression
            autoGainControl: false, // Disable auto gain control
          },
        });

        micStream.getAudioTracks().forEach((track) => {
          combinedStream.addTrack(track.clone());
          hasAudio = true;
          console.log("[Recording] ✅ Added host microphone audio track:", track.label);
        });
      } catch (micError) {
        console.warn("[Recording] ⚠️ Could not capture microphone:", micError.message);
        // Continue anyway - may still have audio from LiveKit or screen share
      }

      // Priority 2: Use local screen stream if provided (private, not shared with others)
      if (screenStream) {
        console.log("[Recording] Using local screen stream (not published to LiveKit)");
        screenStream.getTracks().forEach((track) => {
          combinedStream.addTrack(track.clone());
          if (track.kind === "video") {
            hasVideo = true;
            console.log("[Recording] ✅ Added local screen video track (private):", track.label);
          } else if (track.kind === "audio") {
            hasAudio = true;
            console.log("[Recording] ✅ Added local screen audio track (system audio):", track.label);
          }
        });
      }

      // Try to get tracks from LiveKit room first
      if (room) {
        console.log("[Recording] Using LiveKit room to capture tracks");

        // Get local participant tracks
        const localParticipant = room.localParticipant;
        if (localParticipant) {
          console.log("[Recording] Local participant:", localParticipant.identity);

          // Only get video from room if no local screen stream was provided
          if (!screenStream) {
            // Check screen share first
            const hasLocalScreenShare = localParticipant.screenShareTrackPublications?.size > 0;
            console.log("[Recording] Has local screen share:", hasLocalScreenShare);

            // Priority 1: Get screen share tracks first (if available)
            if (hasLocalScreenShare) {
              console.log("[Recording] Local screen share track publications count:", localParticipant.screenShareTrackPublications.size);
              localParticipant.screenShareTrackPublications.forEach((publication, key) => {
                console.log("[Recording] Screen share publication:", key, publication);
                if (publication.track && publication.track.mediaStreamTrack) {
                  combinedStream.addTrack(publication.track.mediaStreamTrack.clone());
                  hasVideo = true;
                  console.log("[Recording] ✅ Added local screen share track:", publication.track.mediaStreamTrack.label);
                }
              });
            } else {
              // Priority 2: Get video tracks (camera) only if no screen share
              if (localParticipant.videoTrackPublications) {
                console.log("[Recording] Local video track publications count:", localParticipant.videoTrackPublications.size);
                localParticipant.videoTrackPublications.forEach((publication, key) => {
                  console.log("[Recording] Video publication:", key, publication);
                  if (publication.track && publication.track.mediaStreamTrack) {
                    combinedStream.addTrack(publication.track.mediaStreamTrack.clone());
                    hasVideo = true;
                    console.log("[Recording] Added local video track:", publication.track.mediaStreamTrack.label);
                  }
                });
              }
            }
          } else {
            console.log("[Recording] Skipping video from room - using local screen stream");
          }

          // Always capture audio from microphone
          if (localParticipant.audioTrackPublications) {
            console.log("[Recording] Local audio track publications count:", localParticipant.audioTrackPublications.size);
            localParticipant.audioTrackPublications.forEach((publication, key) => {
              console.log("[Recording] Audio publication:", key, publication);
              if (publication.track && publication.track.mediaStreamTrack) {
                combinedStream.addTrack(publication.track.mediaStreamTrack.clone());
                hasAudio = true;
                console.log("[Recording] Added local audio track:", publication.track.mediaStreamTrack.label);
              }
            });
          } else {
            console.warn("[Recording] audioTrackPublications not available on local participant");
          }
        }

        // Get remote participants tracks
        if (room.participants) {
          console.log("[Recording] Remote participants count:", room.participants.size);
          room.participants.forEach((participant) => {
            console.log("[Recording] Remote participant:", participant.identity);

            // Get audio tracks from remote participants
            if (participant.audioTrackPublications) {
              console.log(
                `[Recording] Remote participant ${participant.identity} audio track publications count:`,
                participant.audioTrackPublications.size,
              );
              participant.audioTrackPublications.forEach((publication) => {
                console.log(`[Recording] Remote audio publication:`, publication.trackSid, publication.kind, publication.subscribed);
                if (publication.track && publication.track.mediaStreamTrack) {
                  combinedStream.addTrack(publication.track.mediaStreamTrack.clone());
                  hasAudio = true;
                  console.log("[Recording] ✅ Added remote audio track:", publication.track.mediaStreamTrack.label, "from", participant.identity);
                } else if (publication.subscribed && !publication.track) {
                  console.warn(`[Recording] ⚠️ Remote audio publication subscribed but no track available for ${participant.identity}`);
                } else if (!publication.subscribed) {
                  console.warn(`[Recording] ⚠️ Remote audio publication not subscribed for ${participant.identity}`);
                }
              });
            } else {
              console.warn(`[Recording] No audio track publications for remote participant ${participant.identity}`);
            }

            // Check screen share first
            const hasRemoteScreenShare = participant.screenShareTrackPublications?.size > 0;
            console.log(`[Recording] Remote participant ${participant.identity} has screen share:`, hasRemoteScreenShare);

            // Priority: Get screen share tracks (if available)
            if (hasRemoteScreenShare) {
              participant.screenShareTrackPublications.forEach((publication) => {
                if (publication.track && publication.track.mediaStreamTrack) {
                  combinedStream.addTrack(publication.track.mediaStreamTrack.clone());
                  hasVideo = true;
                  console.log("[Recording] ✅ Added remote screen share track:", publication.track.mediaStreamTrack.label);
                }
              });
            } else {
              // Get video tracks only if no screen share
              if (participant.videoTrackPublications) {
                participant.videoTrackPublications.forEach((publication) => {
                  if (publication.track && publication.track.mediaStreamTrack) {
                    combinedStream.addTrack(publication.track.mediaStreamTrack.clone());
                    hasVideo = true;
                    console.log("[Recording] Added remote video track:", publication.track.mediaStreamTrack.label);
                  }
                });
              }
            }
          });
        }
      }

      // Fallback: Get all audio and video elements from the page
      if (combinedStream.getTracks().length === 0) {
        console.log("[Recording] Fallback to DOM query method");
        const audioElements = document.querySelectorAll("audio");
        const videoElements = document.querySelectorAll("video");

        console.log(`[Recording] Found ${videoElements.length} video elements, ${audioElements.length} audio elements`);

        // Capture video streams (includes both video and audio tracks from LiveKit)
        videoElements.forEach((videoEl, index) => {
          if (videoEl.srcObject && videoEl.srcObject.active) {
            const tracks = videoEl.srcObject.getTracks();
            console.log(
              `[Recording] Video element ${index} has ${tracks.length} tracks:`,
              tracks.map((t) => `${t.kind}(${t.label})`),
            );

            tracks.forEach((track) => {
              // Avoid duplicate tracks
              if (!combinedStream.getTracks().find((t) => t.id === track.id)) {
                combinedStream.addTrack(track.clone());
                if (track.kind === "video") hasVideo = true;
                if (track.kind === "audio") hasAudio = true;
                console.log(`[Recording] Added ${track.kind} track: ${track.label}`);
              }
            });
          }
        });

        // Capture audio streams
        audioElements.forEach((audioEl, index) => {
          if (audioEl.srcObject && audioEl.srcObject.active) {
            const tracks = audioEl.srcObject.getTracks();
            console.log(
              `[Recording] Audio element ${index} has ${tracks.length} tracks:`,
              tracks.map((t) => `${t.kind}(${t.label})`),
            );

            tracks.forEach((track) => {
              if (track.kind === "audio" && !combinedStream.getTracks().find((t) => t.id === track.id)) {
                combinedStream.addTrack(track.clone());
                hasAudio = true;
                console.log(`[Recording] Added audio track: ${track.label}`);
              }
            });
          }
        });
      }

      const allTracks = combinedStream.getTracks();
      console.log(
        `[Recording] Combined stream has ${allTracks.length} tracks:`,
        allTracks.map((t) => `${t.kind}(${t.label})`),
      );

      if (allTracks.length === 0) {
        console.warn("No audio or video tracks available for recording");
        return false;
      }

      this.stream = combinedStream;
      this.recordedChunks = [];

      // Create MediaRecorder with appropriate mime type
      const mimeType = this.getValidMimeType();
      this.mediaRecorder = new MediaRecorder(combinedStream, {
        mimeType: mimeType,
        videoBitsPerSecond: 2500000, // 2.5 Mbps
        audioBitsPerSecond: 128000, // 128 kbps
      });

      this.mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          this.recordedChunks.push(event.data);
        }
      };

      this.mediaRecorder.start(1000); // Record in 1s chunks
      this.isRecording = true;

      console.log(`Recording started with mime type: ${mimeType}`);
      console.log(`Tracks: ${hasVideo ? "video" : "no-video"}, ${hasAudio ? "audio" : "no-audio"}`);
      return true;
    } catch (error) {
      console.error("Error starting recording:", error);
      return false;
    }
  }

  /**
   * Stop recording and get the recorded blob
   * @returns {Promise<Blob>} - Recorded video blob
   */
  stopRecording() {
    return new Promise((resolve, reject) => {
      if (!this.mediaRecorder || !this.isRecording) {
        reject(new Error("Recording not in progress"));
        return;
      }

      this.mediaRecorder.onstop = () => {
        const mimeType = this.mediaRecorder.mimeType;
        const blob = new Blob(this.recordedChunks, { type: mimeType });
        this.isRecording = false;
        this.recordedChunks = [];

        console.log(`Recording stopped. Size: ${(blob.size / 1024 / 1024).toFixed(2)} MB`);
        resolve(blob);
      };

      this.mediaRecorder.stop();
    });
  }

  /**
   * Get valid MIME type for the browser
   * @returns {string} - Valid MIME type
   */
  getValidMimeType() {
    // Prioritize MP4 and H264 for better audio/video compatibility with Deepgram
    const types = ["video/mp4", "video/webm;codecs=h264,opus", "video/webm;codecs=vp8,opus", "video/webm;codecs=vp9,opus", "video/webm"];

    for (const type of types) {
      if (MediaRecorder.isTypeSupported(type)) {
        console.log(`[Recording] Selected mime type: ${type}`);
        return type;
      }
    }

    return ""; // Browser will use default
  }

  /**
   * Check if recording is active
   * @returns {boolean}
   */
  isActive() {
    return this.isRecording;
  }
}

// Export singleton instance
export const recordingManager = new RecordingManager();

export default RecordingManager;
