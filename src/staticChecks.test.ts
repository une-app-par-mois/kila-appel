/**
 * @jest-environment node
 */
// Contrôles automatiques du code de src/ (ticket 003), sur l'arbre syntaxique de TypeScript :
// CONV-03 (texte en dur dans le JSX), CONV-16 (couleur littérale), SEC-01 (réseau),
// SEC-03 (jeton de notification). CONV-17 (console.*) est contrôlé par Biome (noConsole).
import { readdirSync, readFileSync } from 'node:fs';
import { join, relative } from 'node:path';
import ts from 'typescript';

type Violation = { rule: string; file: string; line: number };

// Libellés : un fichier par domaine dans ce dossier (décision du porteur du 2026-11-27).
const LABELS_DIR = 'src/config/libelles/';
const THEME_FILE = 'src/config/theme.ts';
const TEXT_PROPS = new Set(['accessibilityLabel', 'accessibilityHint', 'placeholder', 'title']);
// Une chaîne qui est entièrement une couleur (un texte contenant « #123 » n'en est pas une).
const COLOR = /^\s*(#([0-9a-f]{3,4}|[0-9a-f]{6}|[0-9a-f]{8})|(rgb|hsl)a?\s*\(.*\))\s*$/i;
// SEC-01 : API réseau, et chargement de police par expo-font à l'exécution (décision du
// porteur du 2026-11-26 : polices embarquées au build seulement).
const NETWORK = new Set([
  'fetch',
  'XMLHttpRequest',
  'WebSocket',
  'EventSource',
  'sendBeacon',
  'loadAsync',
  'useFonts',
]);
// SEC-01, ABS-01 : composants de react-native-svg qui chargent un SVG par une adresse (décision du
// porteur du 2026-11-26 : dépendance acceptée, ces imports interdits).
const SVG_LOADERS = new Set([
  'SvgUri',
  'SvgCssUri',
  'SvgFromUri',
  'LocalSvg',
  'WithLocalSvg',
  'fetchText',
]);
const REMOTE_URI = /^(https?|wss?):/i;
// Attributs JSX qui chargent une ressource (Image de react-native-svg, etc.), et SVG en texte
// contenant une adresse distante.
const URI_ATTRIBUTES = new Set(['href', 'xlinkHref', 'uri']);
const REMOTE_IN_TEXT = /(https?|wss?):\/\//i;

/** Texte d'un attribut JSX : "…" ou {'…'}. */
const attributeText = (value: ts.JsxAttributeValue | undefined): string | undefined => {
  if (value === undefined) return undefined;
  if (ts.isJsxExpression(value)) return value.expression && literalText(value.expression);
  return literalText(value);
};
const PUSH_TOKEN = new Set(['getExpoPushTokenAsync', 'getDevicePushTokenAsync']);

const isText = (node: ts.Node | undefined): boolean =>
  node !== undefined && (ts.isStringLiteral(node) || ts.isTemplateLiteral(node));

/** Texte en dur dans une expression : directement, ou dans une condition, `+`, `??`, `||`. */
const containsText = (node: ts.Node | undefined): boolean => {
  if (node === undefined) return false;
  if (isText(node)) return true;
  if (ts.isParenthesizedExpression(node)) return containsText(node.expression);
  if (ts.isConditionalExpression(node)) {
    return containsText(node.whenTrue) || containsText(node.whenFalse);
  }
  if (ts.isBinaryExpression(node)) return containsText(node.left) || containsText(node.right);
  return false;
};

/** Valeur d'une chaîne sans substitution, sinon undefined. */
const literalText = (node: ts.Node): string | undefined =>
  ts.isStringLiteral(node) || ts.isNoSubstitutionTemplateLiteral(node) ? node.text : undefined;

/** Liste les écarts d'un fichier. `file` est relatif à la racine du dépôt. */
const check = (file: string, source: string): Violation[] => {
  const kind = file.endsWith('.tsx') ? ts.ScriptKind.TSX : ts.ScriptKind.TS;
  const tree = ts.createSourceFile(file, source, ts.ScriptTarget.Latest, true, kind);
  const isTest = /\.test\.tsx?$/.test(file);
  const found: Violation[] = [];
  const add = (rule: string, node: ts.Node) =>
    found.push({ rule, file, line: tree.getLineAndCharacterOfPosition(node.getStart()).line + 1 });

  const visit = (node: ts.Node) => {
    if (!isTest && !file.startsWith(LABELS_DIR)) {
      if (ts.isJsxText(node) && node.getText().trim() !== '') add('CONV-03', node);
      if (
        ts.isJsxExpression(node) &&
        (ts.isJsxElement(node.parent) || ts.isJsxFragment(node.parent)) &&
        containsText(node.expression)
      ) {
        add('CONV-03', node);
      }
      if (ts.isJsxAttribute(node) && TEXT_PROPS.has(node.name.getText())) {
        const value = node.initializer;
        if (
          isText(value) ||
          (value && ts.isJsxExpression(value) && containsText(value.expression))
        ) {
          add('CONV-03', node);
        }
      }
    }
    const text = literalText(node);
    if (!isTest && file !== THEME_FILE && text !== undefined && COLOR.test(text)) {
      add('CONV-16', node);
    }
    if (ts.isIdentifier(node) && (NETWORK.has(node.text) || SVG_LOADERS.has(node.text))) {
      add('SEC-01', node);
    }
    // globalThis['fetch'] : le nom passe par une chaîne.
    if (ts.isElementAccessExpression(node)) {
      const key = literalText(node.argumentExpression);
      if (key !== undefined && (NETWORK.has(key) || SVG_LOADERS.has(key))) add('SEC-01', node);
    }
    // Ressource chargée à l'exécution : { uri: 'https://…' } (image, son, police).
    if (ts.isPropertyAssignment(node) && node.name.getText() === 'uri') {
      const uri = literalText(node.initializer);
      if (uri !== undefined && REMOTE_URI.test(uri)) add('SEC-01', node);
    }
    if (ts.isJsxAttribute(node)) {
      const name = node.name.getText();
      const value = attributeText(node.initializer);
      if (value !== undefined && URI_ATTRIBUTES.has(name) && REMOTE_URI.test(value)) {
        add('SEC-01', node);
      }
      if (value !== undefined && name === 'xml' && REMOTE_IN_TEXT.test(value)) add('SEC-01', node);
    }
    if (ts.isIdentifier(node) && PUSH_TOKEN.has(node.text)) add('SEC-03', node);
    ts.forEachChild(node, visit);
  };
  visit(tree);
  return found;
};

const rules = (file: string, source: string) => check(file, source).map((v) => v.rule);

describe('CONV-03 texte de l’interface seulement dans src/config/libelles/', () => {
  it.each([
    ['texte entre balises', '<Text>Faire l’appel</Text>'],
    ['chaîne entre accolades', "<Text>{'Faire l’appel'}</Text>"],
    ['gabarit entre accolades', '<Text>{`Appel`}</Text>'],
    ['libellé d’accessibilité', '<Pressable accessibilityLabel="Valider" />'],
    ['placeholder entre accolades', "<TextInput placeholder={'Nom'} />"],
    ['chaîne dans un fragment', "<>{'Faire l’appel'}</>"],
    ['texte dans un fragment', '<>Faire l’appel</>'],
    ['condition', "<Text>{ok ? 'Oui' : 'Non'}</Text>"],
    ['concaténation', "<Text>{'Appel ' + n}</Text>"],
    ['valeur par défaut', "<Text>{name ?? 'Aucun'}</Text>"],
  ])('repère %s', (_cas, jsx) => {
    expect(rules('src/app/Screen.tsx', `const A = () => ${jsx};`)).toEqual(['CONV-03']);
  });

  it('laisse passer les libellés importés, les espaces et les autres attributs', () => {
    const jsx =
      '<View testID="appel"><Text accessibilityLabel={labels.save}> {labels.title} </Text>' +
      "{items.map((i) => <Item key={'k' + i} />)}{ok ? labels.yes : labels.no}</View>";
    expect(rules('src/app/Screen.tsx', `const A = () => ${jsx};`)).toEqual([]);
  });

  it('autorise le texte dans le dossier des libellés, et seulement là', () => {
    // Les libellés ne contiennent pas de JSX : l'exception est vérifiée sur un chemin en .tsx.
    const jsx = 'const A = () => <Text>Ki&amp;La</Text>;';
    expect(rules('src/app/Screen.tsx', jsx)).toEqual(['CONV-03']);
    expect(rules(`${LABELS_DIR}commun.tsx`, jsx)).toEqual([]);
    expect(rules('src/config/libelles-ecran.tsx', jsx)).toEqual(['CONV-03']);
  });
});

describe('CONV-16 couleurs seulement dans le thème', () => {
  it.each(["'#1F3A93'", "'#fff'", "'rgb(31, 58, 147)'", "'rgba(0,0,0,0.5)'", "'hsl(220 65% 35%)'"])(
    'repère %s hors du thème',
    (color) => {
      expect(rules('src/ui/Card.tsx', `const s = { color: ${color} };`)).toEqual(['CONV-16']);
    },
  );

  it('laisse passer une couleur du thème et un texte qui contient un dièse', () => {
    const source =
      "const s = { color: theme.colors.encre }; const t = 'Séance n° #123'; const u = 'n° #cafe';";
    expect(rules('src/ui/Card.tsx', source)).toEqual([]);
  });

  it('autorise les couleurs dans theme.ts', () => {
    expect(rules(THEME_FILE, "const c = '#1F3A93';")).toEqual([]);
  });
});

describe('SEC-01 aucun appel réseau, SEC-03 aucun jeton de notification', () => {
  it.each([
    ['SEC-01', "fetch('https://exemple.invalid');"],
    ['SEC-01', 'const x = new XMLHttpRequest();'],
    ['SEC-01', "const w = new WebSocket('wss://exemple.invalid');"],
    ['SEC-01', "globalThis.fetch('/');"],
    ['SEC-01', "globalThis['fetch']('/');"],
    ['SEC-01', "const e = new EventSource('/flux');"],
    ['SEC-01', 'navigator.sendBeacon(u, d);'],
    ['SEC-01', "const i = { source: { uri: 'https://exemple.invalid/a.png' } };"],
    ['SEC-01', "await Font.loadAsync({ plex: 'https://exemple.invalid/p.ttf' });"],
    ['SEC-01', 'const [loaded] = useFonts(fonts);'],
    ['SEC-01', "import { SvgUri } from 'react-native-svg';"],
    ['SEC-01', "import { SvgCssUri as S } from 'react-native-svg/css';"],
    ['SEC-01', 'const s = svg.SvgFromUri;'],
    ['SEC-01', "const s = svg['SvgUri'];"],
    ['SEC-01', 'const i = <Image href="https://exemple.invalid/a.png" />;'],
    ['SEC-01', "const i = <Image xlinkHref={'http://exemple.invalid/a.png'} />;"],
    ['SEC-01', 'const i = <Video source={{ uri }} uri="wss://exemple.invalid" />;'],
    [
      'SEC-01',
      'const x = <SvgXml xml=\'<svg><image href="https://exemple.invalid/a.png"/></svg>\' />;',
    ],
    ['SEC-01', "import { LocalSvg } from 'react-native-svg/css';"],
    ['SEC-03', 'await Notifications.getExpoPushTokenAsync();'],
    ['SEC-03', "import { getDevicePushTokenAsync } from 'expo-notifications';"],
  ])('%s repère : %s', (rule, source) => {
    expect(rules('src/data/sync.tsx', source)).toEqual([rule]);
  });

  it('laisse passer une adresse locale et un SVG embarqué sans adresse', () => {
    const source =
      'const a = <Image href={icon} />; const b = <SvgXml xml="<svg><path d=\'M0 0\'/></svg>" />;';
    expect(rules('src/ui/A.tsx', source)).toEqual([]);
  });

  it('s’applique aussi aux fichiers de test, mais pas au texte d’une chaîne', () => {
    expect(rules('src/data/a.test.ts', 'fetch();')).toEqual(['SEC-01']);
    expect(rules('src/data/a.ts', "const m = 'pas de fetch ici';")).toEqual([]);
  });
});

describe('Le code du dépôt respecte les contrôles', () => {
  const root = join(__dirname, '..');
  const walk = (dir: string): string[] =>
    readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
      const path = join(dir, entry.name);
      if (entry.isDirectory()) return walk(path);
      return /\.tsx?$/.test(entry.name) && !entry.name.endsWith('.d.ts') ? [path] : [];
    });

  it('aucun écart dans src/', () => {
    const files = walk(join(root, 'src'));
    expect(files.length).toBeGreaterThan(5);
    const violations = files.flatMap((path) =>
      check(relative(root, path), readFileSync(path, 'utf8')),
    );
    expect(violations).toEqual([]);
  });

  // EX-14 (ticket 011) : aucune requête de statistiques ou d'historique ne lit le brouillon. Seuls
  // ces fichiers de l'appli nomment ses tables : schéma, dépôt du brouillon, effacement à
  // l'enregistrement, et ce que supprimer une saison ou un créneau emporte.
  it('EX-14 seuls les fichiers autorisés nomment les tables du brouillon', () => {
    const allowed = [
      'src/data/migrations.ts',
      'src/data/draftsRepo.ts',
      'src/data/sessionsRepo.ts',
      'src/data/seasonsRepo.ts',
      'src/data/slotsRepo.ts',
    ];
    const naming = walk(join(root, 'src'))
      .map((path) => relative(root, path))
      .filter((file) => !/\.test\.tsx?$/.test(file) && !file.startsWith('src/__fixtures__/'))
      .filter((file) => /roll_call_draft/.test(readFileSync(join(root, file), 'utf8')));
    expect(naming.sort()).toEqual(allowed.sort());
  });

  // ABS-01 (décision du porteur du 2026-11-26) : react-native-worklets, imposé par Expo, embarque
  // fetch et XMLHttpRequest, actifs seulement en « Bundle Mode ». Ce mode s'active par la
  // configuration Babel ou Metro : aucune configuration du dépôt ne doit le demander.
  it('ABS-01 le « Bundle Mode » de react-native-worklets (son réseau) n’est demandé nulle part', () => {
    const names = readdirSync(root, { withFileTypes: true }).map((entry) => entry.name);
    const configs = names.filter((name) =>
      /^(babel|metro)\.config\.|^\.babelrc|^app\.(json|config\.)|^package\.json$/.test(name),
    );
    expect(configs).toContain('package.json');
    const asking = configs.filter((name) =>
      /bundleMode/i.test(readFileSync(join(root, name), 'utf8')),
    );
    expect(asking).toEqual([]);
  });
});
