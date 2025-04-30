import { cleanup } from "@testing-library/react-native";

afterEach(() => {
  cleanup();
});

// Mock AsyncStorage
jest.mock("@react-native-async-storage/async-storage", () => ({
  getItem: jest.fn(() => Promise.resolve(null)),
  setItem: jest.fn(() => Promise.resolve()),
  removeItem: jest.fn(() => Promise.resolve()),
  clear: jest.fn(() => Promise.resolve()),
}));

// Mock firebase modules
jest.mock("firebase/app", () => ({
  initializeApp: jest.fn(),
}));

jest.mock("firebase/auth", () => {
  const originalAuth = jest.requireActual("firebase/auth");

  return {
    ...originalAuth,
    initializeAuth: jest.fn(),
    getReactNativePersistence: jest.fn(() => {
      return jest.fn(() => require("@react-native-async-storage/async-storage"));
    }),
    getAuth: jest.fn(() => ({
      currentUser: { uid: "mock-uid", email: "mock-email@example.com" },
      signOut: jest.fn().mockResolvedValue(null),
    })),
  };
});

jest.mock("firebase/firestore", () => ({
  getFirestore: jest.fn(),
  doc: jest.fn(),
  setDoc: jest.fn(),
  getDoc: jest.fn(),
  collection: jest.fn(),
  query: jest.fn(),
  where: jest.fn(),
  getDocs: jest.fn(),
  serverTimestamp: jest.fn(),
  GeoPoint: jest.fn(),
  Timestamp: {
    fromDate: jest.fn(),
  },
}));

// Mock Firebase analytics
jest.mock("firebase/analytics", () => ({
  isSupported: jest.fn(() => Promise.resolve(false)),
  logEvent: jest.fn(),
  setUserProperties: jest.fn(),
}));

// Mock expo-router
jest.mock("expo-router", () => ({
  useRouter: () => ({
    push: jest.fn(),
    replace: jest.fn(),
    back: jest.fn(),
  }),

  useNavigation: () => ({
    navigate: jest.fn(),
    goBack: jest.fn(),
  }),
}));

// Mock Ionicons
jest.mock("@expo/vector-icons", () => ({
  Ionicons: "Ionicons", // mock Ionicons with a placeholder string
}));

afterEach(() => {
  jest.clearAllMocks();
});
