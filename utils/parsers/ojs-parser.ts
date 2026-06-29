export interface OjsFrame {
  x: number;
  y: number;
  width: number;
  height: number;
  frameOffset: number;
  frameSize: number;
  canvas: HTMLCanvasElement | null;
  previewUrl?: string; // fallback for godtool list display
}

export interface OjsData {
  rgbFormat: number;
  frameCount: number;
  transparencyCode: number;
  transColorHex: string;
  frames: OjsFrame[];
}

// Convert 16-bit RGB555 value to 8-bit RGB components
function loadRGB555(val16: number): { r: number; g: number; b: number } {
  const r5 = (val16 >> 10) & 0x1F;
  const g5 = (val16 >> 5) & 0x1F;
  const b5 = val16 & 0x1F;

  // Scale from 0-31 to 0-255
  return {
    r: Math.floor((r5 * 255) / 31),
    g: Math.floor((g5 * 255) / 31),
    b: Math.floor((b5 * 255) / 31)
  };
}

// 1. Decode OJS (Standard RGB555) bitmap format
function decodeBitmap(buffer: Uint8Array, width: number, height: number, transR: number, transG: number, transB: number, transparencyCode: number, threshold = 20.0): Uint8ClampedArray {
  const pixels = new Uint8ClampedArray(width * height * 4);
  const view = new DataView(buffer.buffer, buffer.byteOffset, buffer.byteLength);
  const numPixels = width * height;
  const len = buffer.length;

  for (let p = 0; p < numPixels; p++) {
    const byteOffset = p * 2;
    const pixelIndex = p * 4;
    
    if (byteOffset + 2 > len) {
      // transparent black for overflow
      pixels[pixelIndex + 3] = 0;
      continue;
    }

    const val16 = view.getUint16(byteOffset, true);
    const { r, g, b } = loadRGB555(val16);

    pixels[pixelIndex] = r;
    pixels[pixelIndex + 1] = g;
    pixels[pixelIndex + 2] = b;
    pixels[pixelIndex + 3] = 255;

    if (transparencyCode !== 0) {
      // Calculate color distance
      const distance = Math.sqrt(
        Math.pow(r - transR, 2) +
        Math.pow(g - transG, 2) +
        Math.pow(b - transB, 2)
      );

      if (distance < threshold) {
        const alpha = (distance / threshold) * 255.0;
        pixels[pixelIndex + 3] = Math.min(255, Math.floor(alpha));
      }
    }
  }

  return pixels;
}

// 2. Decode OJA (Run-Length Encoded RGB555) bitmap format
function decodeEncodedBitmap(buffer: Uint8Array, width: number, height: number): Uint8ClampedArray {
  const pixels = new Uint8ClampedArray(width * height * 4); // initialized to transparent black
  const view = new DataView(buffer.buffer, buffer.byteOffset, buffer.byteLength);
  let offset = 0;

  while (offset < buffer.length) {
    if (offset + 2 > buffer.length) break;
    const count = view.getUint16(offset, true);
    offset += 2;
    if (count === 0) break;

    if (offset + 4 > buffer.length) break;
    const x = view.getUint16(offset, true);
    offset += 2;
    const y = view.getUint16(offset, true);
    offset += 2;

    for (let i = 0; i < count; i++) {
      if (offset + 2 > buffer.length) break;
      const pixel = view.getUint16(offset, true);
      offset += 2;

      let r5 = (pixel >> 10) & 0x1F;
      let g5 = (pixel >> 5) & 0x1F;
      let b5 = pixel & 0x1F;

      // Upscale components
      const r8 = (r5 << 3) | (r5 >> 2);
      const g8 = (g5 << 3) | (g5 >> 2);
      const b8 = (b5 << 3) | (b5 >> 2);

      const currentX = x + i;
      if (currentX < width && y < height) {
        const pixelIndex = (y * width + currentX) * 4;
        pixels[pixelIndex] = r8;
        pixels[pixelIndex + 1] = g8;
        pixels[pixelIndex + 2] = b8;
        pixels[pixelIndex + 3] = 255;
      }
    }
  }

  return pixels;
}

