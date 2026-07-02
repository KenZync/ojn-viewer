export const useSeed = () => {
  return useState("seed", () => "1234567");
};

export const useOhm = () => {
    return useState("ohm", () => "all");
};

export const useNoLN = () => {
  return useState("noLN", () => false);
};

export const useVerticalMode = () => {
  return useState("verticalMode", () => false);
};

export const useScaleW = () => {
  return useState("scaleW", () => 7);
};

export const useScaleH = () => {
  return useState("scaleH", () => 2);
};

export const useNoteHeight = () => {
  return useState("noteHeight", () => 4);
};

export const useSelectedDifficulty = () => {
  return useState<OjnDifficulty>("selectedDifficulty", () => "hard");
};

export const useDebugMode = () => {
  return useState("debugMode", () => false);
};


