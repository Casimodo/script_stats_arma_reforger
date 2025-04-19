const fs = require('fs');
const path = require('path');
const axios = require('axios');

// Lecture du fichier de config
const config = JSON.parse(fs.readFileSync('./config.json', 'utf8'));

// Fonction utilitaire pour lire les fichiers JSON
function readJsonFiles(directory) {
  const files = fs.readdirSync(directory).filter(f => f.endsWith('.json'));
  return files.map(file => {
    const content = fs.readFileSync(path.join(directory, file), 'utf8');
    try {
      return JSON.parse(content);
    } catch (e) {
      console.error(`Erreur dans le fichier ${file}: ${e.message}`);
      return null;
    }
  }).filter(Boolean);
}

// Formater le message Discord
function formatDiscordMessage(serverName, players) {
  const header = `📊 **Statistiques - ${serverName}**\n\n`;
  const tableHeader = `\`\`\`md\n# Joueur                  | Kills | Deaths | Ratio\n--------------------------------------------\n`;
  const tableRows = players.map(p =>
    `${p.CM_PlayerName.padEnd(25)} | ${p.CM_PlayerKillCount.toString().padEnd(5)} | ${p.CM_PlayerDeathCount.toString().padEnd(6)} | ${p.CM_PlayerKDRatio.toFixed(2)}`
  ).join('\n');
  const tableFooter = `\`\`\``;

  return header + tableHeader + tableRows + '\n' + tableFooter;
}

// Envoi du message à Discord
async function sendToDiscord(content) {
  try {
    await axios.post(config.discordWebhookUrl, { content });
    console.log(`[✔] Statistiques envoyées à Discord`);
  } catch (err) {
    console.error(`[✖] Échec de l'envoi à Discord : ${err.message}`);
  }
}

// Traitement d’un serveur
function processServer(server) {
  const data = readJsonFiles(server.directory);
  if (!data.length) return;

  const sorted = data.sort((a, b) => b.CM_PlayerKDRatio - a.CM_PlayerKDRatio);
  const message = formatDiscordMessage(server.name, sorted);
  sendToDiscord(message);
}

// Boucle de scan pour chaque serveur
config.servers.forEach(server => {
  console.log(`📡 Surveillance du dossier "${server.directory}" toutes les ${server.interval} secondes...`);
  processServer(server); // appel immédiat
  setInterval(() => processServer(server), server.interval * 1000);
});
