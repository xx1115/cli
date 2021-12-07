// "path-exists", "root-check"

export default {
  clearMocks: true,
  // collectCoverage: true,
  moduleNameMapper: {
    '@/(.*)': '<rootDir>/src/$1',
  },
  // roots: ['<rootDir>'],
  collectCoverageFrom: ['src/**/*.{ts,js,tsx,jsx}', '!src/bin/*.js'],
  // 配置有些包的源码是使用es6模块
  transformIgnorePatterns: [
    // ...es6Modules.map((item) => `<rootDir>/node_modules/(?!${item})`),
    '<rootDir>/node_modules/(?!execa)',
  ],
  moduleFileExtensions: ['js', 'json', 'ts'],
  testRegex: '.*\\.test\\.ts$',
  // transform: {
  //   '^.+\\.(t|j)s$': 'ts-jest',
  // },
  preset: 'ts-jest',
  coverageDirectory: './coverage',
  testEnvironment: 'node',
};
