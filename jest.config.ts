import type { Config } from "jest";

const config: Config = {
  preset: "ts-jest",
  testEnvironment: "node",
  testMatch: ["**/__tests__/**/*.test.ts"],
  clearMocks: true,
  restoreMocks: true,
  collectCoverageFrom: [
    "app/api/**/*.{ts,tsx}",
    "app/lib/**/*.{ts,tsx}",
    "app/middleware.ts",
    "!**/*.d.ts",
    "!**/node_modules/**",
  ],
  setupFilesAfterEnv: ["<rootDir>/__tests__/helpers/jest.setup.ts"],
  moduleNameMapper: {
    "^jose$": "<rootDir>/__tests__/helpers/joseMock.ts",
  }
};

export default config;
