const { AccessToken, RoomServiceClient } = require("livekit-server-sdk");

const LIVEKIT_API_KEY = process.env.LIVEKIT_API_KEY || "devkey";
const LIVEKIT_API_SECRET = process.env.LIVEKIT_API_SECRET || "devsecret1234567890abcdefghijklmnopqrstuvwxyz";
const LIVEKIT_URL = process.env.LIVEKIT_URL || "ws://localhost:7880";
const LIVEKIT_HOST = process.env.LIVEKIT_HOST || "http://localhost:7880";

/**
 * Create LiveKit access token for a participant
 * @param {string} roomName - Room name
 * @param {string} participantName - Participant display name
 * @param {string} participantId - Unique participant ID
 * @param {boolean} isHost - Whether participant is the host
 * @returns {Promise<string>} Access token
 */
async function createToken(roomName, participantName, participantId, isHost = false) {
  const at = new AccessToken(LIVEKIT_API_KEY, LIVEKIT_API_SECRET, {
    identity: participantId,
    name: participantName,
  });

  at.addGrant({
    roomJoin: true,
    room: roomName,
    canPublish: true,
    canSubscribe: true,
    canPublishData: true,
    // Host permissions
    canUpdateOwnMetadata: true,
    roomAdmin: isHost, // Host can kick participants, end room
    roomRecord: isHost, // Host can control recording
  });

  const token = await at.toJwt();
  console.log("[LiveKit] Token generated successfully, type:", typeof token, "length:", token?.length);
  return token;
}

/**
 * Get Room Service Client
 * @returns {RoomServiceClient}
 */
function getRoomServiceClient() {
  return new RoomServiceClient(LIVEKIT_HOST, LIVEKIT_API_KEY, LIVEKIT_API_SECRET);
}

module.exports = {
  createToken,
  getRoomServiceClient,
  LIVEKIT_URL,
};
