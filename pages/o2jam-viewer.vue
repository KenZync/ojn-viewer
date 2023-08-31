<template>
  <div class="min-h-screen bg-zinc-900">
    {{ parsed }}
    <!-- {{ header }} -->
    {{ ribbit }}
  </div>
</template>

<script setup lang="ts">
// import _ from "struct-fu";
// import FileParser from "../utils/file-parser";
// import parseOJN from "~/utils/ojn-parser";
import { Buffer } from "buffer";
import iconv from "iconv-lite";

useHead({
  title: "OJN/OJM Viewer",
  meta: [{ name: "description", content: "Reading O2Jam Music Files" }],
});

const { data: ojn } = useFetch<any>("o2ma785.ojn", {
  server: false,
  responseType: "arrayBuffer",
});
// const { data: ojm } = useFetch("/o2ma785.ojm", { server: false });

const header = ref({
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
});

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

const ribbit = computed(() => {
  return {
    artist: header.value.artist,
    bpm: header.value.bpm,
    genre: genreMap[header.value.genre],
    keys: 7,
    lnmap: lnmap.value,
    notes: header.value.difficulty.hard.note_count,
    score: score.value,
    title: header.value.title,
    total: "0",
    unit: 192,
  };
});

const score: any = ref([]);
const lnmap: any = ref({});

const keyMapping = {
  2: "11",
  3: "12",
  4: "13",
  5: "14",
  6: "15",
  7: "18",
  8: "19",
};

// onMounted(()=>{
//   console.log(parsed.value)
// })

