import { Buffer } from "buffer";
import iconv from "iconv-lite";

const OJN_SIGNATURE = 0x006e6a6f;
const dec = new TextDecoder("utf-8");

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

export const convert: (
  ojn: ArrayBufferLike,
  death: DeathPoint,
  hitSounds: HitSound
) => ConvertedOJN = (
  ojn: ArrayBufferLike,
  death: DeathPoint,
  hitSounds: HitSound
) => {
  var header: OJNHeader = {
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

  var hard: HardType = {
    nbNotes: 0,
    nbLns: 0,
    timingLines: [],
    timingPoints: [],
    noteLines: [],
    notes: [],
    timeSounds: [],
  };

  var parseTimingPoint = function (beat: number, bpm: number) {
    if (bpm == 0) return;
    hard.timingLines.push({ beat, bpm });
  };

  function parseCommon(event: {
    hitSound: number;
    volumePan: number;
    type: number;
  }) {
    if (event.hitSound === 0) return;

    // MIN 1 ~ 15 MAX, special 0 = MAX
    let volume = ((event.volumePan >> 4) & 0x0f) / 16;
    if (volume === 0) volume = 1;

    // LEFT 1 ~ 8 CENTER 8 ~ 15 RIGHT, special: 0 = 8
    let pan = event.volumePan & 0x0f;
    if (pan === 0) pan = 8;
    pan -= 8;
    pan /= 7;

    event.hitSound--;

    if (event.type % 8 > 3) event.hitSound += 1000;

    return <Common>{ volume, pan, hitSound: event.hitSound };
  }

  var getTiming = function (beat: number, size: number) {
    var divs = 3 * 128;
    var val = (beat * divs) / size;
    if (val % (divs / 4) === 0) {
      return 1;
    } else if (val % (divs / 8) === 0) {
      return 2;
    } else if (val % (divs / 12) === 0) {
      return 3;
    } else if (val % (divs / 16) === 0) {
      return 4;
    } else if (val % (divs / 24) === 0) {
      return 6;
    } else if (val % (divs / 32) === 0) {
      return 8;
    } else if (val % (divs / 48) === 0) {
      return 12;
    } else if (val % (divs / 64) === 0) {
      return 16;
    }
    return 16;
  };

  var processTimingPoints = function () {
    hard.timingLines.sort((a, b) =>
      a.beat == b.beat ? (a.time ? 1 : -1) : a.beat - b.beat
    );
    for (let i = 1; i < hard.timingLines.length; i++) {
      if (
        hard.timingLines[i].beat == hard.timingLines[i - 1].beat &&
        hard.timingLines[i].bpm == hard.timingLines[i - 1].bpm &&
        hard.timingLines[i].time == hard.timingLines[i - 1].time
      ) {
        hard.timingLines.splice(i, 1);
        i--;
      }
    }

    let currentBPM = header.bpm;
    let currentBeat = 0;
    let currentTime = 0;
    hard.timingPoints.push({
      t: currentTime,
      x: currentBeat,
      dx: currentBPM / 60000,
      bpm: currentBPM,
      inclusive: true,
    });
    for (let timing of hard.timingLines) {
      let beat = timing.beat;
      let time = currentTime + ((beat - currentBeat) * 60000) / currentBPM;
      if (timing.bpm) {
        currentBPM = timing.bpm;
        hard.timingPoints.push({
          t: time,
          x: beat,
          dx: currentBPM / 60000,
          bpm: currentBPM,
          inclusive: true,
        });
      } else {
        // i dont know what to doooo
      }
      currentBeat = beat;
      currentTime = time;
    }
  };

  var processNotes = function () {
    hard.noteLines.sort((a, b) => a.beat - b.beat);
    for (let i = 1; i < hard.noteLines.length; i++) {
      if (
        hard.noteLines[i].beat == hard.noteLines[i - 1].beat &&
        hard.noteLines[i].key == hard.noteLines[i - 1].key
      ) {
        hard.noteLines.splice(i, 1);
        i--;
      }
    }

    let pendingLns: any[] = [];
    for (let note of hard.noteLines) {
      if (
        note.objectName == "note" &&
        pendingLns.find((ln) => ln.key == note.key) == null
      ) {
        note.startTime = getTime(note.beat);
        hard.nbNotes++;
        hard.notes.push(note);
      } else if (
        note.objectName == "longnote" &&
        note.start &&
        pendingLns.find((ln) => ln.key == note.key) == null
      ) {
        note.startTime = getTime(note.beat);
        hard.nbLns++;
        hard.notes.push(note);
        pendingLns.push(note);
      } else {
        let ln = pendingLns.find((ln) => ln.key == note.key);
        if (ln == null) continue;
        pendingLns = pendingLns.filter((ln) => ln.key != note.key);
        ln.endTime = getTime(note.beat);
        ln.endHitSound = note.hitSound;
      }
    }
  };

  var processTimeSounds = function () {
    hard.timeSounds.sort((a, b) => a.beat - b.beat);
    for (let i = 1; i < hard.timeSounds.length; i++) {
      if (
        hard.timeSounds[i].beat == hard.timeSounds[i - 1].beat &&
        hard.timeSounds[i].name == hard.timeSounds[i - 1].name
      ) {
        hard.timeSounds.splice(i, 1);
        i--;
      }
    }

    for (let timeSound of hard.timeSounds) {
      timeSound.startTime = getTime(timeSound.beat);
    }
  };

  var getTime = function (beat: number) {
    let timingPoint = getTimingPoint(beat);
    return (beat - timingPoint.x) / (timingPoint.dx || 1) + timingPoint.t;
  };

  var getTimingPoint = function (beat: number) {
    for (let i = 0; i < hard.timingPoints.length; i++) {
      if (hard.timingPoints[i + 1]) {
        if (
          hard.timingPoints[i + 1].inclusive &&
          beat <= hard.timingPoints[i + 1].x
        ) {
          return hard.timingPoints[i];
        } else if (
          !hard.timingPoints[i + 1].inclusive &&
          beat < hard.timingPoints[i + 1].x
        ) {
          return hard.timingPoints[i];
        }
      } else {
        return hard.timingPoints[i];
      }
    }
  };

  var score: RibbitScore[] = [];
  var lnmap: RibbitLNMap = {};

  let dataview = new DataView(ojn);
  let cursor = 0;

  header.song_id = dataview.getInt32(cursor, true);
  cursor += 4;
  header.signature = dataview.getInt32(cursor, true);
  cursor += 4;

  if (header.signature != OJN_SIGNATURE) throw "OJN_SIGNATURE ERROR";

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

  let note = 0;
  for (let i = 0; i < header.difficulty.hard.package_count; i++) {
    let current_package: CurrentPackage = {
      measure: 0,
      channel: 0,
      events: 0,
    };
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

    for (let j = 0; j < current_package.events; j++) {
      let beat = (current_package.measure + j / current_package.events) * 4;
      let bpm = dataview.getFloat32(cursor, true);
      if (current_package.channel == 0 || current_package.channel == 1) {
        cursor += 4;
        if (bpm !== 0) {
          const beat_bpm: [number, number | string] = [
            (j / current_package.events) * 192,
            bpm,
          ];

          if (!score[current_package.measure]["03"]) {
            score[current_package.measure]["03"] = [];
          }

          // score[current_package.measure][key].push( [j,'00'] );

          // if (score[current_package.measure]) {
          //   // Check if the value already exists in the array
          // const valueExists = score[current_package.measure]["03"].some(
          //   (item: [number, string | number]) =>
          //     item[0] === beat_bpm[0] && item[1] === beat_bpm[1]
          // );
          // if (!valueExists) {
          //   // If the value doesn't exist, push it to the array
          //   score[current_package.measure]["03"].push(beat_bpm);
          // }
          score[current_package.measure]["03"].push(beat_bpm);
          parseTimingPoint(beat, bpm);
        }
      } else if (current_package.channel > 8) {
        let event: any = {};
        event.hitSound = dataview.getInt16(cursor, true);
        cursor += 2;
        event.volumePan = dataview.getInt8(cursor);
        cursor += 1;
        event.type = dataview.getInt8(cursor);
        cursor += 1;

        const commonData = parseCommon(event);

        if (commonData) {
          hard.timeSounds.push({
            beat,
            name: commonData.hitSound,
            ...commonData,
          });
        }
      } else {
        let event: any = {};
        event.hitSound = dataview.getInt16(cursor, true);
        cursor += 2;
        event.volumePan = dataview.getInt8(cursor);
        cursor += 1;
        event.type = dataview.getInt8(cursor);
        cursor += 1;

        if (event.hitSound == 0) {
          continue;
        }

        let ribbit_key =
          keyMapping[current_package.channel as keyof typeof keyMapping];

        if (!score[current_package.measure][ribbit_key]) {
          score[current_package.measure][ribbit_key] = [];
        }

        const commonData = parseCommon(event);
        if (commonData) {
          event.type %= 4;

          let objectName;
          switch (event.type) {
            case 0:
              score[current_package.measure][ribbit_key].push([
                (j / current_package.events) * 192,
                "00",
              ]);
              objectName = "note";
              break;
            case 2:
              if (!lnmap[ribbit_key]) {
                lnmap[ribbit_key] = [];
              }
              lnmap[ribbit_key].push([
                [current_package.measure, (j / current_package.events) * 192],
                [current_package.measure, (j / current_package.events) * 192],
              ]);
              objectName = "longnote";
              commonData.start = true;
              break;
            case 3:
              lnmap[ribbit_key][lnmap[ribbit_key].length - 1][1] = [
                current_package.measure,
                (j / current_package.events) * 192,
              ];
              objectName = "longnote";
              commonData.start = false;
              break;
          }

          let key = current_package.channel - 2;
          let timing = getTiming(j, current_package.events);
          hard.noteLines.push({
            beat,
            key,
            timing,
            objectName,
            ...commonData,
            soundTypes: [],
          });
        }

        note++;

        if (!score[current_package.measure]["99"]) {
          score[current_package.measure]["99"] = [];
        }

        if (death) {
          if (Object.keys(death).includes(note.toString())) {
            if (death[note] != null) {
              const output: [number, string] = [
                (j / current_package.events) * 192,
                death[note],
              ];
              score[current_package.measure]["99"].push(output);
            }
          }
        }
      }
    }
  }

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

  let headerBpm = header.bpm;
  let previousBpm = header.bpm;

  let beatNow = 0;
  let beatNext = 0;
  let bpmNow = 0;
  let timeCount = 0;
  score.forEach((item, m) => {
    if (item["03"] == null) {
      item["88"] = [];
      let dura = (4 * 60000) / previousBpm;
      item["88"].push([0, previousBpm, 192, dura, timeCount]);
      timeCount = timeCount + dura;
      return;
    }

    const newItem = [...item["03"]];
    item["88"] = newItem;

    if (item["88"][0][0] != 0) {
      item["88"].unshift([0, previousBpm]);
    }

    item["88"].forEach((line, indexGreenLine) => {
      bpmNow = Number(line[1]);
      beatNow = line[0];
      try {
        beatNext = score[m]["88"][indexGreenLine + 1][0];
      } catch (error) {
        beatNext = 192;
      }
      let duration = (((beatNext - beatNow) / 48) * 60000) / bpmNow;
      item["88"][indexGreenLine].push(beatNext, duration, timeCount);
      timeCount = timeCount + duration;
    });

    previousBpm = Number(item["88"][item["88"].length - 1][1]);
  });

  let ribbit: Ribbit = {
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
  };

  let output: ConvertedOJN = { header, ribbit, hard, hitSounds };

  processTimingPoints();

  processNotes();

  processTimeSounds();

  return output;
};
