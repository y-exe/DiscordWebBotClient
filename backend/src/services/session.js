const { Client: SelfClient } = require('discord.js-selfbot-v13');
let BotClient, GatewayIntentBits, Partials;
try {
    const Discord = require('discord.js');
    BotClient = Discord.Client;
    GatewayIntentBits = Discord.GatewayIntentBits;
    Partials = Discord.Partials;
} catch (e) { }

const sessions = new Map();
const loginQueue = new Set();

const destroySession = (id) => {
    const client = sessions.get(id);
    if (client) {
        console.log(`[System] Clearing session: ${id}`);
        try {
            if (typeof client.removeAllListeners === 'function') client.removeAllListeners();
            client.destroy();
        } catch (e) { }
        sessions.delete(id);
    }
    loginQueue.delete(id);
};

module.exports = {
    BotClient,
    SelfClient,
    GatewayIntentBits,
    Partials,
    sessions,
    loginQueue,
    destroySession
};
