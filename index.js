require('dotenv').config();
const { Client, GatewayIntentBits } = require('discord.js');
const { joinVoiceChannel, getVoiceConnection, VoiceConnectionStatus, entersState } = require('@discordjs/voice');

const PREFIX = process.env.PREFIX || '!';
const raw = process.env.TOKENS || '';
const tokens = raw.split(',').map(t => t.trim()).filter(Boolean);

if (tokens.length === 0) {
  console.error('HATA: TOKENS environment variable boş.');
  process.exit(1);
}

console.log(`${tokens.length} bot başlatılıyor...`);

for (const token of tokens) {
  const client = new Client({
    intents: [
      GatewayIntentBits.Guilds,
      GatewayIntentBits.GuildMessages,
      GatewayIntentBits.MessageContent,
      GatewayIntentBits.GuildVoiceStates
    ]
  });

  client.once('ready', () => {
    console.log(`[OK] ${client.user.tag} hazır`);
  });

  client.on('messageCreate', async (msg) => {
    if (msg.author.bot) return;
    if (!msg.content.startsWith(PREFIX)) return;

    const args = msg.content.slice(PREFIX.length).trim().split(/\s+/);
    const cmd = args[0]?.toLowerCase();

    if (cmd === 'ses' && args[1]?.toLowerCase() === 'gir') {
      const vc = msg.member?.voice?.channel;
      if (!vc) return msg.reply('Önce bir sesli kanala gir.');

      try {
        const existing = getVoiceConnection(vc.guild.id);
        if (existing) existing.destroy();

        const connect = () => joinVoiceChannel({
          channelId: vc.id,
          guildId: vc.guild.id,
          adapterCreator: vc.guild.voiceAdapterCreator,
          selfDeaf: false,
          selfMute: true
        });

        const conn = connect();

        conn.on(VoiceConnectionStatus.Disconnected, async () => {
          try {
            await Promise.race([
              entersState(conn, VoiceConnectionStatus.Signalling, 5000),
              entersState(conn, VoiceConnectionStatus.Connecting, 5000)
            ]);
          } catch {
            conn.destroy();
            connect();
          }
        });

        console.log(`[JOIN] ${client.user.tag} -> ${vc.name}`);
      } catch (e) {
        console.error(`[HATA] ${client.user.tag}:`, e.message);
      }
    }

    if (cmd === 'ses' && (args[1]?.toLowerCase() === 'çık' || args[1]?.toLowerCase() === 'cik')) {
      const conn = getVoiceConnection(msg.guild.id);
      if (conn) {
        conn.destroy();
        msg.reply('Çıktım.');
      }
    }
  });

  client.on('error', (e) => console.error(`[CLIENT ERROR] ${e.message}`));

  client.login(token).catch(err => console.error(`Token hatalı: ${err.message}`));
}

process.on('unhandledRejection', (e) => console.error('Unhandled:', e));
