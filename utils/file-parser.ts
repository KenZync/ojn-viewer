import OJMParser from "~/utils/ojm-parser";
var getFileEntriesFromDirectory = async function (
  directory: FileSystemDirectoryEntry
) {
  var dirReader = directory.createReader();
  var allEntries: any[] = [];
  var numEntries = -1;

  while (numEntries != allEntries.length) {
    numEntries = allEntries.length;
    allEntries = allEntries.concat(await readDirectory(dirReader));
  }

  return allEntries;
};

var readDirectory = async function (reader: FileSystemDirectoryReader) {
  return new Promise((resolve, reject) => {
    reader.readEntries(
      (entries: unknown) => resolve(entries),
      (e: any) => reject(e)
    );
  });
};

var readAllFileEntries = async function (fileEntries: any): Promise<any> {
  let files = [];
  for (let fileEntry of fileEntries) {
    if (fileEntry.isFile) {
      files.push(await readFileEntry(fileEntry));
    } else if (fileEntry.isDirectory) {
      let fileEntries = await getFileEntriesFromDirectory(fileEntry);
      files.push({
        name: fileEntry.name,
        files: await readAllFileEntries(fileEntries),
      });
    }
  }
  return files;
};

var readFileEntry = async function (fileEntry: {
  file: (arg0: (file: any) => void, arg1: (e: any) => void) => void;
}) {
  return new Promise((resolve, reject) => {
    fileEntry.file(
      (file) => resolve(file),
      (e) => reject(e)
    );
  });
};

var readFileAsArrayBuffer = async function (file: Blob): Promise<ArrayBuffer> {
  return new Promise((resolve, reject) => {
    let fileReader = new FileReader();
    fileReader.onload = (e) => resolve(e.target?.result as ArrayBuffer);
    fileReader.onerror = (e) => reject(e.target?.error?.message);
    fileReader.readAsArrayBuffer(file);
  });
};

var processO2jamFolderV2 = async function (files: any) {
  let ojnFile;
  let ojmFile;
  let hitSounds = {};
  for (let file of files) {
    if (file.name.match(/\.ojn$/i) != null) {
      ojnFile = file;
    }
    if (file.name.match(/\.ojm$/i) != null) {
      ojmFile = file;
    }
  }
  let arrayBuffer: ArrayBuffer = await readFileAsArrayBuffer(ojnFile);
  if (ojmFile) {
    hitSounds = OJMParser.parseContent(await readFileAsArrayBuffer(ojmFile));
  }
  let output = convert(arrayBuffer, {}, hitSounds);
  return output;
};

export default {
  async parseFiles(items: any, drop: boolean): Promise<ConvertedOJN> {
    let files = [];
    if (drop) {
      if (items.length == 0) throw "NO FILE";
      if (items.length == 1 && items[0].isDirectory) {
        let fileEntries = await getFileEntriesFromDirectory(items[0]);
        files = await readAllFileEntries(fileEntries);
      } else {
        files = await readAllFileEntries(items);
      }
    } else {
      files = items;
    }
    for (let file of files) {
      let extension = file.name.match(/\.([a-zA-Z0-9]+)$/i);
      if (extension == null) continue;
      switch (extension[1]) {
        case "ojn":
          return processO2jamFolderV2(files); // Make sure this function returns a ConvertedOJN[]
      }
    }
    throw "invalidformat";
  },
};
