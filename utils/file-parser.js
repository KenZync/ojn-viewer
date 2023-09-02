var getFileEntriesFromDirectory = async function (directory) {
  var dirReader = directory.createReader();
  var allEntries = [];
  var numEntries = -1;

  while (numEntries != allEntries.length) {
    numEntries = allEntries.length;
    allEntries = allEntries.concat(await readDirectory(dirReader));
  }

  return allEntries;
};

var readDirectory = async function (reader) {
  return new Promise((resolve, reject) => {
    reader.readEntries(
      (entries) => resolve(entries),
      (e) => reject(e)
    );
  });
};

var readAllFileEntries = async function (fileEntries) {
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

var readFileEntry = async function (fileEntry) {
  return new Promise((resolve, reject) => {
    fileEntry.file(
      (file) => resolve(file),
      (e) => reject(e)
    );
  });
};

var readFileAsArrayBuffer = async function (file) {
  return new Promise((resolve, reject) => {
    let fileReader = new FileReader();
    fileReader.onload = (e) => resolve(e.target.result);
    fileReader.onerror = (e) => reject(e.target.error.message);
    fileReader.readAsArrayBuffer(file);
  });
};

var processO2jamFolderV2 = async function (files) {
  let ojnFile;
  for (let file of files) {
    if (file.name.match(/\.ojn$/i) != null) {
      ojnFile = file;
    }
    if (file.name.match(/\.ojm$/i) != null) {
      ojmFile = file;
    }
  }
  let arrayBuffer = await readFileAsArrayBuffer(ojnFile)
  return convert(arrayBuffer);
};

export default {
  async parseFiles(items, drop) {
    let files = [];
    if (drop) {
      if (items.length == 0) return files;
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
          return processO2jamFolderV2(files);
      }
    }
    throw "invalidformat";
  },
};