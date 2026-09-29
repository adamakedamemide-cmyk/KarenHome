module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  roots: ['<rootDir>/src', '<rootDir>/test'],
  moduleNameMapper: {
    '^@platform/db$': '<rootDir>/../../packages/db/src',
    '^@platform/contracts$': '<rootDir>/../../packages/contracts/src',
  },
  transform: {
    '^.+\.ts$': ['ts-jest', { tsconfig: '<rootDir>/tsconfig.json' }],
    '^.+\.[cm]?js$': ['babel-jest', { presets: [['@babel/preset-env', { targets: { node: 'current' }, modules: 'commonjs' }]] }],
  },
  transformIgnorePatterns: ['node_modules/(?!.*jose)'],
  collectCoverageFrom: ['src/**/*.ts'],
};
