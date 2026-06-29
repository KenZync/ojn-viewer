export interface Boundary {
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface BndData {
  count: number;
  coordinates: Boundary[];
}

export function parseBnd(buffer: Uint8Array): BndData {
  const view = new DataView(buffer.buffer, buffer.byteOffset, buffer.byteLength);
  
  if (buffer.byteLength < 6) {
    throw new Error("File too short to be BND");
  }

  // Header check: 0xFFFFFFFF (-1)
  const magic = view.getInt32(0, true);
  if (magic !== -1) {
    console.warn("BND file header is not 0xFFFFFFFF (-1)");
  }

  const count = view.getUint16(4, true);
  const coordinates: Boundary[] = [];

  for (let i = 0; i < count; i++) {
    const offset = 6 + (i * 16);
    if (offset + 16 > buffer.length) break;

    const x = view.getInt32(offset + 0, true);
    const y = view.getInt32(offset + 4, true);
    const width = view.getInt32(offset + 8, true);
    const height = view.getInt32(offset + 12, true);

    coordinates.push({ x, y, width, height });
  }

  return {
    count,
    coordinates
  };
}
