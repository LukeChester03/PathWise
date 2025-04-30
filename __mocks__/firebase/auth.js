export const initializeAuth = jest.fn();
export const getReactNativePersistence = jest.fn();
export const getAuth = jest.fn(() => ({
  currentUser: {
    uid: "mock-uid",
    email: "mock@email.com",
  },
}));
