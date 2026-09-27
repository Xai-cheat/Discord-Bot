"use strict";
const { SlashCommandBuilder, PermissionFlagsBits, EmbedBuilder } = require("discord.js");
const { buildServer } = require("../lib/serverBuilder");

// Fixed, hand-picked templates — instant and free (no AI call), good as a
// reliable fallback or for anyone who just wants the common case fast.
const PRESETS = {
  roblox: {
    serverTheme: "Roblox community",
    roles: [
      { name: "Owner", color: "#ff5533", hoist: true, permissions: ["Administrator"] },
      { name: "Moderator", color: "#3ddc84", hoist: true, permissions: ["ManageMessages", "KickMembers", "ModerateMembers"] },
      { name: "Builder", color: "#ffcc00", hoist: true, permissions: [] },
      { name: "Scripter", color: "#4da6ff", hoist: true, permissions: [] },
      { name: "Member", color: "#99aab5", hoist: false, permissions: [] }
    ],
    categories: [
      { name: "📢 Info", channels: [
        { name: "welcome", type: "text", topic: "Start here." },
        { name: "rules", type: "text" },
        { name: "announcements", type: "announcement" }
      ]},
      { name: "💬 Community", channels: [
        { name: "general", type: "text" },
        { name: "off-topic", type: "text" },
        { name: "General Voice", type: "voice" }
      ]},
      { name: "🎮 Roblox", channels: [
        { name: "game-updates", type: "announcement" },
        { name: "showcase", type: "text", topic: "Share what you're building." },
        { name: "trading", type: "text" },
        { name: "looking-for-group", type: "text" },
        { name: "bug-reports", type: "text" }
      ]},
      { name: "🛠️ Dev Talk", channels: [
        { name: "scripting-help", type: "text" },
        { name: "building-help", type: "text" }
      ]},
      { name: "🔒 Staff", channels: [
        { name: "mod-chat", type: "text", private: true, roleHint: "Moderator" },
        { name: "mod-log", type: "text", private: true, roleHint: "Moderator" }
      ]}
    ]
  },
  gaming: {
    serverTheme: "General gaming community",
    roles: [
      { name: "Owner", color: "#ff5533", hoist: true, permissions: ["Administrator"] },
      { name: "Moderator", color: "#3ddc84", hoist: true, permissions: ["ManageMessages", "KickMembers", "ModerateMembers"] },
      { name: "Member", color: "#99aab5", hoist: false, permissions: [] }
    ],
    categories: [
      { name: "📢 Info", channels: [{ name: "welcome", type: "text" }, { name: "rules", type: "text" }, { name: "announcements", type: "announcement" }]},
      { name: "💬 Community", channels: [{ name: "general", type: "text" }, { name: "memes", type: "text" }, { name: "General Voice", type: "voice" }]},
      { name: "🎮 Gaming", channels: [{ name: "looking-for-group", type: "text" }, { name: "clips-and-highlights", type: "text" }, { name: "Gaming Voice 1", type: "voice" }, { name: "Gaming Voice 2", type: "voice" }]}
    ]
  },
  study: {
    serverTheme: "Study group",
    roles: [
      { name: "Organizer", color: "#ff5533", hoist: true, permissions: ["Administrator"] },
      { name: "Helper", color: "#3ddc84", hoist: true, permissions: ["ManageMessages"] },
      { name: "Student", color: "#99aab5", hoist: false, permissions: [] }
    ],
    categories: [
      { name: "📢 Info", channels: [{ name: "welcome", type: "text" }, { name: "announcements", type: "announcement" }]},
      { name: "📚 Study", channels: [{ name: "general-help", type: "text" }, { name: "resources", type: "text" }, { name: "Study Voice", type: "voice" }]},
      { name: "💬 Community", channels: [{ name: "off-topic", type: "text" }]}
    ]
  }
};

module.exports = {
  data: new SlashCommandBuilder()
    .setName("setup")
    .setDescription("Instantly build a ready-made channel/role layout — no AI needed.")
    .addStringOption((opt) =>
      opt
        .setName("preset")
        .setDescription("Which layout to build")
        .setRequired(true)
        .addChoices(
          { name: "Roblox community", value: "roblox" },
          { name: "General gaming", value: "gaming" },
          { name: "Study group", value: "study" }
        )
    )
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild),

  async execute(interaction) {
    const key = interaction.options.getString("preset", true);
    const plan = PRESETS[key];
    await interaction.deferReply();

    const result = await buildServer(interaction.guild, plan);

    const embed = new EmbedBuilder()
      .setTitle("Server built ✅")
      .setDescription(`**Preset:** ${result.serverTheme}`)
      .addFields(
        { name: "Roles", value: String(result.rolesCreated), inline: true },
        { name: "Categories", value: String(result.categoriesCreated), inline: true },
        { name: "Channels", value: String(result.channelsCreated), inline: true }
      )
      .setColor(0x3ddc84);

    if (result.errors.length) {
      embed.addFields({ name: `⚠️ ${result.errors.length} item(s) skipped`, value: result.errors.slice(0, 6).join("\n").slice(0, 1024) });
      embed.setColor(0xffcc00);
    }

    await interaction.editReply({ embeds: [embed] });
  }
};