const parsed = computed(() => {
  if (ojn.value) {
    var OJN_SIGNATURE = 0x006e6a6f;
    let dec = new TextDecoder("utf-8");
    let dataview = new DataView(ojn.value);
    let cursor = 0;

    header.value.song_id = dataview.getInt32(cursor, true);
    cursor += 4;
    header.value.signature = dataview.getInt32(cursor, true);
    cursor += 4;

    if (header.value.signature != OJN_SIGNATURE) return null;

    header.value.encode_version = dataview.getFloat32(cursor, true);
    cursor += 4;
    header.value.genre = dataview.getInt32(cursor, true);
    // header.value.genreString = genreMap[(header.value.genre < 0 || header.value.genre > 10) ? 10 : header.value.genre];
    cursor += 4;
    header.value.bpm = dataview.getFloat32(cursor, true);
    cursor += 4;

    header.value.difficulty.easy.level = dataview.getInt16(cursor, true);
    cursor += 2;
    header.value.difficulty.normal.level = dataview.getInt16(cursor, true);
    cursor += 2;
    header.value.difficulty.hard.level = dataview.getInt16(cursor, true);
    cursor += 2;
    //ignore next short
    cursor += 2;

    header.value.difficulty.easy.event_count = dataview.getInt32(cursor, true);
    cursor += 4;
    header.value.difficulty.normal.event_count = dataview.getInt32(
      cursor,
      true
    );
    cursor += 4;
    header.value.difficulty.hard.event_count = dataview.getInt32(cursor, true);
    cursor += 4;

    header.value.difficulty.easy.note_count = dataview.getInt32(cursor, true);
    cursor += 4;
    header.value.difficulty.normal.note_count = dataview.getInt32(cursor, true);
    cursor += 4;
    header.value.difficulty.hard.note_count = dataview.getInt32(cursor, true);
    cursor += 4;

    header.value.difficulty.easy.measure_count = dataview.getInt32(
      cursor,
      true
    );
    cursor += 4;
    header.value.difficulty.normal.measure_count = dataview.getInt32(
      cursor,
      true
    );
    cursor += 4;
    header.value.difficulty.hard.measure_count = dataview.getInt32(
      cursor,
      true
    );
    cursor += 4;

    header.value.difficulty.easy.package_count = dataview.getInt32(
      cursor,
      true
    );
    cursor += 4;
    header.value.difficulty.normal.package_count = dataview.getInt32(
      cursor,
      true
    );
    cursor += 4;
    header.value.difficulty.hard.package_count = dataview.getInt32(
      cursor,
      true
    );
    cursor += 4;

    header.value.old_encode_version = dataview.getInt16(cursor, true);
    cursor += 2;
    header.value.old_song_id = dataview.getInt16(cursor, true);
    cursor += 2;
    header.value.old_genre = dec.decode(ojn.value.slice(cursor, cursor + 20));
    cursor += 20;
    header.value.bmp_size = dataview.getInt32(cursor, true);
    cursor += 4;
    header.value.old_file_version = dataview.getInt32(cursor, true);
    cursor += 4;

    const title_raw = Buffer.from(ojn.value, 108, 64);
    header.value.title = iconv.decode(title_raw, "CP949").replace(/\0/g, "");

    const artist_raw = Buffer.from(ojn.value, 172, 32);
    header.value.artist = iconv.decode(artist_raw, "CP949").replace(/\0/g, "");

    const noter_raw = Buffer.from(ojn.value, 204, 32);
    header.value.noter = iconv.decode(noter_raw, "CP949").replace(/\0/g, "");

    const ojm_file_raw = Buffer.from(ojn.value, 236, 32);
    header.value.ojm_file = iconv
      .decode(ojm_file_raw, "CP949")
      .replace(/\0/g, "");
    cursor += 64;
    cursor += 32;
    cursor += 32;
    cursor += 32;
    header.value.cover_size = dataview.getInt32(cursor, true);
    cursor += 4;

    header.value.difficulty.easy.duration = dataview.getInt32(cursor, true);
    cursor += 4;
    header.value.difficulty.normal.duration = dataview.getInt32(cursor, true);
    cursor += 4;
    header.value.difficulty.hard.duration = dataview.getInt32(cursor, true);
    cursor += 4;

    header.value.difficulty.easy.note_offset = dataview.getInt32(cursor, true);
    cursor += 4;
    header.value.difficulty.normal.note_offset = dataview.getInt32(
      cursor,
      true
    );
    cursor += 4;
    header.value.difficulty.hard.note_offset = dataview.getInt32(cursor, true);
    cursor += 4;

    header.value.cover_offset = dataview.getInt32(cursor, true);
    cursor += 4;

    // console.log(data)

    // // cursor = data.header.coverOffset
    // // data.image = 'data:image/png;base64,' + Buffer.from(buffer.slice(cursor, cursor + data.header.coverSize)).toString('base64')

    const cover_offset_end =
      header.value.cover_offset + header.value.cover_size;
    const bmp_offset_end = cover_offset_end + header.value.bmp_size;

    const cover_base64 = Buffer.from(
      ojn.value.slice(header.value.cover_offset, cover_offset_end)
    ).toString("base64");
    const cover = "data:image/png;base64," + cover_base64;
    const bmp_base64 = Buffer.from(
      ojn.value.slice(cover_offset_end, bmp_offset_end)
    ).toString("base64");
    const bmp = "data:image/png;base64," + bmp_base64;

    header.value.image = cover;
    header.value.bmp = bmp;
    // let current_diff = "hard";
    // for (let current_diff of ["easy", "normal", "hard"]) {
    cursor = header.value.difficulty.hard.note_offset;
    // console.log(header.value.difficulty[current_diff])

    // const set = new Set();
    for (let i = 0; i < header.value.difficulty.hard.package_count; i++) {
      // console.log(current_diff,i)

      let current_package: any = {};
      current_package.measure = dataview.getInt32(cursor, true);
      cursor += 4;
      current_package.channel = dataview.getInt16(cursor, true);
      cursor += 2;
      current_package.events = dataview.getInt16(cursor, true);
      cursor += 2;

      if (!score.value[current_package.measure]) {
        score.value[current_package.measure] = {};
      }
      console.log(current_package)
      // if(current_package.events != 1){
      //   score.value[current_package.measure]["length"] = current_package.events;
      // }
        
      // score.value[current_package.measure]["length"] = current_package.events;

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
            // if(score.value[current_package.measure] == null){
            //   score.value[current_package.measure] = {}
            // }
            const beat_bpm = [(j/current_package.events)*192, bpm];

            if (!score.value[current_package.measure]["03"]) {
              score.value[current_package.measure]["03"] = [];
            }

            // score.value[current_package.measure][key].push( [j,'00'] );

            // if (score.value[current_package.measure]) {
            //   // Check if the value already exists in the array
            const valueExists = score.value[current_package.measure]["03"].some(
              (item: number[]) =>
                item[0] === beat_bpm[0] && item[1] === beat_bpm[1]
            );
            if (!valueExists) {
              // If the value doesn't exist, push it to the array
              score.value[current_package.measure]["03"].push(beat_bpm);
            }
            // } else {
            //   score.value[current_package.measure] = { "03": [beat_bpm] };
            // }

            // .push({bpm})

            // console.log(score.value)
            // set.add([current_package.measure,j,bpm])

            // console.log(set.add([current_package.measure,j,bpm]))
            // console.log(set)
            // score.value[current_package.measure] = {"03":[...set]}

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

          // if (!score.value[current_package.measure]) {
          //   score.value[current_package.measure] = {};
          // }
          if (!score.value[current_package.measure][key]) {
            score.value[current_package.measure][key] = [];
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
              score.value[current_package.measure][key].push([(j/current_package.events)*192, "00"]);
              break;
            case 2:
              //   if (!score.value[current_package.measure][key]) {
              //   score.value[current_package.measure][key] = [];
              // }


              if (!lnmap.value[key]) {
                lnmap.value[key] = [];
              }
              lnmap.value[key].push([[current_package.measure, (j/current_package.events)*192]]);

              // lnmap.value[current_package.measure][key].push( [j,'00'] );
              // data[currentDiff].noteLines.push({ beat, key, timing, hitSound: event.hitSound, soundTypes: [], objectName: 'longnote', volume, pan, start: true })
              break;
            case 3:
            lnmap.value[key][lnmap.value[key].length - 1].push([current_package.measure,(j/current_package.events)*192])
            // if (lnmap.value[key][lnmap.value[key].length - 1][0][0] === current_package.measure){
            //     lnmap.value[key][lnmap.value[key].length - 1].push([
            //       current_package.measure,
            //       j,
            //     ]);
            // }

              // if (
              //   lnmap.value[key][lnmap.value[key].length - 1][0][0] ===
              //   current_package.measure
              // ) {
              //   lnmap.value[key][lnmap.value[key].length - 1].push([
              //     current_package.measure,
              //     j,
              //   ]);
              // } else {
              //   lnmap.value[key].push([[current_package.measure, j]]);
              // }
              // console.log("START END")
              // data[currentDiff].noteLines.push({ beat, key, timing, hitSound: event.hitSound, soundTypes: [], objectName: 'longnote', volume, pan, start: false })
              break;
          }

          // console.log("it's Note motherfucker")

          // console.log(event);

          // if (!score.value[current_package.measure]) {
          //   score.value[current_package.measure] = {};
          // }
          // if (!score.value[current_package.measure][key]) {
          //   score.value[current_package.measure][key] = [];
          // }

          // score.value[current_package.measure][key].push( [j,'00'] );

          // console.log(keyMapping[current_package.channel])

          // if(score.value[current_package.measure][key]){
          //   console.log("yes")
          // }
          // console.log(key)

          // if (score.value[current_package.measure]) {

          //   if(score.value[current_package.measure][key]){

          //   }else{
          //     console.log(score.value[current_package.measure])
          //   }
          //   // const valueExists = score.value[current_package.measure][
          //   // key
          //   // ].some(
          //   //   (item) => item[0] === j && item[1] === j
          //   // );
          //   // (item) => item[0] === beat_bpm[0] && item[1] === beat_bpm[1]
          //   // console.log(score.value[current_package.measure][key])
          // }

          // if (score.value[current_package.measure]) {

          // // Check if the value already exists in the array
          // const valueExists = score.value[current_package.measure][
          //   key
          // ].some(
          //   (item) => item[0] === beat_bpm[0] && item[1] === beat_bpm[1]
          // );
          // if (!valueExists) {
          //   // If the value doesn't exist, push it to the array
          //   score.value[current_package.measure][key].push(beat_bpm);
          // }
          // } else {
          // score.value[current_package.measure] = { key: [beat_bpm] };
          // }

          // score.value[current_package.measure]["length"] = current_package.events

          // parseNote(beat, current_package.channel - 2, getTiming(j, current_package.events), event)

          // console.log(current_package.measure, current_package.events, current_package.channel - 2)
        }
      }

      // score.value[current_package.measure] = {}

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
    // console.log(set)
    // for(i = 0 ; )
    // score.value[current_package.measure] = {"03":[...set]}
    // }

    const results = [];
    for (const value of score.value) {
      // If the value is null, add an empty dictionary to the results array.
      // console.log(value)
      if (value === undefined) {
        results.push({});
      } else {
        // Otherwise, add the value to the results array.
        results.push(value);
      }
    }
    score.value = results;

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
  }

  // return parseOJN(buf);
  //  return typeof(ojn.value)
});

