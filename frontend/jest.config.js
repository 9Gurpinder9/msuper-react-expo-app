/** @type {import('jest').Config} */
module.exports = {
  preset: 'jest-expo/web',
  testEnvironment: 'jsdom',
  setupFilesAfterEnv: ['<rootDir>/jest.setup.ts'],
  testPathIgnorePatterns: ['/node_modules/', '/dist/'],
  moduleNameMapper: {
    '^@theme$': '<rootDir>/src/theme/index.ts',
    '^@theme/(.*)$': '<rootDir>/src/theme/$1',
    '^@config$': '<rootDir>/config/index.ts',
    '^@super-admin/(.*)$': '<rootDir>/src/super-admin/$1',
    '^@utils/(.*)$': '<rootDir>/src/utils/$1',
  },
  transformIgnorePatterns: [
    'node_modules/(?!(jest-)?react-native|@react-native|@react-navigation|expo(nent)?|@expo|expo-router|react-native-paper|react-native-vector-icons)/',
  ],
};

