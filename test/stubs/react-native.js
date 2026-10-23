// Stand in for react-native in the tests: only what glyphfox/native uses.
export const motion = { reduce: false };

export const AccessibilityInfo = {
  isReduceMotionEnabled: () => Promise.resolve(motion.reduce),
  addEventListener: () => ({ remove() {} }),
};
