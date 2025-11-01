// config/constants.js
export const KEYBIND_CONFIG = {
  MAX_SEQUENCE_TIME: 500,
  COMMANDS: [{ name: "FuzzyFinder", keybind: "ffq" }],
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

export const TIME_THRESHOLDS = {
  JUST_NOW: 60 * 1000,
  MINUTES: 60 * 60 * 1000,
  HOURS: 24 * 60 * 60 * 1000,
  DAYS: 7 * 24 * 60 * 60 * 1000,
};

export const RESTRICTED_URL = [
  "chrome://",
  "brave://",
  "edge://",
  "about:",
  "chrome-extension://",
  "moz-extension://",
];
