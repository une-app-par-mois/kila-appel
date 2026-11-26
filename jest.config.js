// Tests Jest (docs/CONVENTIONS.md §5). Aucun test n'appelle le réseau (ABS-01).
/** @type {import('jest').Config} */
module.exports = {
  preset: 'jest-expo',
  roots: ['<rootDir>/src', '<rootDir>/scripts', '<rootDir>/plugins'],
  moduleNameMapper: {
    '^@/(.*)$': '<rootDir>/src/$1',
    // Lucide publie ses modules ES en .mjs, que Jest ne transforme pas : version CommonJS du même paquet.
    '^lucide-react-native$':
      '<rootDir>/node_modules/lucide-react-native/dist/cjs/lucide-react-native.js',
  },
  collectCoverageFrom: [
    'src/domain/**/*.{ts,tsx}',
    'src/data/**/*.{ts,tsx}',
    '!**/*.test.{ts,tsx}',
    '!**/*.d.ts',
  ],
  // CONV §5.3 : seuils sur le domaine et les données ; ils ne baissent jamais.
  coverageThreshold: {
    './src/domain/': { lines: 90, branches: 85 },
    './src/data/': { lines: 90, branches: 85 },
  },
};
