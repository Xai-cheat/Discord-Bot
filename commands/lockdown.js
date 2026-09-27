"use strict";
const { SlashCommandBuilder, PermissionFlagsBits, ChannelType } = require("discord.js");

module.exports = {
  data: new SlashCommandBuilder()
    .setName("lockdown")
    .setDescription("Manual panic button: instantly freeze or unfreeze every text channel.")
    .addStringOption((opt) =>
      opt
        .setName("action")
        .setDescription("lock or unlock")
        .setRequired(true)
        .addChoices({ name: "lock", value: "lock" }, { name: "unlock", value: "unlock" })
    )
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild),

  async execute(interaction) {
    const action = interaction.options.getString("action", true);
    await interaction.deferReply();

    const everyone = interaction.guild.roles.everyone;
    const textChannels = interaction.guild.channels.cache.filter((c) => c.type === ChannelType.GuildText);

    let changed = 0, failed = 0;
    for (const [, ch] of textChannels) {
      try {
        await ch.permissionOverwrites.edit(everyone, {
          SendMessages: action === "lock" ? false : null
        });
        changed++;
      } catch (e) {
        failed++;
      }
    }

    await interaction.editReply(
      action === "lock"
        ? `🔒 Locked **${changed}** text channels.${failed ? ` (${failed} couldn't be changed — check my permissions.)` : ""}`
        : `🔓 Unlocked **${changed}** text channels.${failed ? ` (${failed} couldn't be changed.)` : ""}`
    );
  }
};
