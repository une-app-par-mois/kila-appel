// ABS-07 : aucun lien entrant. Expo ajoute toujours le nom de paquet comme scheme d'URL iOS
// (@expo/config-plugins, ios/Scheme.js) ; ce plugin le retire de l'Info.plist généré.
// Vérifié sur le binaire par scripts/audit-ios.js.
const { withInfoPlist } = require('expo/config-plugins');

const removeUrlSchemes = (infoPlist) => {
  const { CFBundleURLTypes: _removed, ...rest } = infoPlist;
  return rest;
};

const withoutUrlScheme = (config) =>
  withInfoPlist(config, (modConfig) => {
    modConfig.modResults = removeUrlSchemes(modConfig.modResults);
    return modConfig;
  });

module.exports = withoutUrlScheme;
module.exports.removeUrlSchemes = removeUrlSchemes;
