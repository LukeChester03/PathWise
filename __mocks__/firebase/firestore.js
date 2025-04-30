export const doc = jest.fn();
export const getDoc = jest.fn(() =>
  Promise.resolve({
    exists: () => true,
    data: () => ({}),
  })
);
export const setDoc = jest.fn(() => Promise.resolve());
export const serverTimestamp = jest.fn();
export const getFirestore = jest.fn(() => ({}));