// const fetchData = async () =>{
//   const { data, pending, error, refresh } = await useAsyncData(
//     'mountains',
//     () => $fetch('/test.txt')
//   )
// }

// const { data, pending, error, refresh } = await useAsyncData(
//   'mountains',
//   () => $fetch('/test.txt')
// )

// const { ojm } = await useAsyncData('/o2ma785.ojn', {server:false});
// const { ojn } = await useAsyncData('/o2ma785.ojm', {server:false});

// const output = ref();

// const onInputChange = async (e) => {
//   let originalFiles;
//   let drop = false;
//   if (e.target.files) {
//     originalFiles = e.target.files;
//   } else {
//     originalFiles = e.dataTransfer.items;
//     drop = true;
//   }

//   try {
//     let files = [];
//     if (drop) {
//       for (let item of originalFiles) {
//         if (item != null && item.kind == "file")
//           files.push(item.webkitGetAsEntry());
//       }
//     } else {
//       files = originalFiles;
//     }

//     console.log(files);

//     let difficulty = await FileParser.parseFiles(files, drop);

//     for (let diff in difficulty) {
//       const longestValue = Object.keys(difficulty[diff].hitSounds).reduce(
//         (a, b) =>
//           difficulty[diff].hitSounds[a].length >
//           difficulty[diff].hitSounds[b].length
//             ? a
//             : b
//       );

//       difficulty[diff].mainMusic = difficulty[diff].hitSounds[longestValue];
//     }
//     output.value = difficulty;
//   } catch (err) {
//     console.log("err", err);
//   } finally {
//   }
// };
</script>