// 3. Decode OJI (Masked Run-Length Encoded RGB555) bitmap format
function decodeMaskBitmap(buffer: Uint8Array, width: number, height: number, transR: number, transG: number, transB: number, transparencyCode: number, threshold = 20.0): Uint8ClampedArray {
  const pixels = new Uint8ClampedArray(width * height * 4); // initialized to transparent black
  const view = new DataView(buffer.buffer, buffer.byteOffset, buffer.byteLength);
  let offset = 0;

  while (offset < buffer.length) {
    if (offset + 2 > buffer.length) break;
    const count = view.getUint16(offset, true);
    offset += 2;
    if (count === 0) break;

    if (offset + 4 > buffer.length) break;
    const x = view.getUint16(offset, true);
    offset += 2;
    const y = view.getUint16(offset, true);
    offset += 2;

    // Bounds check
    if (x >= width || y >= height) {
      offset += count * 2;
      continue;
    }

    for (let i = 0; i < count; i++) {
      if (offset + 2 > buffer.length) break;
      const pixel = view.getUint16(offset, true);
      offset += 2;

      const currentX = x + i;
      if (currentX >= width) continue;

      const r5 = (pixel >> 10) & 0x1F;
      const g5 = (pixel >> 5) & 0x1F;
      const b5 = pixel & 0x1F;

      const r8 = Math.floor((r5 * 255) / 31);
      const g8 = Math.floor((g5 * 255) / 31);
      const b8 = Math.floor((b5 * 255) / 31);

      const pixelIndex = (y * width + currentX) * 4;
      pixels[pixelIndex] = r8;
      pixels[pixelIndex + 1] = g8;
      pixels[pixelIndex + 2] = b8;
      pixels[pixelIndex + 3] = 255;

      if (transparencyCode !== 0) {
        const distance = Math.sqrt(
          Math.pow(r8 - transR, 2) +
          Math.pow(g8 - transG, 2) +
          Math.pow(b8 - transB, 2)
        );

        if (distance < threshold) {
          const alpha = (distance / threshold) * 255.0;
          pixels[pixelIndex + 3] = Math.min(255, Math.floor(alpha));
        }
      }
    }
  }

  return pixels;
}

export function parseOjs(buffer: Uint8Array, fileName = ''): OjsData {
  if (buffer.byteLength < 8) {
    throw new Error("File too short to be an OJS/OJI/OJA sprite");
  }

  const view = new DataView(buffer.buffer, buffer.byteOffset, buffer.byteLength);
  
  const signature = view.getUint16(0, true);
  const format = view.getUint16(2, true);
  const frameCount = view.getUint16(4, true);
  const transparencyCode = view.getUint16(6, true);

  if (signature !== 0 && signature !== 1) {
    throw new Error(`Invalid signature: ${signature}`);
  }

  // transparency color to RGB
  const transColor = loadRGB555(transparencyCode);
  const transColorHex = transparencyCode === 0 ? '' : `#${transColor.r.toString(16).padStart(2, '0')}${transColor.g.toString(16).padStart(2, '0')}${transColor.b.toString(16).padStart(2, '0')}`;

  const frames: OjsFrame[] = [];
  const headerSize = 20;
  const dataOffset = 8 + (frameCount * headerSize);

  // Read Frame Headers
  for (let i = 0; i < frameCount; i++) {
    const offset = 8 + (i * headerSize);
    if (offset + headerSize > buffer.byteLength) {
      throw new Error(`Frame header ${i} exceeds file size`);
    }

    const x = view.getInt16(offset + 0, true);
    const y = view.getInt16(offset + 2, true);
    const width = view.getInt16(offset + 4, true);
    const height = view.getInt16(offset + 6, true);
    const frameOffset = view.getInt32(offset + 8, true);
    const frameSize = view.getInt32(offset + 12, true);

    const startOfFrame = (signature === 1) ? (dataOffset + frameOffset) : frameOffset;
    if (startOfFrame + frameSize > buffer.byteLength) {
      throw new Error(`Frame ${i} data exceeds file size limits`);
    }

    const frameBuffer = buffer.slice(startOfFrame, startOfFrame + frameSize);

    // Determine format
    let detectedFormat = format;
    const nameLower = fileName.toLowerCase();
    if (nameLower.endsWith('.oji')) {
      detectedFormat = 0xFFF0; // OJI
    } else if (nameLower.endsWith('.ojt')) {
      detectedFormat = 0xFFF1; // OJT (treated same as OJS)
    }

    let pixels: Uint8ClampedArray | null = null;
    let canvas: HTMLCanvasElement | null = null;

    if (width > 0 && height > 0 && frameBuffer.length > 0) {
      if (detectedFormat === 0xFFF0) { // OJI Masked
        pixels = decodeMaskBitmap(frameBuffer, width, height, transColor.r, transColor.g, transColor.b, transparencyCode);
      } else if (detectedFormat === 0x555A) { // OJA Encoded
        pixels = decodeEncodedBitmap(frameBuffer, width, height);
      } else { // OJS Standard
        pixels = decodeBitmap(frameBuffer, width, height, transColor.r, transColor.g, transColor.b, transparencyCode);
      }

      // Create ready canvas
      canvas = document.createElement('canvas');
      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext('2d');
      if (ctx) {
        const imgData = ctx.createImageData(width, height);
        imgData.data.set(pixels);
        ctx.putImageData(imgData, 0, 0);
      }
    }

    frames.push({
      x,
      y,
      width,
      height,
      frameOffset,
      frameSize,
      canvas,
      previewUrl: canvas ? canvas.toDataURL() : undefined
    });
  }

  return {
    rgbFormat: (format << 16) | signature,
    frameCount,
    transparencyCode,
    transColorHex,
    frames
  };
}
