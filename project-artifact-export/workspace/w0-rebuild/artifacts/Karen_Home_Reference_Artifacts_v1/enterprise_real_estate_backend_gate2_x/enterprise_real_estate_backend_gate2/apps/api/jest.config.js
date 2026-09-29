module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  roots: ['<rootDir>/src', '<rootDir>/test'],
  moduleNameMapper: {
    '^@platform/db$': '<rootDir>/../../packages/db/src',
    '^@platform/contracts$': '<rootDir>/../../packages/contracts/src',
  },
  collectCoverageFrom: ['src/**/*.ts'],
};
