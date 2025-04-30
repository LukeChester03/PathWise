// __mocks__/firebase.js
module.exports = {
  initializeApp: jest.fn(() => {
    return {}; // return a fake app object
  }),
  getFirestore: jest.fn(() => {
    return {}; // fake firestore object
  }),
  getAuth: jest.fn(() => {
    return {
      currentUser: {
        uid: "test-uid",
        email: "test@example.com",
      },
    };
  }),
  getAnalytics: jest.fn(() => {
    return {}; // fake analytics object
  }),
  getReactNativePersistence: jest.fn(), // optional if your code uses it
};
