"use strict";
const { GuildVerificationLevel, PermissionFlagsBits, ChannelType, EmbedBuilder } = require("discord.js");
const { getGuild, updateGuild } = require("./store");

// join timestamps kept in memory only (not persisted — a raid is a live event,
// nothing useful survives a bot restart mid-raid anyway)
const joinLog = new Map(); // guildId -> number[] (timestamps)
const revertTimers = new Map(); // guildId -> Timeout

const RAID_LOCK_MINUTES = 15;

function findAlertChannel(guild, preferredId) {
  if (preferredId) {
    const ch = guild.channels.cache.get(preferredId);
    if (ch && ch.isTextBased()) return ch;
  }
  return guild.channels.cache.find(
    (c) =>
      c.type === ChannelType.GuildText &&
      c.permissionsFor(guild.members.me)?.has(PermissionFlagsBits.SendMessages)
  );
}

async function sendAlert(guild, cfg, title, description, color) {
  const channel = findAlertChannel(guild, cfg.logChannelId);
  if (!channel) return;
  const modRole = guild.roles.cache.find((r) =>
    /mod|admin|staff/i.test(r.name) && r.mentionable
  );
  const embed = new EmbedBuilder().setTitle(title).setDescription(description).setColor(color).setTimestamp();
  try {
    await channel.send({ content: modRole ? `${modRole}` : undefined, embeds: [embed] });
  } catch (e) {
    console.error("Anti-raid: couldn't send alert:", e.message);
  }
}

async function triggerRaidMode(guild, cfg) {
  const previousLevel = guild.verificationLevel;
  updateGuild(guild.id, (g) => {
    g.antiraid.lockedUntil = Date.now() + RAID_LOCK_MINUTES * 60000;
    g.antiraid.previousVerificationLevel = previousLevel;
  });

  try {
    await guild.setVerificationLevel(GuildVerificationLevel.VeryHigh, "Anti-raid: rapid join burst detected");
  } catch (e) {
    console.error("Anti-raid: couldn't raise verification level:", e.message);
  }

  await sendAlert(
    guild,
    cfg,
    "🚨 Raid protection triggered",
    `Detected ${cfg.threshold}+ joins within ${Math.round(cfg.windowMs / 1000)}s.\n` +
      `Verification level raised to **Highest** for ${RAID_LOCK_MINUTES} minutes.\n` +
      `Use \`/antiraid action:status\` to check, or \`/lockdown action:lock\` to also freeze all channels.`,
    0xff3b30
  );

  clearTimeout(revertTimers.get(guild.id));
  const t = setTimeout(() => revertRaidMode(guild), RAID_LOCK_MINUTES * 60000);
  revertTimers.set(guild.id, t);
}

async function revertRaidMode(guild) {
  const g = getGuild(guild.id);
  const prev = g.antiraid.previousVerificationLevel;
  updateGuild(guild.id, (gg) => { gg.antiraid.lockedUntil = 0; });
  if (prev === undefined || prev === null) return;
  try {
    await guild.setVerificationLevel(prev, "Anti-raid: cooldown expired, reverting");
  } catch (e) {
    console.error("Anti-raid: couldn't revert verification level:", e.message);
  }
}

/**
 * Call this from the guildMemberAdd event for every join, on every guild
 * (it no-ops instantly if anti-raid isn't enabled for that guild).
 */
async function recordJoin(member) {
  const guild = member.guild;
  const g = getGuild(guild.id);
  const cfg = g.antiraid;
  if (!cfg.enabled) return;

  const now = Date.now();
  const arr = joinLog.get(guild.id) || [];
  arr.push(now);
  const cutoff = now - cfg.windowMs;
  const recent = arr.filter((t) => t > cutoff);
  joinLog.set(guild.id, recent);

  const alreadyLocked = cfg.lockedUntil && cfg.lockedUntil > now;
  if (recent.length >= cfg.threshold && !alreadyLocked) {
    await triggerRaidMode(guild, cfg);
  }
}

module.exports = { recordJoin, triggerRaidMode, revertRaidMode, RAID_LOCK_MINUTES };
