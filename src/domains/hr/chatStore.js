'use strict';

/** @type {Map<string, { id: string, name: string, participants: string[], messages: Array<Record<string, unknown>>, createdAt: string }>} */
const rooms = new Map();

function createRoom(name, participants) {
  const id = `chat_${Date.now()}`;
  const room = {
    id,
    name: String(name || 'HR Chat'),
    participants: Array.isArray(participants) ? participants.map(String) : [],
    messages: [],
    createdAt: new Date().toISOString(),
  };
  rooms.set(id, room);
  return room;
}

function getRoom(roomId) {
  return rooms.get(String(roomId || ''));
}

/**
 * @param {string} roomId
 * @param {{ sender: string, content: string, type?: string }} msg
 */
function appendMessage(roomId, msg) {
  const room = getRoom(roomId);
  if (!room) return null;
  const message = {
    id: `msg_${Date.now()}`,
    sender: String(msg.sender || 'user'),
    content: String(msg.content || ''),
    type: msg.type || 'user',
    timestamp: new Date().toISOString(),
  };
  room.messages.push(message);
  rooms.set(roomId, room);
  return message;
}

function listMessages(roomId) {
  const room = getRoom(roomId);
  return room ? [...room.messages] : [];
}

module.exports = { createRoom, getRoom, appendMessage, listMessages, rooms };
