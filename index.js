const { default: makeWASocket, useMultiFileAuthState } = require('@whiskeysockets/baileys');
const express = require('express');
const pino = require('pino');

const app = express();
const PORT = process.env.PORT || 3000;

// 1. Keep Render alive
app.get('/', (req, res) => res.send('WhatsApp Bot is running'));
app.listen(PORT, () => console.log(`Server running on ${PORT}`));

// 2. Start WhatsApp bot
async function startBot() {
  const { state, saveCreds } = await useMultiFileAuthState('./session');
  
  const sock = makeWASocket({
    auth: state,
    logger: pino({ level: 'silent' }),
    printQRInTerminal: false
  });

  sock.ev.on('creds.update', saveCreds);

  sock.ev.on('connection.update', async (update) => {
    const { connection, lastDisconnect } = update;
    
    if (connection === 'close') {
      console.log('Connection closed, restarting...');
      startBot();
    } else if (connection === 'open') {
      console.log('✅ Connected to WhatsApp');
    }

    // 3. Request pairing code if not connected
    if (!state.creds.registered) {
      console.log('=== PAIRING CODE MODE ===');
      const code = await sock.requestPairingCode(process.env.PHONE_NUMBER);
      console.log(`\n✅ YOUR PAIRING CODE: ${code}\n`);
    }
  });
}

startBot();
