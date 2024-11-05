export const useSeed = () => {
  return useState("seed", () => "1234567");
};

export const useOhm = () => {
    return useState("ohm", () => "all");
};

export const useNoLN = () => {
  return useState("noLN", () => false);
};

