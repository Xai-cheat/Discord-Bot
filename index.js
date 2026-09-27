"use strict";
require("dotenv").config();
const fs = require("fs");
const path = require("path");
const { Client, GatewayIntentBits, Collection, Events } = require("discord.js");
const { recordJoin } = require("./lib/antiraidEngine");

if (!process.env.DISCORD_TOKEN) {
  console.error("Missing DISCORD_TOKEN in .env — see .env.example.");
  process.exit(1);
}

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMembers // required to see joins for anti-raid
  ]
});

client.commands = new Collection();
const commandsDir = path.join(__dirname, "commands");
for (const file of fs.readdirSync(commandsDir).filter((f) => f.endsWith(".js"))) {
  const command = require(path.join(commandsDir, file));
  if (command && command.data && command.execute) {
    client.commands.set(command.data.name, command);
  } else {
    console.warn(`Skipping ${file}: missing "data" or "execute" export.`);
  }
}

client.once(Events.ClientReady, (c) => {
  console.log(`Logged in as ${c.user.tag}. Serving ${c.guilds.cache.size} server(s).`);
});

client.on(Events.InteractionCreate, async (interaction) => {
  if (!interaction.isChatInputCommand()) return;
  const command = client.commands.get(interaction.commandName);
  if (!command) return;

  try {
    await command.execute(interaction);
  } catch (err) {
    console.error(`Error running /${interaction.commandName}:`, err);
    const payload = { content: "Something went wrong running that command.", ephemeral: true };
    if (interaction.deferred || interaction.replied) {
      await interaction.editReply(payload).catch(() => {});
    } else {
      await interaction.reply(payload).catch(() => {});
    }
  }
});

client.on(Events.GuildMemberAdd, (member) => {
  recordJoin(member).catch((e) => console.error("Anti-raid error:", e));
});

client.login(process.env.DISCORD_TOKEN);
