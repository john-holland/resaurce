'use strict';

const http = require('http');
const path = require('path');
const { Verifier } = require('@pact-foundation/pact');
const { app } = require('../src/server.js');

const PORT = Number(process.env.PACT_PROVIDER_PORT || 3456);
const pactFile = path.resolve(__dirname, '../contracts/pacts/inventory-frontend-resaurce-cave.json');

function listen() {
  return new Promise((resolve, reject) => {
    const srv = http.createServer(app);
    srv.listen(PORT, (err) => (err ? reject(err) : resolve(srv)));
  });
}

async function main() {
  const srv = await listen();
  try {
    await new Verifier({
      provider: 'resaurce-cave',
      providerBaseUrl: `http://127.0.0.1:${PORT}`,
      pactUrls: [pactFile],
      stateHandlers: {
        'resaurce Cave is healthy': async () => {},
      },
      logLevel: 'info',
    }).verifyProvider();
    console.log('Pact verification OK:', pactFile);
  } finally {
    srv.close();
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
