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
}
interface RibbitScore extends RibbitNote {
  length?: number;
}

interface RibbitNote {
  [key: string]: Array<[number, string | number]>;
}

interface RibbitLNMap {
  [key: string]: Array<Array<[number, string|number]>>;
}

interface CurrentPackage {
  measure: number | string;
  channel: number;
  events: number;
}

interface DeathPoint {
  [key: number]: string;
}