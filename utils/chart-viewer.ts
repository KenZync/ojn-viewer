import { Buffer } from "buffer";
import iconv from "iconv-lite";

const genreMap = [
  "Ballad",
  "Rock",
  "Dance",
  "Techno",
  "Hip-hop",
  "Soul/R&B",
  "Jazz",
  "Funk",
  "Classical",
  "Traditional",
  "Etc",
];

const keyMapping = {
  2: "11",
  3: "12",
  4: "13",
  5: "14",
  6: "15",
  7: "18",
  8: "19",
};

export const convert = (ojn: any) => {
  var header = {
    song_id: 0,
    signature: 0,
    encode_version: 0,
    genre: 0,
    bpm: 0,
    difficulty: {
      easy: {
        level: 0,
        note_count: 0,
        event_count: 0,
        measure_count: 0,
        package_count: 0,
        duration: 0,
        note_offset: 0,
      },
      normal: {
        level: 0,
        note_count: 0,
        event_count: 0,
        measure_count: 0,
        package_count: 0,
        duration: 0,
        note_offset: 0,
      },
      hard: {
        level: 0,
        note_count: 0,
        event_count: 0,
        measure_count: 0,
        package_count: 0,
        duration: 0,
        note_offset: 0,
      },
    },
    old_encode_version: 0,
    old_song_id: 0,
    old_genre: "",
    bmp_size: 0,
    old_file_version: 0,
    title: "",
    artist: "",
    noter: "",
    ojm_file: "",
    cover_size: 0,
    cover_offset: 0,
    image: "",
    bmp: "",
  };
  //   var ojn;

//   const score: any = ref([]);
// const lnmap: any = ref({});
  var score=[];
  var lnmap={}
  if (ojn != undefined) {
    var OJN_SIGNATURE = 0x006e6a6f;
    let dec = new TextDecoder("utf-8");
    let dataview = new DataView(ojn);
    let cursor = 0;

    header.song_id = dataview.getInt32(cursor, true);
    cursor += 4;
    header.signature = dataview.getInt32(cursor, true);
    cursor += 4;

    if (header.signature != OJN_SIGNATURE) return null;

    header.encode_version = dataview.getFloat32(cursor, true);
    cursor += 4;
    header.genre = dataview.getInt32(cursor, true);
    // header.genreString = genreMap[(header.genre < 0 || header.genre > 10) ? 10 : header.genre];
    cursor += 4;
    header.bpm = dataview.getFloat32(cursor, true);
    cursor += 4;

    header.difficulty.easy.level = dataview.getInt16(cursor, true);
    cursor += 2;
    header.difficulty.normal.level = dataview.getInt16(cursor, true);
    cursor += 2;
    header.difficulty.hard.level = dataview.getInt16(cursor, true);
    cursor += 2;
    //ignore next short
    cursor += 2;

    header.difficulty.easy.event_count = dataview.getInt32(cursor, true);
    cursor += 4;
    header.difficulty.normal.event_count = dataview.getInt32(cursor, true);
    cursor += 4;
    header.difficulty.hard.event_count = dataview.getInt32(cursor, true);
    cursor += 4;

    header.difficulty.easy.note_count = dataview.getInt32(cursor, true);
    cursor += 4;
    header.difficulty.normal.note_count = dataview.getInt32(cursor, true);
    cursor += 4;
    header.difficulty.hard.note_count = dataview.getInt32(cursor, true);
    cursor += 4;

    header.difficulty.easy.measure_count = dataview.getInt32(cursor, true);
    cursor += 4;
    header.difficulty.normal.measure_count = dataview.getInt32(cursor, true);
    cursor += 4;
    header.difficulty.hard.measure_count = dataview.getInt32(cursor, true);
    cursor += 4;

    header.difficulty.easy.package_count = dataview.getInt32(cursor, true);
    cursor += 4;
    header.difficulty.normal.package_count = dataview.getInt32(cursor, true);
    cursor += 4;
    header.difficulty.hard.package_count = dataview.getInt32(cursor, true);
    cursor += 4;

    header.old_encode_version = dataview.getInt16(cursor, true);
    cursor += 2;
    header.old_song_id = dataview.getInt16(cursor, true);
    cursor += 2;
    header.old_genre = dec.decode(ojn.slice(cursor, cursor + 20));
    cursor += 20;
    header.bmp_size = dataview.getInt32(cursor, true);
    cursor += 4;
    header.old_file_version = dataview.getInt32(cursor, true);
    cursor += 4;

    const title_raw = Buffer.from(ojn, 108, 64);
    header.title = iconv.decode(title_raw, "CP949").replace(/\0/g, "");

    const artist_raw = Buffer.from(ojn, 172, 32);
    header.artist = iconv.decode(artist_raw, "CP949").replace(/\0/g, "");

    const noter_raw = Buffer.from(ojn, 204, 32);
    header.noter = iconv.decode(noter_raw, "CP949").replace(/\0/g, "");

    const ojm_file_raw = Buffer.from(ojn, 236, 32);
    header.ojm_file = iconv.decode(ojm_file_raw, "CP949").replace(/\0/g, "");
    cursor += 64;
    cursor += 32;
    cursor += 32;
    cursor += 32;
    header.cover_size = dataview.getInt32(cursor, true);
    cursor += 4;

    header.difficulty.easy.duration = dataview.getInt32(cursor, true);
    cursor += 4;
    header.difficulty.normal.duration = dataview.getInt32(cursor, true);
    cursor += 4;
    header.difficulty.hard.duration = dataview.getInt32(cursor, true);
    cursor += 4;

    header.difficulty.easy.note_offset = dataview.getInt32(cursor, true);
    cursor += 4;
    header.difficulty.normal.note_offset = dataview.getInt32(cursor, true);
    cursor += 4;
    header.difficulty.hard.note_offset = dataview.getInt32(cursor, true);
    cursor += 4;

    header.cover_offset = dataview.getInt32(cursor, true);
    cursor += 4;

    // // cursor = data.header.coverOffset
    // // data.image = 'data:image/png;base64,' + Buffer.from(buffer.slice(cursor, cursor + data.header.coverSize)).toString('base64')

    const cover_offset_end = header.cover_offset + header.cover_size;
    const bmp_offset_end = cover_offset_end + header.bmp_size;

    const cover_base64 = Buffer.from(
      ojn.slice(header.cover_offset, cover_offset_end)
    ).toString("base64");
    const cover = "data:image/png;base64," + cover_base64;
    const bmp_base64 = Buffer.from(
      ojn.slice(cover_offset_end, bmp_offset_end)
    ).toString("base64");
    const bmp = "data:image/png;base64," + bmp_base64;

    header.image = cover;
    header.bmp = bmp;
    // let current_diff = "hard";
    // for (let current_diff of ["easy", "normal", "hard"]) {
    cursor = header.difficulty.hard.note_offset;

    // const set = new Set();
    for (let i = 0; i < header.difficulty.hard.package_count; i++) {

      let current_package: any = {};
      current_package.measure = dataview.getInt32(cursor, true);
      cursor += 4;
      current_package.channel = dataview.getInt16(cursor, true);
      cursor += 2;
      current_package.events = dataview.getInt16(cursor, true);
      cursor += 2;

      if (!score[current_package.measure]) {
        score[current_package.measure] = {};
      }
      // if(current_package.events != 1){
      //   score[current_package.measure]["length"] = current_package.events;
      // }

      // score[current_package.measure]["length"] = current_package.events;

      // console.log(current_package)

      // console.log(
      //   current_package.measure,
      //   current_package.channel,
      //   current_package.events
      // );

      for (let j = 0; j < current_package.events; j++) {
        // let beat = (current_package.measure + j / current_package.events) * 4;
        if (current_package.channel == 0 || current_package.channel == 1) {
          // if(current_package.channel == 0){
          //   console.log("hey")
          // }
          let bpm = dataview.getFloat32(cursor, true);
          cursor += 4;
          if (bpm !== 0) {
            // if(score[current_package.measure] == null){
            //   score[current_package.measure] = {}
            // }
            const beat_bpm = [(j / current_package.events) * 192, bpm];

            if (!score[current_package.measure]["03"]) {
              score[current_package.measure]["03"] = [];
            }

            // score[current_package.measure][key].push( [j,'00'] );

            // if (score[current_package.measure]) {
            //   // Check if the value already exists in the array
            const valueExists = score[current_package.measure]["03"].some(
              (item: number[]) =>
                item[0] === beat_bpm[0] && item[1] === beat_bpm[1]
            );
            if (!valueExists) {
              // If the value doesn't exist, push it to the array
              score[current_package.measure]["03"].push(beat_bpm);
            }
            // } else {
            //   score[current_package.measure] = { "03": [beat_bpm] };
            // }

            // .push({bpm})

            // console.log(score)
            // set.add([current_package.measure,j,bpm])

            // console.log(set.add([current_package.measure,j,bpm]))
            // console.log(set)
            // score[current_package.measure] = {"03":[...set]}

            // console.log(current_package.measure,j,current_package.events,bpm)
          }
          // parseTimingPoint(beat, bpm)
        } else if (current_package.channel > 8) {
          let event: any = {};
          event.hitSound = dataview.getInt16(cursor, true);
          cursor += 2;
          event.volumePan = dataview.getInt8(cursor);
          cursor += 1;
          event.type = dataview.getInt8(cursor);
          cursor += 1;
          // parseTimeSound(beat, event)
        } else {
          let event: any = {};
          event.hitSound = dataview.getInt16(cursor, true);
          cursor += 2;
          event.volumePan = dataview.getInt8(cursor);
          cursor += 1;
          event.type = dataview.getInt8(cursor);
          cursor += 1;

          let key = keyMapping[current_package.channel];

          // if (!score[current_package.measure]) {
          //   score[current_package.measure] = {};
          // }
          if (!score[current_package.measure][key]) {
            score[current_package.measure][key] = [];
          }

          if (event.hitSound == 0) {
            continue;
          } else {
            // console.log(event.hitSound);
          }

          // MIN 1 ~ 15 MAX, special 0 = MAX
          let volume = ((event.volumePan >> 4) & 0x0f) / 16;
          if (volume == 0) volume = 1;

          // LEFT 1 ~ 8 CENTER 8 ~ 15 RIGHT, special: 0 = 8
          let pan = event.volumePan & 0x0f;
          if (pan == 0) pan = 8;
          pan -= 8;
          pan /= 7;

          event.hitSound--;

          if (event.type % 8 > 3) event.hitSound += 1000;
          event.type %= 4;

          switch (event.type) {
            case 0:
              // console.log("NOTE")
              // data[currentDiff].noteLines.push({ beat, key, timing, hitSound: event.hitSound, soundTypes: [], objectName: 'note', volume, pan })
              // console.log(event.hitSound,key)
              score[current_package.measure][key].push([
                (j / current_package.events) * 192,
                "00",
              ]);
              break;
            case 2:
              //   if (!score[current_package.measure][key]) {
              //   score[current_package.measure][key] = [];
              // }

              if (!lnmap[key]) {
                lnmap[key] = [];
              }
              lnmap[key].push([
                [current_package.measure, (j / current_package.events) * 192],
              ]);

              // lnmap[current_package.measure][key].push( [j,'00'] );
              // data[currentDiff].noteLines.push({ beat, key, timing, hitSound: event.hitSound, soundTypes: [], objectName: 'longnote', volume, pan, start: true })
              break;
            case 3:
              lnmap[key][lnmap[key].length - 1].push([
                current_package.measure,
                (j / current_package.events) * 192,
              ]);
              // if (lnmap[key][lnmap[key].length - 1][0][0] === current_package.measure){
              //     lnmap[key][lnmap[key].length - 1].push([
              //       current_package.measure,
              //       j,
              //     ]);
              // }

              // if (
              //   lnmap[key][lnmap[key].length - 1][0][0] ===
              //   current_package.measure
              // ) {
              //   lnmap[key][lnmap[key].length - 1].push([
              //     current_package.measure,
              //     j,
              //   ]);
              // } else {
              //   lnmap[key].push([[current_package.measure, j]]);
              // }
              // console.log("START END")
              // data[currentDiff].noteLines.push({ beat, key, timing, hitSound: event.hitSound, soundTypes: [], objectName: 'longnote', volume, pan, start: false })
              break;
          }

          // console.log("it's Note motherfucker")

          // console.log(event);

          // if (!score[current_package.measure]) {
          //   score[current_package.measure] = {};
          // }
          // if (!score[current_package.measure][key]) {
          //   score[current_package.measure][key] = [];
          // }

          // score[current_package.measure][key].push( [j,'00'] );

          // console.log(keyMapping[current_package.channel])

          // if(score[current_package.measure][key]){
          //   console.log("yes")
          // }
          // console.log(key)

          // if (score[current_package.measure]) {

          //   if(score[current_package.measure][key]){

          //   }else{
          //     console.log(score[current_package.measure])
          //   }
          //   // const valueExists = score[current_package.measure][
          //   // key
          //   // ].some(
          //   //   (item) => item[0] === j && item[1] === j
          //   // );
          //   // (item) => item[0] === beat_bpm[0] && item[1] === beat_bpm[1]
          //   // console.log(score[current_package.measure][key])
          // }

          // if (score[current_package.measure]) {

          // // Check if the value already exists in the array
          // const valueExists = score[current_package.measure][
          //   key
          // ].some(
          //   (item) => item[0] === beat_bpm[0] && item[1] === beat_bpm[1]
          // );
          // if (!valueExists) {
          //   // If the value doesn't exist, push it to the array
          //   score[current_package.measure][key].push(beat_bpm);
          // }
          // } else {
          // score[current_package.measure] = { key: [beat_bpm] };
          // }

          // score[current_package.measure]["length"] = current_package.events

          // parseNote(beat, current_package.channel - 2, getTiming(j, current_package.events), event)

          // console.log(current_package.measure, current_package.events, current_package.channel - 2)
        }
      }

      // score[current_package.measure] = {}

      // for (let j = 0; j < current_package.events; j++) {
      //   // let beat = (current_package.measure + j / current_package.events) * 4;
      //   if (current_package.channel == 0) {
      //     let time = dataview.getFloat32(cursor, true);
      //     // console.log(time)
      //     cursor += 4;
      //     // parseTimeSignature(beat, time)
      //   } else if (current_package.channel == 1) {
      //     let bpm = dataview.getFloat32(cursor, true);
      //     // console.log(bpm, current_package.measure)
      //     cursor += 4;
      //     // parseTimingPoint(beat, bpm)
      //   } else if (current_package.channel > 8) {
      //     let event = {};
      //     event.hitSound = dataview.getInt16(cursor, true);
      //     cursor += 2;
      //     event.volumePan = dataview.getInt8(cursor, true);
      //     cursor += 1;
      //     event.type = dataview.getInt8(cursor, true);
      //     cursor += 1;
      //     // parseTimeSound(beat, event)
      //   } else {
      //     let event = {};
      //     event.hitSound = dataview.getInt16(cursor, true);
      //     cursor += 2;
      //     event.volumePan = dataview.getInt8(cursor, true);
      //     cursor += 1;
      //     event.type = dataview.getInt8(cursor, true);
      //     cursor += 1;
      //     // parseNote(beat, current_package.channel - 2, getTiming(j, current_package.events), event)

      //     // console.log(current_package.measure, current_package.events, current_package.channel - 2)
      //   }
      // }

      // console.log(current_package);
    }
    // for(i = 0 ; )
    // score[current_package.measure] = {"03":[...set]}
    // }

    const results = [];
    for (const value of score) {
      // If the value is null, add an empty dictionary to the results array.
      if (value === undefined) {
        results.push({});
      } else {
        // Otherwise, add the value to the results array.
        results.push(value);
      }
    }
    score = results;

    // for(let difficulty of ['Easy', 'Normal', 'Hard']) {
    //   currentDiff = difficulty
    //   cursor = data[currentDiff].noteOffset
    //   for(let i = 0; i < data[currentDiff].package_count; i++) {
    //     let currentPackage = {}
    //     currentPackage.measure = dataview.getInt32(cursor, true);
    //     cursor += 4
    //     currentPackage.channel = dataview.getInt16(cursor, true);
    //     cursor += 2
    //     currentPackage.events = dataview.getInt16(cursor, true);
    //     cursor += 2

    //     for(let j = 0; j < currentPackage.events; j++) {
    //       let beat = (currentPackage.measure + j / currentPackage.events) * 4
    //       if(currentPackage.channel == 0) {
    //         let time = dataview.getFloat32(cursor, true)
    //         cursor += 4
    //         parseTimeSignature(beat, time)
    //       } else if(currentPackage.channel == 1) {
    //         let bpm = dataview.getFloat32(cursor, true)
    //         cursor += 4
    //         parseTimingPoint(beat, bpm)
    //       } else if(currentPackage.channel > 8) {
    //         let event = {}
    //         event.hitSound = dataview.getInt16(cursor, true)
    //         cursor += 2
    //         event.volumePan = dataview.getInt8(cursor, true)
    //         cursor += 1
    //         event.type = dataview.getInt8(cursor, true)
    //         cursor += 1
    //         parseTimeSound(beat, event)
    //       } else {
    //         let event = {}
    //         event.hitSound = dataview.getInt16(cursor, true)
    //         cursor += 2
    //         event.volumePan = dataview.getInt8(cursor, true)
    //         cursor += 1
    //         event.type = dataview.getInt8(cursor, true)
    //         cursor += 1
    //         parseNote(beat, currentPackage.channel - 2, getTiming(j, currentPackage.events), event)
    //       }
    //     }
    //   }
    // }

    // return buffer;

    // return parseOJN(buf);
    //  return typeof(ojn)
    let ribbit = {
      artist: header.artist,
      bpm: header.bpm,
      genre: genreMap[header.genre],
      keys: 7,
      lnmap: lnmap,
      notes: header.difficulty.hard.note_count,
      score: score,
      title: header.title,
      total: "0",
      obj: header.noter,
      unit: 192,
    }
    
    return ribbit
  }
};

// export const readFileAsArrayBuffer = async function (file) {
//     return new Promise((resolve, reject) => {
//       let fileReader = new FileReader();
//       fileReader.onload = (e) => resolve(e.target.result);
//       fileReader.onerror = (e) => reject(e.target.error.message);
//       fileReader.readAsArrayBuffer(file);
//     });
// };
