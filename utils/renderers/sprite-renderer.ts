import { type EquipmentCategory, type RenderPartType, type InstrumentType } from '../parsers/itemdata-parser';
import { type OjsData, type OjsFrame } from '../parsers/ojs-parser';
import { type OpiFile } from '../parsers/opi-parser';

// The official rendering Z-layer order for O2Jam avatar composite drawing
export const RenderLayerOrder: { type: EquipmentCategory; part: RenderPartType }[] = [
  { type: "Costume", part: "Back" },
  { type: "Costume", part: "Body" },
  { type: "Costume", part: "LeftArm" },
  { type: "Costume", part: "RightArm" },
  { type: "Accessories", part: "Back" },
  { type: "Accessories", part: "Body" },
  { type: "Accessories", part: "LeftArm" },
  { type: "Accessories", part: "RightArm" },
  { type: "Wings", part: "Back" },
  { type: "Wings", part: "Body" },
  { type: "Wings", part: "LeftArm" },
  { type: "Wings", part: "RightArm" },
  { type: "Body", part: "Back" },
  { type: "Hair", part: "Back" },
  { type: "Top", part: "Back" },
  { type: "Body", part: "Body" },
  { type: "Body", part: "LeftArm" },
  { type: "Body", part: "RightArm" },
  { type: "Shoes", part: "Back" },
  { type: "Shoes", part: "Body" },
  { type: "Shoes", part: "LeftArm" },
  { type: "Shoes", part: "RightArm" },
  { type: "Pants", part: "Back" },
  { type: "Pants", part: "Body" },
  { type: "Pants", part: "LeftArm" },
  { type: "Pants", part: "RightArm" },
  { type: "ClothesAccessories", part: "Back" },
  { type: "ClothesAccessories", part: "Body" },
  { type: "ClothesAccessories", part: "LeftArm" },
  { type: "ClothesAccessories", part: "RightArm" },
  { type: "LeftArm", part: "Back" },
  { type: "LeftArm", part: "Body" },
  { type: "LeftArm", part: "LeftArm" },
  { type: "LeftArm", part: "RightArm" },
  { type: "Keyboard", part: "Back" },
  { type: "Keyboard", part: "Body" },
  { type: "Keyboard", part: "LeftArm" },
  { type: "Keyboard", part: "RightArm" },
  { type: "Top", part: "Body" },
  { type: "Top", part: "LeftArm" },
  { type: "Bass", part: "Back" },
  { type: "Bass", part: "Body" },
  { type: "Bass", part: "LeftArm" },
  { type: "Bass", part: "RightArm" },
  { type: "Guitar", part: "Back" },
  { type: "Guitar", part: "Body" },
  { type: "Guitar", part: "LeftArm" },
  { type: "Guitar", part: "RightArm" },
  { type: "RightArm", part: "Back" },
  { type: "RightArm", part: "Body" },
  { type: "RightArm", part: "LeftArm" },
  { type: "RightArm", part: "RightArm" },
  { type: "Top", part: "RightArm" },
  { type: "Necklace", part: "Back" },
  { type: "Necklace", part: "Body" },
  { type: "Necklace", part: "LeftArm" },
  { type: "Necklace", part: "RightArm" },
  { type: "LeftHand", part: "Back" },
  { type: "LeftHand", part: "Body" },
  { type: "LeftHand", part: "LeftArm" },
  { type: "LeftHand", part: "RightArm" },
  { type: "RightHand", part: "Back" },
  { type: "RightHand", part: "Body" },
  { type: "RightHand", part: "LeftArm" },
  { type: "RightHand", part: "RightArm" },
  { type: "Gloves", part: "Back" },
  { type: "Gloves", part: "Body" },
  { type: "Gloves", part: "LeftArm" },
  { type: "Gloves", part: "RightArm" },
  { type: "Face", part: "Back" },
  { type: "Face", part: "Body" },
  { type: "Face", part: "LeftArm" },
  { type: "Face", part: "RightArm" },
  { type: "Earrings", part: "Back" },
  { type: "Earrings", part: "Body" },
  { type: "Earrings", part: "LeftArm" },
  { type: "Earrings", part: "RightArm" },
  { type: "Glasses", part: "Back" },
  { type: "Glasses", part: "Body" },
  { type: "Glasses", part: "LeftArm" },
  { type: "Glasses", part: "RightArm" },
  { type: "Hair", part: "Body" },
  { type: "Hair", part: "LeftArm" },
  { type: "Hair", part: "RightArm" },
  { type: "HairAccessories", part: "Back" },
  { type: "HairAccessories", part: "Body" },
  { type: "HairAccessories", part: "LeftArm" },
  { type: "HairAccessories", part: "RightArm" },
  { type: "Drum", part: "Back" },
  { type: "Drum", part: "Body" },
  { type: "Drum", part: "LeftArm" },
  { type: "Drum", part: "RightArm" },
  { type: "InstrumentAccessories", part: "Back" },
  { type: "InstrumentAccessories", part: "Body" },
  { type: "InstrumentAccessories", part: "LeftArm" },
  { type: "InstrumentAccessories", part: "RightArm" },
  { type: "Pet", part: "Back" },
  { type: "Pet", part: "Body" },
  { type: "Pet", part: "LeftArm" },
  { type: "Pet", part: "RightArm" }
];

