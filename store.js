"use strict";
/**
 * Tiny per-guild settings store, backed by a single JSON file.
 * Good enough for one bot on a handful of servers; swap for a real DB
 * if you outgrow this.
 */
const fs = require("fs");
const path = require("path");

const FILE = path.join(__dirname, "..", "data", "guilds.json");
let cache = null;
let saveTimer = null;

function load() {
  if (cache) return cache;
  try {
    cache = JSON.parse(fs.readFileSync(FILE, "utf8"));
  } catch (e) {
    cache = {};
  }
  return cache;
}

function saveSoon() {
  clearTimeout(saveTimer);
  saveTimer = setTimeout(() => {
    try {
      fs.mkdirSync(path.dirname(FILE), { recursive: true });
      fs.writeFileSync(FILE, JSON.stringify(cache, null, 2));
    } catch (e) {
      console.error("Failed to save data/guilds.json:", e.message);
    }
  }, 250);
}

const DEFAULTS = {
  antiraid: {
    enabled: false,
    threshold: 6,      // this many joins...
    windowMs: 10000,    // ...within this many ms triggers raid mode
    logChannelId: null,
    lockedUntil: 0
  }
};

function getGuild(guildId) {
  const data = load();
  if (!data[guildId]) data[guildId] = JSON.parse(JSON.stringify(DEFAULTS));
  if (!data[guildId].antiraid) data[guildId].antiraid = JSON.parse(JSON.stringify(DEFAULTS.antiraid));
  return data[guildId];
}

function updateGuild(guildId, patchFn) {
  const g = getGuild(guildId);
  patchFn(g);
  saveSoon();
  return g;
}

module.exports = { getGuild, updateGuild };
