import { convert } from "~/utils/parsers/ojn-parser";
import OJMParser from "~/utils/parsers/ojm-parser";
import { normalizeFailData } from "~/utils/helpers/search";
import type { ConvertedOJN, OjnDifficulty } from "~/types/dmjam";

/**
 * Downloads and parses a DMJam track (OJN + OJM + Fail data) dynamically from the API.
 */
export async function fetchAndParseDMJamTrack(
  musicCode: number,
  difficulty: OjnDifficulty
): Promise<ConvertedOJN> {
  const ojnUrl = `https://ojn-api.dmjam.net/ojn-api/o2ma${musicCode}.ojn`;
  const response = await fetch(ojnUrl);
  if (!response.ok) {
    throw new Error(`Failed to download chart (${response.status})`);
  }
  const arrayBuffer = await response.arrayBuffer();

  let hitSounds = {};
  try {
    const ojmUrl = `https://ojn-api.dmjam.net/ojn-api/o2ma${musicCode}.ojm`;
    const ojmResponse = await fetch(ojmUrl);
    if (ojmResponse.ok) {
      const ojmBuffer = await ojmResponse.arrayBuffer();
      hitSounds = OJMParser.parseContent(ojmBuffer);
    }
  } catch (err) {
    console.warn("Failed to fetch or parse OJM:", err);
  }

  let deathPoints = {};
  try {
    const failPayload = await $fetch(`/api/dmjam/fail/${musicCode}`);
    deathPoints = normalizeFailData(failPayload);
  } catch (err) {
    console.warn("Failed to fetch fail/death points:", err);
  }

  const converted = convert(arrayBuffer, deathPoints, hitSounds, difficulty);
  converted.rawOjnBuffer = arrayBuffer;
  converted.hitSounds = hitSounds;
  converted.deathPoints = deathPoints;

  return converted;
}
