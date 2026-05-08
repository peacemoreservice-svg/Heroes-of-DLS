import { default as makeWASocket, useMultiFileAuthState, DisconnectReason } from '@whiskeysockets/baileys';
import { Boom } from '@hapi/boom';
import fs from 'fs';

const phoneNumber = process.env.PHONE_NUMBER;

async function startBot() {
  const { state, saveCreds } = await useMultiFileAuthState('./auth_info_baileys');
  
  const sock = makeWASocket({
    auth: state,
    printQRInTerminal: false
  });

  if (!sock.authState.creds.registered) {
    if (!phoneNumber) {
      console.log('Add PHONE_NUMBER in Railway Variables first. Format: 27722044535');
      process.exit(1);
    }
    const code = await sock.requestPairingCode(phoneNumber);
    console.log(`\nPAIRING CODE: ${code}\nEnter this in WhatsApp > Linked Devices > Link with phone number`);
  }

  sock.ev.on('creds.update', saveCreds);

  sock.ev.on('connection.update', (update) => {
    const { connection, lastDisconnect } = update;
    if (connection === 'close') {
      const shouldReconnect = (lastDisconnect.error)?.output?.statusCode!== DisconnectReason.loggedOut;
      console.log('Connection closed. Reconnecting:', shouldReconnect);
      if (shouldReconnect) {
        startBot();
      }
    } else if (connection === 'open') {
      console.log('Bot connected successfully!');
    }
  });

  sock.ev.on('messages.upsert', async ({ messages }) => {
    const msg = messages[0];
    if (!msg.message || msg.key.fromMe) return;
    
    const text = msg.message.conversation || msg.message.extendedTextMessage?.text;
    if (text === 'ping') {
      await sock.sendMessage(msg.key.remoteJid, { text: 'pong' });
    }
  });
}

startBot();
