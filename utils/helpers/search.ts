export const searchDeathPlayer = (
  deathPoint: DeathPoint,
  searchString: string
) => {
  const filteredDeathPoint: DeathPoint = {};

  // Split the searchString by comma to get individual search terms
  const searchTerms = searchString.split(",");

  // Iterate over the keys and values in the DeathPoint object
  for (const key in deathPoint) {
    if (Object.prototype.hasOwnProperty.call(deathPoint, key)) {
      const value = deathPoint[key];

      // Iterate over the search terms
      for (const term of searchTerms) {
        // Check if the value includes the search term (trimmed to remove leading/trailing spaces)
        if (value.includes(term.trim())) {
          // Convert key to a number and add it to the filteredDeathPoint object
          filteredDeathPoint[+key] = value;
          break; // Exit the loop after the first match for this key
        }
      }
    }
  }

  return filteredDeathPoint;
};

export const searchStringInDeathPoint = (dp: DeathPoint, search: string) => {
  search = search.toLowerCase(); // Convert search string to lowercase
  for (const key in dp) {
    if (dp[key].toLowerCase().includes(search)) {
      return true;
    }
  }
  return false;
};

export const normalizeFailData = (payload: unknown): DeathPoint => {
  const findFailDictionary = (value: unknown): Record<string, string> | null => {
    if (!value || typeof value !== "object") return null;

    if (Array.isArray(value)) {
      for (const item of value) {
        const res = findFailDictionary(item);
        if (res) return res;
      }
      return null;
    }

    const record = value as Record<string, unknown>;
    const keys = Object.keys(record);
    if (keys.length > 0 && keys.every(k => !isNaN(Number(k)))) {
      const result: Record<string, string> = {};
      for (const [k, v] of Object.entries(record)) {
        if (typeof v === "string") {
          result[k] = v;
        }
      }
      return result;
    }

    const preferredKeys = ["data", "results", "fail", "players", "items", "list", "values"];
    for (const key of preferredKeys) {
      if (record[key] !== undefined) {
        const res = findFailDictionary(record[key]);
        if (res) return res;
      }
    }

    for (const key of keys) {
      const res = findFailDictionary(record[key]);
      if (res) return res;
    }

    return null;
  };

  const dict = findFailDictionary(payload);
  if (!dict) return {};

  const result: DeathPoint = {};
  for (const [key, val] of Object.entries(dict)) {
    const numericKey = parseInt(key, 10);
    if (!isNaN(numericKey)) {
      result[numericKey] = val;
    }
  }
  return result;
};
