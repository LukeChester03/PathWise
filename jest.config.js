module.exports = {
  preset: "jest-expo",
  setupFilesAfterEnv: ["<rootDir>/jest.setup.js"], // Only use this, not setupFiles
  moduleNameMapper: {
    "^@/(.*)$": "<rootDir>/app/$1",

    "^@/app/constants/colours$": "<rootDir>/app/constants/colours.ts",
    "^@react-native-async-storage/async-storage$":
      "<rootDir>/__mocks__/@react-native-async-storage/async-storage.ts",
    "\\.(jpg|jpeg|png|gif|webp|svg)$": "<rootDir>/__mocks__/fileMock.js",
    "^firebase/app$": "<rootDir>/__mocks__/firebase/app.js",
    "^firebase/firestore$": "<rootDir>/__mocks__/firebase/firestore.js",
    "^firebase/auth$": "<rootDir>/__mocks__/firebase/auth.js",
    "^react-native-gesture-handler$": "<rootDir>/__mocks__/react-native-gesture-handler.js",
    "expo-font": "<rootDir>/__mocks__/expo-font.js",
  },

  transformIgnorePatterns: [
    "node_modules/(?!(jest-)?react-native|@react-native|expo(nent)?|@expo(nent)?/.*|@react-native-async-storage/async-storage|firebase|@firebase)",
  ],
  watchPathIgnorePatterns: ["<rootDir>/\\.git/"],
};
