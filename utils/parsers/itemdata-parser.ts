export const EquipmentType = [
  "Body",
  "LeftArm",
  "RightArm",
  "LeftHand",
  "RightHand",
  "Face",
  "Hair",
  "Glasses",
  "Earrings",
  "Necklace",
  "ClothesAccessories",
  "Accessories",
  "Gloves",
  "Pants",
  "Shoes",
  "Keyboard",
  "Guitar",
  "Drum",
  "Bass",
  "Top",
  "Wings",
  "InstrumentAccessories",
  "Pet",
  "HairAccessories",
  "AttributiveItem",
  "NicknameChanger",
  "PenaltyResetter",
  "BagExpansion",
  "Costume"
] as const;

export type EquipmentCategory = typeof EquipmentType[number];

export const RenderPart = [
  "LargeThumbnail",
  "SmallThumbnail",
  "Body",
  "LeftArm",
  "RightArm",
  "Back"
] as const;

export type RenderPartType = typeof RenderPart[number];

export const Instrument = [
  "None",
  "Guitar",
  "Bass",
  "Keyboard",
  "Drum"
] as const;

export type InstrumentType = typeof Instrument[number];

export interface ItemReference {
  gender: "Male" | "Female" | "Any";
  renderPart: RenderPartType;
  instrument: InstrumentType;
  ref: string;
}

export interface ItemMetadata {
  id: number;
  name: string;
  description: string;
  type: EquipmentCategory;
  planet: number;
  gender: "Male" | "Female" | "Any";
  isNew: boolean;
  priceGem: number;
  priceCash: number;
  largeThumbnail: string | null;
  smallThumbnail: string | null;
  references: ItemReference[];
}

export function parseItemData(buffer: Uint8Array): ItemMetadata[] {
  let offset = 0;
  const view = new DataView(buffer.buffer, buffer.byteOffset, buffer.byteLength);
  
  if (buffer.byteLength < 4) {
    throw new Error("File too short to read ItemData count");
  }

  const count = view.getUint32(offset, true);
  offset += 4;
  
  const items: ItemMetadata[] = [];
  const gbkDecoder = new TextDecoder('gbk'); // O2Jam China uses GBK, Korea uses euc-kr

  for (let i = 0; i < count; i++) {
    if (offset + 21 > buffer.length) break;
    
    // Read ItemInfo struct (21 bytes)
    const id = view.getUint32(offset + 0, true);
    const typeIndex = view.getUint8(offset + 4);
    const planet = view.getUint8(offset + 5);
    const flag = view.getUint16(offset + 6, true);
    const quantity = view.getUint8(offset + 8);
    const modifierEffect = view.getUint8(offset + 9);
    const modifierCategory = view.getUint8(offset + 10);
    const currency = view.getUint8(offset + 11);
    const extraVal = view.getUint8(offset + 12);
    const priceGem = view.getUint32(offset + 13, true);
    const priceCash = view.getUint32(offset + 17, true);
    offset += 21;

    // Read part (1 byte)
    const part = view.getUint8(offset);
    offset += 1;

    // Read Name
    if (offset + 4 > buffer.length) break;
    const fnLength = view.getUint32(offset, true);
    offset += 4;
    
    if (offset + fnLength > buffer.length) break;
    const fnBytes = buffer.slice(offset, offset + fnLength);
    const name = gbkDecoder.decode(fnBytes).trim();
    offset += fnLength;

    // Read Description
    if (offset + 4 > buffer.length) break;
    const dsLength = view.getUint32(offset, true);
    offset += 4;
    
    if (offset + dsLength > buffer.length) break;
    const dsBytes = buffer.slice(offset, offset + dsLength);
    const description = gbkDecoder.decode(dsBytes).trim();
    offset += dsLength;

    const type = EquipmentType[typeIndex] || `Unknown(${typeIndex})`;
    
    // Determine Gender
    const genderVal = (flag >> 7) & 15;
    let gender: "Male" | "Female" | "Any" = "Any";
    if (genderVal === 0) gender = "Female";
    else if (genderVal === 1) gender = "Male";

    const isNew = ((flag >> 11) & 1) === 1;
    const references: ItemReference[] = [];

    // Helper to read references
    const readRef = (): string | null => {
      if (offset >= buffer.length) return null;
      const valid = view.getUint8(offset) !== 0;
      offset += 1;
      if (!valid) return null;

      if (offset + 4 > buffer.length) return null;
      const refLength = view.getUint32(offset, true);
      offset += 4;

      if (offset + refLength > buffer.length) return null;
      const refBytes = buffer.slice(offset, offset + refLength);
      const ref = new TextDecoder('utf-8').decode(refBytes).trim();
      offset += refLength;

      return ref;
    };

    const largeThumbnail = readRef();
    const smallThumbnail = readRef();

    // Read render parts loop (excluding Large/SmallThumbnail)
    for (let pIndex = 0; pIndex < RenderPart.length; pIndex++) {
      const pName = RenderPart[pIndex]!;
      if (pName === "LargeThumbnail" || pName === "SmallThumbnail") {
        continue;
      }

      for (let instIndex = 0; instIndex < Instrument.length; instIndex++) {
        const instName = Instrument[instIndex]!;

        // Loop male then female
        for (const gName of ["Male", "Female"] as const) {
          const ref = readRef();
          if (ref) {
            references.push({
              gender: gName,
              renderPart: pName,
              instrument: instName,
              ref
            });
          }
        }
      }
    }

    if (id !== 0) { // Skip dummy items
      items.push({
        id,
        name,
        description,
        type: type as EquipmentCategory,
        planet,
        gender,
        isNew,
        priceGem,
        priceCash,
        largeThumbnail,
        smallThumbnail,
        references
      });
    }
  }

  return items;
}
