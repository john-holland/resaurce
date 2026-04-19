'use strict';

const http = require('http');
const https = require('https');
const { URL } = require('url');

/** @type {Map<string, Array<Record<string, unknown>>>} */
const byTrace = new Map();
const MAX_EVENTS_PER_TRACE = 500;
const MAX_TRACES = 2000;

function trimTraces() {
  if (byTrace.size <= MAX_TRACES) return;
  const keys = [...byTrace.keys()];
  for (let i = 0; i < keys.length - MAX_TRACES; i++) {
    byTrace.delete(keys[i]);
  }
}

/**
 * @param {string} traceId
 * @param {Array<Record<string, unknown>>} events
 */
function appendInternal(traceId, events) {
  if (!traceId || !events || !events.length) return;
  let list = byTrace.get(traceId);
  if (!list) {
    list = [];
    byTrace.set(traceId, list);
    trimTraces();
  }
  for (const ev of events) {
    if (list.length >= MAX_EVENTS_PER_TRACE) break;
    list.push(ev);
  }
}

/**
 * @returns {Array<Record<string, unknown>>}
 */
function getEventsForTrace(traceId) {
  return byTrace.get(traceId) ? [...byTrace.get(traceId)] : [];
}

/**
 * @param {string} forwardBase e.g. https://lvm.example.com (no trailing slash)
 * @param {string} traceId
 * @param {Array<Record<string, unknown>>} events
 * @returns {Promise<void>}
 */
function forwardToRemote(forwardBase, traceId, events) {
  if (!forwardBase || !events.length) return Promise.resolve();
  const url = new URL(`${forwardBase.replace(/\/$/, '')}/lvm/append`);
  const body = JSON.stringify({ trace_id: traceId, events });
  const lib = url.protocol === 'https:' ? https : http;
  return new Promise((resolve, reject) => {
    const req = lib.request(
      {
        hostname: url.hostname,
        port: url.port || (url.protocol === 'https:' ? 443 : 80),
        path: url.pathname,
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Content-Length': Buffer.byteLength(body),
        },
        timeout: 15000,
      },
      (res) => {
        res.resume();
        resolve();
      }
    );
    req.on('error', () => resolve());
    req.on('timeout', () => {
      req.destroy();
      resolve();
    });
    req.write(body);
    req.end();
  });
}

module.exports = {
  appendInternal,
  getEventsForTrace,
  forwardToRemote,
};
