"use strict";
const { SlashCommandBuilder, PermissionFlagsBits, EmbedBuilder } = require("discord.js");
const { generateServerPlan } = require("../lib/gemini");
const { buildServer } = require("../lib/serverBuilder");

module.exports = {
  data: new SlashCommandBuilder()
    .setName("build")
    .setDescription("Describe any community and the AI builds the channels, categories and roles for it.")
    .addStringOption((opt) =>
      opt
        .setName("description")
        .setDescription('e.g. "a Roblox trading and building community" or "a study group for college students"')
        .setRequired(true)
        .setMaxLength(300)
    )
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild),

  async execute(interaction) {
    const description = interaction.options.getString("description", true);
    await interaction.deferReply();

    let plan;
    try {
      plan = await generateServerPlan(description);
    } catch (e) {
      await interaction.editReply(`Couldn't generate a plan: ${e.message}`);
      return;
    }

    const result = await buildServer(interaction.guild, plan);

    const embed = new EmbedBuilder()
      .setTitle("Server built ✅")
      .setDescription(result.serverTheme ? `**Theme:** ${result.serverTheme}` : null)
      .addFields(
        { name: "Roles", value: String(result.rolesCreated), inline: true },
        { name: "Categories", value: String(result.categoriesCreated), inline: true },
        { name: "Channels", value: String(result.channelsCreated), inline: true }
      )
      .setColor(0x3ddc84)
      .setFooter({ text: `Requested: "${description}"` });

    if (result.errors.length) {
      embed.addFields({
        name: `⚠️ ${result.errors.length} item(s) skipped`,
        value: result.errors.slice(0, 6).join("\n").slice(0, 1024)
      });
      embed.setColor(0xffcc00);
    }

    await interaction.editReply({ embeds: [embed] });
  }
};
