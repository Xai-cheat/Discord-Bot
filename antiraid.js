"use strict";
const { SlashCommandBuilder, PermissionFlagsBits, EmbedBuilder, ChannelType } = require("discord.js");
const { getGuild, updateGuild } = require("../lib/store");

module.exports = {
  data: new SlashCommandBuilder()
    .setName("antiraid")
    .setDescription("Configure automatic raid protection.")
    .addStringOption((opt) =>
      opt
        .setName("action")
        .setDescription("What to do")
        .setRequired(true)
        .addChoices(
          { name: "enable", value: "enable" },
          { name: "disable", value: "disable" },
          { name: "status", value: "status" }
        )
    )
    .addIntegerOption((opt) =>
      opt.setName("threshold").setDescription("Joins that count as a raid (default 6)").setMinValue(3).setMaxValue(50)
    )
    .addIntegerOption((opt) =>
      opt.setName("window_seconds").setDescription("Time window in seconds (default 10)").setMinValue(3).setMaxValue(120)
    )
    .addChannelOption((opt) =>
      opt.setName("log_channel").setDescription("Where alerts are posted (default: first channel the bot can post in)").addChannelTypes(ChannelType.GuildText)
    )
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild),

  async execute(interaction) {
    const action = interaction.options.getString("action", true);
    const guildId = interaction.guild.id;

    if (action === "status") {
      const g = getGuild(guildId);
      const cfg = g.antiraid;
      const embed = new EmbedBuilder()
        .setTitle("Anti-raid status")
        .setColor(cfg.enabled ? 0x3ddc84 : 0x99aab5)
        .addFields(
          { name: "Enabled", value: cfg.enabled ? "Yes" : "No", inline: true },
          { name: "Threshold", value: `${cfg.threshold} joins`, inline: true },
          { name: "Window", value: `${cfg.windowMs / 1000}s`, inline: true },
          { name: "Currently locked", value: cfg.lockedUntil > Date.now() ? `Yes, until <t:${Math.floor(cfg.lockedUntil / 1000)}:T>` : "No" }
        );
      await interaction.reply({ embeds: [embed] });
      return;
    }

    const threshold = interaction.options.getInteger("threshold");
    const windowSeconds = interaction.options.getInteger("window_seconds");
    const logChannel = interaction.options.getChannel("log_channel");

    updateGuild(guildId, (g) => {
      g.antiraid.enabled = action === "enable";
      if (threshold) g.antiraid.threshold = threshold;
      if (windowSeconds) g.antiraid.windowMs = windowSeconds * 1000;
      if (logChannel) g.antiraid.logChannelId = logChannel.id;
    });

    const g = getGuild(guildId);
    await interaction.reply(
      action === "enable"
        ? `🛡️ Anti-raid **enabled**. Triggers at **${g.antiraid.threshold} joins / ${g.antiraid.windowMs / 1000}s**.`
        : "Anti-raid **disabled**."
    );
  }
};
