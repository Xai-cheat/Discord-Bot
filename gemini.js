"use strict";
/**
 * Thin wrapper around the Gemini API's generateContent endpoint.
 * Asks for strict JSON back (responseMimeType) so we don't have to
 * scrape a chat-style reply for a code block.
 */

const MODEL = process.env.GEMINI_MODEL || "gemini-3.1-flash-lite";
const ENDPOINT = `https://generativelanguage.googleapis.com/v1beta/models/${MODEL}:generateContent`;

const SYSTEM_INSTRUCTIONS = `You design Discord server layouts. Given a short description of a community,
output a JSON plan for categories, channels and roles that fit it well.

Rules:
- Reply with ONLY the JSON object. No prose, no markdown fences.
- 3 to 7 categories. Each category: 2 to 6 channels. Don't overbuild — favor a clean, usable layout over an exhaustive one.
- Channel "type" must be one of: "text", "voice", "announcement", "forum".
- Include practical channels: a welcome/rules area, general chat, topic-specific channels for the community's actual subject matter, and at least one voice channel.
- 3 to 6 roles, ordered from most to least powerful. Give each a reasonable hex color and a short permission list.
- Valid permission names (use these exact strings only): Administrator, ManageGuild, ManageRoles, ManageChannels, KickMembers, BanMembers, ManageMessages, ManageNicknames, ModerateMembers, MentionEveryone, ManageWebhooks, ManageEvents, ManageThreads.
- A channel MAY set "private": true with a "roleHint" naming which role (by the exact name you gave it above) should be the only one besides admins who can see it. Use this sparingly, e.g. for a staff-only channel.
- Match the tone/subject of the description — e.g. a Roblox community should have channels like game updates, trading/showcase, bug reports, LFG, and roles like Builder/Scripter/VIP where relevant. Don't force this template on unrelated communities.

Output shape (exactly these fields):
{
  "serverTheme": "one short phrase describing the layout you made",
  "roles": [ { "name": string, "color": "#RRGGBB", "hoist": boolean, "permissions": string[] } ],
  "categories": [ { "name": string, "channels": [ { "name": string, "type": "text"|"voice"|"announcement"|"forum", "topic": string, "private": boolean, "roleHint": string|null } ] } ]
}`;

/**
 * @param {string} description - what the user asked for, e.g. "a Roblox trading community"
 * @returns {Promise<object>} parsed plan matching the schema above
 */
async function generateServerPlan(description) {
  if (!process.env.GEMINI_API_KEY) {
    throw new Error("GEMINI_API_KEY is not set. Add it to your .env file.");
  }

  const body = {
    systemInstruction: { parts: [{ text: SYSTEM_INSTRUCTIONS }] },
    contents: [{ role: "user", parts: [{ text: `Community description: ${description}` }] }],
    generationConfig: {
      responseMimeType: "application/json",
      temperature: 0.8
    }
  };

  const res = await fetch(ENDPOINT, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-goog-api-key": process.env.GEMINI_API_KEY
    },
    body: JSON.stringify(body)
  });

  if (!res.ok) {
    const errText = await res.text().catch(() => "");
    throw new Error(`Gemini API error ${res.status}: ${errText.slice(0, 300)}`);
  }

  const data = await res.json();
  const text = data && data.candidates && data.candidates[0] &&
    data.candidates[0].content && data.candidates[0].content.parts &&
    data.candidates[0].content.parts[0] && data.candidates[0].content.parts[0].text;

  if (!text) throw new Error("Gemini returned no content. Try rephrasing your description.");

  let plan;
  try {
    plan = JSON.parse(text);
  } catch (e) {
    throw new Error("Gemini's response wasn't valid JSON. Try again — this happens occasionally.");
  }
  return plan;
}

module.exports = { generateServerPlan };
