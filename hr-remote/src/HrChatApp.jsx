import React, { useState } from 'react';

/**
 * Federated HR + chat shell: calls RobotCopy flows via props.executeFlow (Inventory host).
 */
export default function HrChatApp({ executeFlow, userId, tenant }) {
  const [log, setLog] = useState('');
  const run = async (flow, vars) => {
    if (typeof executeFlow !== 'function') {
      setLog('executeFlow not provided');
      return;
    }
    const res = await executeFlow(flow, vars, { tenant: tenant || null });
    setLog(JSON.stringify(res, null, 2));
  };

  return (
    <div style={{ fontFamily: 'system-ui, sans-serif', padding: 8 }}>
      <h3 style={{ marginTop: 0 }}>Resaurce HR workspace</h3>
      <p style={{ color: '#555', fontSize: 13 }}>
        Uses RobotCopy flows against resaurce Cave (presence-gated where required).
      </p>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginBottom: 12 }}>
        <button type="button" onClick={() => run('list_available_employees', { requestTime: new Date().toISOString(), skillsRequired: ['documents'] })}>
          List employees
        </button>
        <button
          type="button"
          onClick={() =>
            run('request_hr_help', {
              userId: userId || 'user',
              context: 'Federated HR module',
              skillsRequired: ['documents'],
              urgency: 'medium',
            })
          }
        >
          Request HR help
        </button>
        <button
          type="button"
          onClick={() =>
            run('create_chat_room', {
              name: 'HR chat',
              participants: [userId || 'user', 'hr_agent'],
            })
          }
        >
          Create chat room
        </button>
      </div>
      <pre style={{ background: '#0f172a', color: '#e2e8f0', padding: 8, borderRadius: 6, fontSize: 12, overflow: 'auto', maxHeight: 240 }}>{log || '—'}</pre>
    </div>
  );
}
