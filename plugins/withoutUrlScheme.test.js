/**
 * @jest-environment node
 */
// ABS-07 : aucun lien entrant. Expo ajoute toujours le nom de paquet comme scheme d'URL iOS.
const { removeUrlSchemes } = require('./withoutUrlScheme');
const app = require('../app.json');

describe('ABS-07 plugin withoutUrlScheme', () => {
  it('retire CFBundleURLTypes et garde le reste de l’Info.plist', () => {
    const plist = {
      CFBundleURLTypes: [{ CFBundleURLSchemes: ['com.jitavision.kila'] }],
      ITSAppUsesNonExemptEncryption: false,
    };
    expect(removeUrlSchemes(plist)).toEqual({ ITSAppUsesNonExemptEncryption: false });
  });

  it('est déclaré dans app.json', () => {
    expect(app.expo.plugins).toContain('./plugins/withoutUrlScheme.js');
  });
});
