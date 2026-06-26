interface OJNHeader {
  song_id: number;
  signature: number;
  encode_version: number;
  genre: number;
  bpm: number;
  difficulty: Difficulty;
  old_encode_version: number;
  old_song_id: number;
  old_genre: string;
  bmp_size: number;
  old_file_version: number;
  title: string;
  artist: string;
  noter: string;
  ojm_file: string;
  cover_size: number;
  cover_offset: number;
  image: string;
  bmp: string;
}

type OjnDifficulty = "easy" | "normal" | "hard";

interface Difficulty {
  easy: DifficultyDetails;
  normal: DifficultyDetails;
  hard: DifficultyDetails;
}

interface DifficultyDetails {
  level: number;
  note_count: number;
  event_count: number;
  measure_count: number;
  package_count: number;
  duration: number;
  note_offset: number;
}

interface Ribbit {
  artist: string;
  bpm: number;
  genre: string;
  keys: number;
  lnmap: RibbitLNMap;
  notes: number;
  score: RibbitScore[];
  title: string;
  total: string;
  obj: string;
  unit: number;
}
interface ConvertedOJN {
  header: OJNHeader;
  ribbit: Ribbit;
  hard: HardType;
  hitSounds?: HitSound;
  rawOjnBuffer?: ArrayBuffer;
}
interface RibbitScore extends RibbitNote {
  length?: number;
}

interface HitSound {
  [key: string]: string;
}

interface RibbitNote {
  [key: string]: Array<[number, string | number, number?, number?, number?]>;
}

interface RibbitLNMap {
  [key: string]: Array<Array<[number, string | number]>>;
}

interface CurrentPackage {
  measure: number | string;
  channel: number;
  events: number;
}

interface DeathPoint {
  [key: number]: string;
}

interface Common {
  volume: any;
  pan: any;
  hitSound: any;
  start?: boolean;
}

interface TimingLine {
  beat: number;
  bpm?: number;
  time?: number;
}

interface TimingPoint {
  t: number;
  x: number;
  dx: number;
  bpm: number;
  inclusive: boolean;
}

interface NoteLine extends Common {
  beat: number;
  key: number;
  timing: number;
  objectName?: string;
  startTime?: number;
  endTime?: number;
  endHitSound?: number;
  soundTypes: string[];
}

interface TimeSound extends Common {
  beat: number;
  name: number;
  startTime?: number;
}

interface HardType {
  nbNotes: number;
  nbLns: number;
  timingLines: any[];
  timingPoints: any[];
  noteLines: any[];
  notes: any[];
  timeSounds: any[];
}
