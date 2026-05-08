const crypto = require('crypto');
const { default: makeWASocket, useMultiFileAuthState, DisconnectReason } = require('@whiskeysockets/baileys');
const express = require('express');
const pino = require('pino');

const app = express();
const PORT = process.env.PORT || 3000;

// Keep Render alive
app.get('/', (req, res) => res.send('WhatsApp Bot Running'));
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));

// Start WhatsApp bot
async function startBot() {
  const { state, saveCreds } = await useMultiFileAuthState('./session');

  const sock = makeWASocket({
    auth: state,
    logger: pino({ level: 'silent' }),
    printQRInTerminal: false,
  });

  sock.ev.on('creds.update', saveCreds);

  sock.ev.on('connection.update', async (update) => {
    const { connection, lastDisconnect } = update;

    if (connection === 'close') {
      const shouldReconnect = (lastDisconnect?.error)?.output?.statusCode !== DisconnectReason.loggedOut;
      console.log('Connection closed. Reconnecting:', shouldReconnect);
      if (shouldReconnect) startBot();
    } else if (connection === 'open') {
      console.log('✅ Connected to WhatsApp');
    }

    // Request pairing code only if not registered
    if (!state.creds.registered && connection !== 'open') {
      console.log('=== PAIRING CODE MODE ===');
      const code = await sock.requestPairingCode(process.env.PHONE_NUMBER);
      console.log('\n✅ YOUR PAIRING CODE: ' + code + '\n');
    }
  });
}

startBot();
