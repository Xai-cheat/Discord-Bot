"use strict";
require("dotenv").config();
const fs = require("fs");
const path = require("path");
const { REST, Routes } = require("discord.js");

const required = ["DISCORD_TOKEN", "DISCORD_CLIENT_ID"];
for (const key of required) {
  if (!process.env[key]) {
    console.error(`Missing ${key} in .env — see .env.example.`);
    process.exit(1);
  }
}

const commands = [];
const commandsDir = path.join(__dirname, "commands");
for (const file of fs.readdirSync(commandsDir).filter((f) => f.endsWith(".js"))) {
  const command = require(path.join(commandsDir, file));
  if (command && command.data) commands.push(command.data.toJSON());
}

const rest = new REST().setToken(process.env.DISCORD_TOKEN);

(async () => {
  try {
    const guildId = process.env.DISCORD_GUILD_ID;
    const route = guildId
      ? Routes.applicationGuildCommands(process.env.DISCORD_CLIENT_ID, guildId)
      : Routes.applicationCommands(process.env.DISCORD_CLIENT_ID);

    console.log(`Deploying ${commands.length} command(s) ${guildId ? `to guild ${guildId}` : "globally"}...`);
    await rest.put(route, { body: commands });
    console.log("Done." + (guildId ? "" : " Global commands can take up to ~1 hour to appear everywhere."));
  } catch (err) {
    console.error(err);
    process.exit(1);
  }
})();
