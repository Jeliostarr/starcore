const express = require('express');
const fs = require('fs');
const pino = require('pino');
const { makeid } = require('./id');
const {
    default: makeWASocket,
    useMultiFileAuthState,
    delay,
    makeCacheableSignalKeyStore,
    Browsers
} = require('@whiskeysockets/baileys');

let router = express.Router();

function removeFile(FilePath) {
    if (fs.existsSync(FilePath)) {
        fs.rmSync(FilePath, { recursive: true, force: true });
    }
}

router.get('/', async (req, res) => {
    const id = makeid();
    let num = req.query.number;

    if (!num) {
        return res.status(400).json({ error: 'Phone number required' });
    }

    async function PAIR_CODE() {
        const { state, saveCreds } = await useMultiFileAuthState('./temp/' + id);
        try {
            let conn = makeWASocket({
                auth: {
                    creds: state.creds,
                    keys: makeCacheableSignalKeyStore(
                        state.keys,
                        pino({ level: 'silent' }).child({ level: 'silent' })
                    ),
                },
                printQRInTerminal: false,
                logger: pino({ level: 'silent' }).child({ level: 'silent' }),
                browser: Browsers.macOS('Chrome')
            });

            // Request pairing code only when user explicitly asks
            if (!conn.authState.creds.registered) {
                await delay(1500);
                num = num.replace(/[^0-9]/g, '');
                const code = await conn.requestPairingCode(num);
                if (!res.headersSent) {
                    res.json({ code });
                }
            }

            conn.ev.on('creds.update', saveCreds);

            conn.ev.on('connection.update', async (s) => {
                const { connection, lastDisconnect } = s;

                if (connection === 'open') {
                    console.log(`✅ Connection established for ${num}`);
                    await delay(3000);

                    // Save creds into base64 for session string
                    let data = fs.readFileSync(__dirname + `/temp/${id}/creds.json`);
                    let b64data = Buffer.from(data).toString('base64');

                    const sessionMsg = await conn.sendMessage(
                        conn.user.id,
                        { text: 'DEVSPACE~' + b64data }
                    );

                    const welcomeText = `
╭─═━⌬━═─⊹⊱✦⊰⊹─═━⌬━═─ 
│ 🚀 SESSION CONNECTED  
│ ⭐ EXTRA-MD SESSION     
│ ⚡ Powered by Dev Space  
╰───────────────────╯
📞 Support: https://whatsapp.com/channel/0029VbAzvMIHVvTioxfF192d
⭐ Repo: github.com/Jeliostarr/EXTRA-MD
                    `;

                    await conn.sendMessage(conn.user.id, { text: welcomeText }, { quoted: sessionMsg });

                    await delay(100);
                    await conn.ws.close();
                    return removeFile('./temp/' + id);
                }

                if (connection === 'close') {
                    console.log("ℹ️ Connection closed");
                    removeFile('./temp/' + id);

                    // ❌ Do not auto-reconnect (prevents unwanted notifications)
                    if (!res.headersSent) {
                        res.json({ error: 'Connection closed, request again if needed' });
                    }
                }
            });

        } catch (err) {
            console.error('❌ Error:', err);
            removeFile('./temp/' + id);
            if (!res.headersSent) {
                res.json({ code: 'Service Currently Unavailable' });
            }
        }
    }

    return PAIR_CODE();
});

module.exports = router;