export interface OpiFile {
  id: string;
  name: string;
  fileOffset: number;
  fileSize: number;
  actualSize: number;
  data: Uint8Array;
}

export interface OpiArchive {
  files: OpiFile[];
}

export function parseOpi(arrayBuffer: ArrayBuffer): OpiArchive {
  const view = new DataView(arrayBuffer);
  const data = new Uint8Array(arrayBuffer);
  const fileSize = arrayBuffer.byteLength;

  if (fileSize < 8) {
    throw new Error("File too small to be an OPI/OPA archive");
  }

  // 1. Verify Magic: Check for 0x02000000 (OPI), 0x01000000 (OPA) or "OPI" signature
  const isOpi = (view.getUint8(0) === 0x02 && view.getUint8(1) === 0x00 && view.getUint8(2) === 0x00 && view.getUint8(3) === 0x00) ||
                (view.getUint8(0) === 0x01 && view.getUint8(1) === 0x00 && view.getUint8(2) === 0x00 && view.getUint8(3) === 0x00) ||
                (view.getUint8(0) === 79 && view.getUint8(1) === 80 && view.getUint8(2) === 73); // 'O' 'P' 'I'

  if (!isOpi) {
    throw new Error("Invalid archive header. Does not match expected OPI/OPA magic signature.");
  }

  // 2. Read File Count (4 bytes at offset 4)
  const fileCount = view.getInt32(4, true);

  // 3. Compute entry directory start offset
  const directoryOffset = fileSize - (fileCount * 152);
  if (directoryOffset < 8 || directoryOffset > fileSize) {
    throw new Error("Corrupt OPI file structure (calculated out-of-bounds directory offset).");
  }

  const files: OpiFile[] = [];

  // Helper to decode null-terminated EUC-KR / GBK string
  const decodeString = (buf: Uint8Array): string => {
    let end = buf.indexOf(0);
    if (end === -1) end = buf.length;
    
    try {
      // Standard O2Jam resources use EUC-KR or GBK. Try EUC-KR first, then fall back to UTF-8
      const decoder = new TextDecoder('euc-kr');
      return decoder.decode(buf.slice(0, end)).trim();
    } catch {
      return new TextDecoder('utf-8').decode(buf.slice(0, end)).trim();
    }
  };

  // 4. Read each file entry metadata
  for (let i = 0; i < fileCount; i++) {
    const entryOffset = directoryOffset + (i * 152);
    if (entryOffset + 152 > fileSize) break;

    const itemHeader = view.getUint32(entryOffset, true);
    if (itemHeader !== 1 && itemHeader !== 0x01000000) {
      console.warn(`Item index ${i} header does not match expected value 0x01000000`);
    }

    // Read 128 bytes file name
    const fileNameBuffer = data.slice(entryOffset + 4, entryOffset + 132);
    const name = decodeString(fileNameBuffer);

    // Read offsets and sizes
    const fileOffset = view.getInt32(entryOffset + 132, true);
    const size1 = view.getInt32(entryOffset + 136, true);
    const size2 = view.getInt32(entryOffset + 140, true);
    const actualSize = Math.max(size1, size2);

    if (fileOffset + actualSize > fileSize) {
      console.warn(`File "${name}" data offset exceeds archive size. Skipping.`);
      continue;
    }

    // Extract sliced data buffer
    const fileData = data.slice(fileOffset, fileOffset + actualSize);

    files.push({
      id: `${name}_${fileOffset}_${i}`,
      name,
      fileOffset,
      fileSize: size1,
      actualSize,
      data: fileData
    });
  }

  // Sort files alphabetically
  files.sort((a, b) => a.name.localeCompare(b.name));

  return { files };
}
