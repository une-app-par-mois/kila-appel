// Tests Jest (docs/CONVENTIONS.md §5). Aucun test n'appelle le réseau (ABS-01).
/** @type {import('jest').Config} */
module.exports = {
  preset: 'jest-expo',
  roots: ['<rootDir>/src'],
  moduleNameMapper: {
    '^@/(.*)$': '<rootDir>/src/$1',
  },
  collectCoverageFrom: [
    'src/domain/**/*.{ts,tsx}',
    'src/data/**/*.{ts,tsx}',
    '!**/*.test.{ts,tsx}',
  ],
  // CONV §5.3 : seuils sur le domaine et les données ; ils ne baissent jamais.
  coverageThreshold: {
    './src/domain/': { lines: 90, branches: 85 },
  },
};
