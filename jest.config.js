// Tests Jest (docs/CONVENTIONS.md §5). Aucun test n'appelle le réseau (ABS-01).

// Fuseau fixé avant le démarrage des workers, qui copient l'environnement : les tests de la
// relance (ticket 028a) passent par les changements d'heure de Paris, et la CI tourne en UTC.
// Posé dans un fichier de test, il n'aurait aucun effet.
process.env.TZ = 'Europe/Paris';

/** @type {import('jest').Config} */
module.exports = {
  preset: 'jest-expo',
  // Animations (008b) : résolveur publié par Reanimated pour Jest ; expo-router/testing-library
  // installe ensuite les imitations de gesture-handler et de Reanimated.
  resolver: 'react-native-reanimated/jest/resolver',
  setupFiles: ['<rootDir>/jest.setup.js'],
  roots: ['<rootDir>/src', '<rootDir>/scripts', '<rootDir>/plugins'],
  moduleNameMapper: {
    '^@/(.*)$': '<rootDir>/src/$1',
    // Lucide publie ses modules ES en .mjs, que Jest ne transforme pas : version CommonJS du même paquet.
    '^lucide-react-native/icons/(.*)$':
      '<rootDir>/node_modules/lucide-react-native/dist/cjs/icons/$1.js',
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
