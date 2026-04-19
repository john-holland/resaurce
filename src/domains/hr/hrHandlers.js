'use strict';

const { createRoom, appendMessage, listMessages } = require('./chatStore');

const MOCK_EMPLOYEES = [
  {
    id: 'hr_001',
    name: 'Sarah Johnson',
    email: 'sarah.johnson@company.com',
    skills: ['onboarding', 'benefits', 'payroll', 'documents', 'capital_loss_question', 'investment_help'],
    currentLoad: 2,
    maxLoad: 5,
    rating: 4.8,
  },
  {
    id: 'hr_002',
    name: 'Michael Chen',
    email: 'michael.chen@company.com',
    skills: ['compliance', 'legal', 'employee_relations'],
    currentLoad: 1,
    maxLoad: 4,
    rating: 4.9,
  },
  {
    id: 'hr_003',
    name: 'Emily Rodriguez',
    email: 'emily.rodriguez@company.com',
    skills: ['training', 'development', 'performance'],
    currentLoad: 0,
    maxLoad: 6,
    rating: 4.7,
  },
];

/**
 * @param {object} ctx
 * @param {string} ctx.structural
 * @param {string} ctx.route
 * @param {Record<string, unknown>} ctx.payload
 * @param {string} ctx.traceId
 */
function handleHr(ctx) {
  const { structural, route, payload, traceId } = ctx;

  if (structural === 'hr/help/session') {
    return {
      ok: true,
      service: 'resaurce',
      echoed_route: route || 'resaurce:hr/help/session',
      trace_id: traceId,
    };
  }

  if (structural === 'hr/help/request') {
    const sid = `hr_session_${Date.now()}`;
    return {
      ok: true,
      hrEmployeeId: 'hr_resaurce_001',
      chatRoomId: `chat_${sid}`,
      sessionId: sid,
      trace_id: traceId,
      context: payload.context || '',
    };
  }

  if (structural === 'hr/employees/available') {
    const skillsRequired = Array.isArray(payload.skills_required)
      ? payload.skills_required.map(String)
      : typeof payload.skills_required === 'string'
        ? [payload.skills_required]
        : [];
    const available = MOCK_EMPLOYEES.filter((e) => {
      if (!skillsRequired.length) return true;
      return skillsRequired.some((s) => e.skills.includes(s));
    });
    return {
      ok: true,
      employees: available,
      trace_id: traceId,
    };
  }

  if (structural === 'hr/chat/room/create') {
    const room = createRoom(payload.name, payload.participants);
    return {
      ok: true,
      chat_room: room,
      trace_id: traceId,
    };
  }

  if (structural === 'hr/chat/message/send') {
    const message = appendMessage(payload.chat_room_id, {
      sender: String(payload.sender || 'user'),
      content: String(payload.content || ''),
      type: String(payload.type || payload.message_type || 'user'),
    });
    if (!message) {
      return { ok: false, error: 'chat_room_not_found', trace_id: traceId };
    }
    return { ok: true, message, trace_id: traceId };
  }

  if (structural === 'hr/chat/messages/list') {
    const messages = listMessages(payload.chat_room_id);
    return {
      ok: true,
      messages,
      chat_room_id: payload.chat_room_id,
      trace_id: traceId,
    };
  }

  return null;
}

module.exports = { handleHr, MOCK_EMPLOYEES };
