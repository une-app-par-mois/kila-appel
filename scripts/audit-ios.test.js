/**
 * @jest-environment node
 */
// Contrôles du binaire iOS (ABS-06, ABS-07, SEC-03), sur des Info.plist fictifs déjà lus en JSON.
const { auditIos } = require('./audit-ios');

const PLIST = { CFBundleIdentifier: 'com.jitavision.kila', ITSAppUsesNonExemptEncryption: false };

describe('Binaire iOS (ABS-06, ABS-07, SEC-03)', () => {
  it('ne signale rien pour un binaire conforme', () => {
    expect(auditIos(PLIST, {})).toEqual([]);
  });

  it('ABS-06 exige ITSAppUsesNonExemptEncryption = false', () => {
    const { ITSAppUsesNonExemptEncryption: _, ...without } = PLIST;
    expect(auditIos(without, {})).toEqual(['ITSAppUsesNonExemptEncryption doit valoir false']);
    expect(auditIos({ ...PLIST, ITSAppUsesNonExemptEncryption: true }, {})).toEqual([
      'ITSAppUsesNonExemptEncryption doit valoir false',
    ]);
  });

  it('ABS-07 refuse tout scheme d’URL (lien entrant)', () => {
    const plist = { ...PLIST, CFBundleURLTypes: [{ CFBundleURLSchemes: ['com.jitavision.kila'] }] };
    expect(auditIos(plist, {})).toEqual(['Scheme d’URL déclaré : com.jitavision.kila']);
  });

  it('SEC-03 refuse l’habilitation aps-environment (notifications push)', () => {
    expect(auditIos(PLIST, { 'aps-environment': 'production' })).toEqual([
      'Habilitation non attendue : aps-environment',
    ]);
  });
});