export interface EquippedItemInfo {
  id: number;
  type: EquipmentCategory;
  // references grouped by key: renderPart_instrument_gender
  // maps to OPI file content or parsed OjsData
  fileRefs: Record<string, string>; 
}

// Global parsed Ojs cache to prevent decoding on every frame redraw
const parsedOjsCache = new Map<string, OjsData>();

import { parseOjs } from '../parsers/ojs-parser';

export function getParsedSprite(fileName: string, archiveFiles: Record<string, OpiFile>): OjsData | null {
  const cacheKey = fileName.toLowerCase();
  if (parsedOjsCache.has(cacheKey)) {
    return parsedOjsCache.get(cacheKey) || null;
  }

  const archiveFile = archiveFiles[cacheKey];
  if (!archiveFile) return null;

  try {
    const ojs = parseOjs(archiveFile.data, archiveFile.name);
    parsedOjsCache.set(cacheKey, ojs);
    return ojs;
  } catch (err) {
    console.error(`Failed to parse Ojs file: ${fileName}`, err);
    return null;
  }
}

export function clearParsedSpriteCache() {
  parsedOjsCache.clear();
}

// Main composite drawer
export function drawAvatar(
  ctx: CanvasRenderingContext2D,
  width: number,
  height: number,
  equipped: Record<EquipmentCategory, EquippedItemInfo | null>,
  gender: "Male" | "Female",
  instrument: InstrumentType,
  frameTick: number, // global synchronized frame count
  originX = 128,
  originY = 200
) {
  // Clear canvas viewport
  ctx.clearRect(0, 0, width, height);

  // Check if costume is equipped
  const costumeEquipped = !!equipped["Costume"];

  for (const layer of RenderLayerOrder) {
    let type = layer.type;
    const part = layer.part;

    // Costume hiding logic: If costume is equipped, hide body clothes like Top, Pants, Shoes
    if (costumeEquipped && (type === "Top" || type === "Pants" || type === "Shoes")) {
      continue;
    }

    // Special layer swap priority if playing Keyboard
    if (instrument === "Keyboard") {
      if (type === "LeftArm" && part === "Body") {
        type = "Top";
      } else if (type === "Top" && part === "Body") {
        type = "LeftArm";
      }
    }

    const item = equipped[type];
    if (!item) continue;

    // Resolve reference file key: e.g. "Body_None_Female"
    const refKey = `${part}_${instrument}_${gender}`.toLowerCase();
    
    // Fallback references: if specific instrument animation is not found, fallback to "None" instrument
    let spriteFileName = item.fileRefs[refKey];
    if (!spriteFileName && instrument !== "None") {
      const fallbackKey = `${part}_None_${gender}`.toLowerCase();
      spriteFileName = item.fileRefs[fallbackKey];
    }

    // Secondary fallback: check "Any" gender mapping if specific gender is empty
    if (!spriteFileName) {
      const fallbackGenderKey = `${part}_${instrument}_Any`.toLowerCase();
      spriteFileName = item.fileRefs[fallbackGenderKey];
    }
    if (!spriteFileName && instrument !== "None") {
      const fallbackAnyKey = `${part}_None_Any`.toLowerCase();
      spriteFileName = item.fileRefs[fallbackAnyKey];
    }

    if (!spriteFileName) continue;

    // Get parsed OjsData
    // We resolve it using the Nuxt global archive state
    const useAvatarState = () => {
      // In Nuxt, we can retrieve archive files from global states
      return (window as any).__O2JAM_ARCHIVE_FILES__ || {};
    };
    
    const archiveFiles = useAvatarState();
    const ojs = getParsedSprite(spriteFileName, archiveFiles);
    if (!ojs || ojs.frameCount === 0) continue;

    // Select the current frame of the animation
    const frameIndex = frameTick % ojs.frameCount;
    const frame = ojs.frames[frameIndex];

    if (frame && frame.canvas && frame.width > 0 && frame.height > 0) {
      ctx.imageSmoothingEnabled = false;
      
      // Draw composite layer: translate by origin plus frame offset
      ctx.drawImage(
        frame.canvas,
        originX + frame.x,
        originY + frame.y
      );
    }

    // Costume termination layer: Costume Body terminates rendering of layers below it
    if (type === "Costume" && part === "Body") {
      break;
    }
  }
}
