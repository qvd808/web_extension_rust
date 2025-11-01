// config/constants.js
export const KEYBIND_CONFIG = {
  MAX_SEQUENCE_TIME: 500,
  COMMANDS: [
    { name: "FuzzyFinder", keybind: "ffq" },
    {
      name: "GetLink",
      keybind: "ggl",
    },
  ],
};

export const UI_CONFIG = {
  IFRAME: {
    WIDTH: "900px",
    HEIGHT: "500px",
    BORDER_RADIUS: "8px",
    Z_INDEX: 999999,
  },
  SEARCH: {
    MAX_RESULTS: 50,
    DEBOUNCE_MS: 16,
  },
};

export const RESTRICTED_URL = [
  "chrome://",
  "brave://",
  "edge://",
  "about:",
  "chrome-extension://",
  "moz-extension://",
];
