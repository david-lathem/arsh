require("dotenv").config();
const { Client, IntentsBitField, Partials } = require("discord.js");
const eventHandler = require("./handlers/eventHandler");

const client = new Client({
  intents: [
    IntentsBitField.Flags.Guilds,
    IntentsBitField.Flags.GuildMembers,
    IntentsBitField.Flags.GuildMessages,
    IntentsBitField.Flags.DirectMessages,
    IntentsBitField.Flags.MessageContent, // needed to read message content
  ],
  partials: [Partials.Message, Partials.Channel, Partials.Reaction], // Add Channel to handle DMs
});

eventHandler(client);

client.login(process.env.TOKEN);
