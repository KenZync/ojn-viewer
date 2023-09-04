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
