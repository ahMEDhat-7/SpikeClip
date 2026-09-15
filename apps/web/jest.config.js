module.exports = {
  testEnvironment: "jsdom",
  transform: {
    "^.+\\.tsx?$": "ts-jest",
  },
  moduleNameMapper: {
    "^@/(.*)$": "<rootDir>/src/$1",
  },
  setupFiles: ["<rootDir>/src/test-setup.ts"],
  testMatch: ["**/__tests__/**/*.test.{ts,tsx}"],
  testTimeout: 30000,
};
