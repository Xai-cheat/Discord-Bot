"use strict";
const { ChannelType, PermissionFlagsBits } = require("discord.js");

// Hard caps so a runaway or adversarial AI response can never try to
// spam-create hundreds of channels/roles and get the bot rate-limited or banned.
const LIMITS = { maxCategories: 8, maxChannelsPerCategory: 6, maxRoles: 8 };

const CHANNEL_TYPE_MAP = {
  text: ChannelType.GuildText,
  voice: ChannelType.GuildVoice,
  announcement: ChannelType.GuildAnnouncement,
  forum: ChannelType.GuildForum
};

const PERMISSION_MAP = {
  Administrator: PermissionFlagsBits.Administrator,
  ManageGuild: PermissionFlagsBits.ManageGuild,
  ManageRoles: PermissionFlagsBits.ManageRoles,
  ManageChannels: PermissionFlagsBits.ManageChannels,
  KickMembers: PermissionFlagsBits.KickMembers,
  BanMembers: PermissionFlagsBits.BanMembers,
  ManageMessages: PermissionFlagsBits.ManageMessages,
  ManageNicknames: PermissionFlagsBits.ManageNicknames,
  ModerateMembers: PermissionFlagsBits.ModerateMembers,
  MentionEveryone: PermissionFlagsBits.MentionEveryone,
  ManageWebhooks: PermissionFlagsBits.ManageWebhooks,
  ManageEvents: PermissionFlagsBits.ManageEvents,
  ManageThreads: PermissionFlagsBits.ManageThreads
};

function permsToBitfield(names) {
  if (!Array.isArray(names)) return 0n;
  let bits = 0n;
  for (const n of names) if (PERMISSION_MAP[n]) bits |= PERMISSION_MAP[n];
  return bits;
}

function sanitizePlan(rawPlan) {
  const plan = rawPlan || {};
  const roles = (Array.isArray(plan.roles) ? plan.roles : []).slice(0, LIMITS.maxRoles).map((r) => ({
    name: String(r && r.name || "Role").slice(0, 90),
    color: (r && /^#([0-9a-fA-F]{6})$/.test(r.color)) ? r.color : "#99aab5",
    hoist: !!(r && r.hoist),
    permissions: Array.isArray(r && r.permissions) ? r.permissions : []
  }));

  const categories = (Array.isArray(plan.categories) ? plan.categories : [])
    .slice(0, LIMITS.maxCategories)
    .map((c) => ({
      name: String(c && c.name || "Category").slice(0, 90),
      channels: (Array.isArray(c && c.channels) ? c.channels : [])
        .slice(0, LIMITS.maxChannelsPerCategory)
        .map((ch) => ({
          name: String(ch && ch.name || "channel").toLowerCase().replace(/\s+/g, "-").slice(0, 90),
          type: CHANNEL_TYPE_MAP[ch && ch.type] !== undefined ? ch.type : "text",
          topic: ch && ch.topic ? String(ch.topic).slice(0, 1024) : undefined,
          private: !!(ch && ch.private),
          roleHint: ch && ch.roleHint ? String(ch.roleHint) : null
        }))
    }));

  return { serverTheme: plan.serverTheme ? String(plan.serverTheme).slice(0, 200) : null, roles, categories };
}

/**
 * Creates the roles/categories/channels described by `plan` inside `guild`.
 * Runs sequentially (not Promise.all) to stay comfortably under Discord's rate limits
 * on guilds with a lot of channels being created at once.
 * @returns {Promise<{rolesCreated:number, categoriesCreated:number, channelsCreated:number, errors:string[]}>}
 */
async function buildServer(guild, rawPlan) {
  const plan = sanitizePlan(rawPlan);
  const errors = [];
  const roleByName = new Map();

  for (const r of plan.roles) {
    try {
      const role = await guild.roles.create({
        name: r.name,
        color: r.color,
        hoist: r.hoist,
        permissions: permsToBitfield(r.permissions),
        reason: "AI server build"
      });
      roleByName.set(r.name.toLowerCase(), role);
    } catch (e) {
      errors.push(`Role "${r.name}": ${e.message}`);
    }
  }

  let categoriesCreated = 0, channelsCreated = 0;
  for (const cat of plan.categories) {
    let category;
    try {
      category = await guild.channels.create({
        name: cat.name,
        type: ChannelType.GuildCategory,
        reason: "AI server build"
      });
      categoriesCreated++;
    } catch (e) {
      errors.push(`Category "${cat.name}": ${e.message}`);
      continue;
    }

    for (const ch of cat.channels) {
      try {
        const overwrites = [];
        if (ch.private) {
          overwrites.push({ id: guild.roles.everyone.id, deny: [PermissionFlagsBits.ViewChannel] });
          const hintRole = ch.roleHint && roleByName.get(ch.roleHint.toLowerCase());
          if (hintRole) overwrites.push({ id: hintRole.id, allow: [PermissionFlagsBits.ViewChannel] });
        }
        await guild.channels.create({
          name: ch.name,
          type: CHANNEL_TYPE_MAP[ch.type] !== undefined ? CHANNEL_TYPE_MAP[ch.type] : ChannelType.GuildText,
          parent: category.id,
          topic: ch.topic,
          permissionOverwrites: overwrites.length ? overwrites : undefined,
          reason: "AI server build"
        });
        channelsCreated++;
      } catch (e) {
        errors.push(`Channel "${ch.name}": ${e.message}`);
      }
    }
  }

  return {
    serverTheme: plan.serverTheme,
    rolesCreated: roleByName.size,
    categoriesCreated,
    channelsCreated,
    errors
  };
}

module.exports = { buildServer, sanitizePlan, LIMITS };
