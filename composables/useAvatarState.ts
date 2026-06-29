import { ref, watch } from 'vue';
import { parseOpi, type OpiFile } from '../utils/parsers/opi-parser';
import { parseItemData, type ItemMetadata, type EquipmentCategory, type InstrumentType } from '../utils/parsers/itemdata-parser';
import { type EquippedItemInfo, clearParsedSpriteCache } from '../utils/renderers/sprite-renderer';

// Global shared state refs so they survive hot reloads and page navigations
const isArchiveLoaded = ref(false);
const isLoading = ref(false);
const loadingProgress = ref('');
const itemsCatalog = ref<ItemMetadata[]>([]);
const equippedItems = ref<Record<EquipmentCategory, EquippedItemInfo | null>>({
  Body: null,
  LeftArm: null,
  RightArm: null,
  LeftHand: null,
  RightHand: null,
  Face: null,
  Hair: null,
  Glasses: null,
  Earrings: null,
  Necklace: null,
  ClothesAccessories: null,
  Accessories: null,
  Gloves: null,
  Pants: null,
  Shoes: null,
  Keyboard: null,
  Guitar: null,
  Drum: null,
  Bass: null,
  Top: null,
  Wings: null,
  InstrumentAccessories: null,
  Pet: null,
  HairAccessories: null,
  AttributiveItem: null,
  NicknameChanger: null,
  PenaltyResetter: null,
  BagExpansion: null,
  Costume: null
});

const gender = ref<"Male" | "Female">("Female");
const instrument = ref<InstrumentType>("None");
const frameTick = ref(0);

// Helper to convert item metadata references to flat file map
function createEquippedItemInfo(item: ItemMetadata): EquippedItemInfo {
  const fileRefs: Record<string, string> = {};
  for (const ref of item.references) {
    const key = `${ref.renderPart}_${ref.instrument}_${ref.gender}`.toLowerCase();
    fileRefs[key] = ref.ref;
  }
  return {
    id: item.id,
    type: item.type,
    fileRefs
  };
}

export function useAvatarState() {
  
  // Equip item helper
  const equipItem = (item: ItemMetadata) => {
    // Cannot equip attributes
    if (item.type === "AttributiveItem") return;

    // Gender check: only allow equipping matching gender items or universal items
    if (item.gender !== "Any" && item.gender !== gender.value) return;

    // Costume check: if equipping costume, clear other body clothes
    if (item.type === "Costume") {
      clearEquipments();
      equippedItems.value["Costume"] = createEquippedItemInfo(item);
    } else {
      // If costume is currently equipped, unequip it
      if (equippedItems.value["Costume"]) {
        equippedItems.value["Costume"] = null;
      }
      
      // Instruments conflict resolution: equipping one instrument clears others
      const instrumentCategories: EquipmentCategory[] = ["Keyboard", "Guitar", "Bass", "Drum"];
      if (instrumentCategories.includes(item.type)) {
        for (const type of instrumentCategories) {
          equippedItems.value[type] = null;
        }
        // Set instrument state
        if (item.type === "Keyboard") instrument.value = "Keyboard";
        else if (item.type === "Guitar") instrument.value = "Guitar";
        else if (item.type === "Bass") instrument.value = "Bass";
        else if (item.type === "Drum") instrument.value = "Drum";
      }

      // Equip item in its category slot
      equippedItems.value[item.type] = createEquippedItemInfo(item);
    }
  };

  // Unequip item helper
  const unequipItem = (type: EquipmentCategory) => {
    equippedItems.value[type] = null;
    
    // Clear instrument states if unequipping instrument
    const instrumentCategories: EquipmentCategory[] = ["Keyboard", "Guitar", "Bass", "Drum"];
    if (instrumentCategories.includes(type)) {
      instrument.value = "None";
    }
  };

  const clearEquipments = () => {
    clearParsedSpriteCache();
    const categories = Object.keys(equippedItems.value) as EquipmentCategory[];
    for (const cat of categories) {
      // Don't clear default body items
      if (["Body", "LeftArm", "RightArm", "LeftHand", "RightHand", "Face"].includes(cat)) {
        continue;
      }
      equippedItems.value[cat] = null;
    }
    instrument.value = "None";
  };

  // Equip default novice parts
  const equipDefaultBody = () => {
    const defaultIds = [
      30, // Default BODY
      31, // Default LEFTARM
      32, // Default LEFTHAND
      33, // Default RIGHTARM
      34, // Drum sticks (RIGHTHAND)
      gender.value === "Female" ? 36 : 35 // Novice Face
    ];

    defaultIds.forEach(id => {
      const item = itemsCatalog.value.find(x => x.id === id);
      if (item) {
        equipItem(item);
      }
    });
  };

  // Load Avatar.opa and parse item catalog from uploaded file buffer
  const parseAvatarArchive = async (arrayBuffer: ArrayBuffer) => {
    isLoading.value = true;
    loadingProgress.value = 'Parsing Avatar.opa container...';
    isArchiveLoaded.value = false;

    try {
      const archive = parseOpi(arrayBuffer);

      // Save files globally in window context for the renderer to read
      const filesMap: Record<string, OpiFile> = {};
      for (const file of archive.files) {
        filesMap[file.name.toLowerCase()] = file;
      }
      (window as any).__O2JAM_ARCHIVE_FILES__ = filesMap;

      loadingProgress.value = 'Extracting ItemData catalog...';
      const itemDataFile = filesMap['itemdata_china.dat'];
      if (!itemDataFile) {
        throw new Error("ItemData_China.dat database not found in Avatar.opa");
      }

      loadingProgress.value = 'Decoding item database...';
      itemsCatalog.value = parseItemData(itemDataFile.data);

      isArchiveLoaded.value = true;
      loadingProgress.value = 'Ready!';
      
      // Equip initial novice clothes
      equipDefaultBody();
    } catch (err: any) {
      console.error(err);
      loadingProgress.value = `Error: ${err.message || err}`;
      isArchiveLoaded.value = false;
      throw err;
    } finally {
      isLoading.value = false;
    }
  };

  // Watch gender changes to update face item and reset invalid equipments
  watch(gender, () => {
    // Re-equip face for correct gender
    const faceItem = itemsCatalog.value.find(x => x.id === (gender.value === "Female" ? 36 : 35));
    if (faceItem) {
      equipItem(faceItem);
    }
    
    // Clear gender-incompatible items
    const categories = Object.keys(equippedItems.value) as EquipmentCategory[];
    for (const cat of categories) {
      const equip = equippedItems.value[cat];
      if (equip) {
        const item = itemsCatalog.value.find(x => x.id === equip.id);
        if (item && item.gender !== "Any" && item.gender !== gender.value) {
          unequipItem(cat);
        }
      }
    }
  });

  return {
    isArchiveLoaded,
    isLoading,
    loadingProgress,
    itemsCatalog,
    equippedItems,
    gender,
    instrument,
    frameTick,
    parseAvatarArchive,
    equipItem,
    unequipItem,
    clearEquipments,
    equipDefaultBody
  };
}
