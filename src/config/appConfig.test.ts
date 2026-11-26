import app from '../../app.json';

// Configuration native (ticket 004). Le binaire construit est audité à part : scripts/audit-apk.js.
const expo = app.expo as typeof app.expo & {
  scheme?: string;
  android: { allowBackup?: boolean; blockedPermissions?: string[]; permissions?: string[] };
  ios: { config?: { usesNonExemptEncryption?: boolean } };
};

describe('Configuration Expo (ABS-01, ABS-06, ABS-07)', () => {
  it('nom de paquet com.jitavision.kila sur Android et iOS, portrait', () => {
    expect(expo.android.package).toBe('com.jitavision.kila');
    expect(expo.ios.bundleIdentifier).toBe('com.jitavision.kila');
    expect(expo.orientation).toBe('portrait');
  });

  it('ABS-01 INTERNET bloquée, aucune permission demandée', () => {
    expect(expo.android.blockedPermissions).toContain('android.permission.INTERNET');
    expect(expo.android.permissions).toEqual([]);
  });

  it('ABS-07 bloque les permissions ajoutées par défaut par Expo, inutiles à l’appli', () => {
    expect(expo.android.blockedPermissions).toEqual(
      expect.arrayContaining([
        'android.permission.READ_EXTERNAL_STORAGE',
        'android.permission.SYSTEM_ALERT_WINDOW',
        'android.permission.VIBRATE',
        'android.permission.WRITE_EXTERNAL_STORAGE',
      ]),
    );
  });

  it('ABS-07 aucun lien profond (scheme)', () => {
    expect(expo.scheme).toBeUndefined();
  });

  it('sauvegarde système Android désactivée (données hors de l’appareil)', () => {
    expect(expo.android.allowBackup).toBe(false);
  });

  it('ABS-06 aucun chiffrement non exempté déclaré à Apple', () => {
    expect(expo.ios.config?.usesNonExemptEncryption).toBe(false);
  });
});
