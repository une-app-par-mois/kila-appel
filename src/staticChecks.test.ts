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

const LABELS_FILE = 'src/config/libelles.ts';
const THEME_FILE = 'src/config/theme.ts';
const TEXT_PROPS = new Set(['accessibilityLabel', 'accessibilityHint', 'placeholder', 'title']);
const COLOR = /#[0-9a-f]{3,8}\b|\b(rgb|hsl)a?\s*\(/i;
const NETWORK = new Set(['fetch', 'XMLHttpRequest', 'WebSocket']);
const PUSH_TOKEN = new Set(['getExpoPushTokenAsync', 'getDevicePushTokenAsync']);

const isText = (node: ts.Node | undefined): boolean =>
  node !== undefined && (ts.isStringLiteral(node) || ts.isTemplateLiteral(node));

/** Liste les écarts d'un fichier. `file` est relatif à la racine du dépôt. */
const check = (file: string, source: string): Violation[] => {
  const kind = file.endsWith('.tsx') ? ts.ScriptKind.TSX : ts.ScriptKind.TS;
  const tree = ts.createSourceFile(file, source, ts.ScriptTarget.Latest, true, kind);
  const isTest = /\.test\.tsx?$/.test(file);
  const found: Violation[] = [];
  const add = (rule: string, node: ts.Node) =>
    found.push({ rule, file, line: tree.getLineAndCharacterOfPosition(node.getStart()).line + 1 });

  const visit = (node: ts.Node) => {
    if (!isTest && file !== LABELS_FILE) {
      if (ts.isJsxText(node) && node.getText().trim() !== '') add('CONV-03', node);
      if (ts.isJsxExpression(node) && ts.isJsxElement(node.parent) && isText(node.expression)) {
        add('CONV-03', node);
      }
      if (ts.isJsxAttribute(node) && TEXT_PROPS.has(node.name.getText())) {
        const value = node.initializer;
        if (isText(value) || (value && ts.isJsxExpression(value) && isText(value.expression))) {
          add('CONV-03', node);
        }
      }
    }
    if (!isTest && file !== THEME_FILE && isText(node) && COLOR.test(node.getText())) {
      add('CONV-16', node);
    }
    if (ts.isIdentifier(node) && NETWORK.has(node.text)) add('SEC-01', node);
    if (ts.isIdentifier(node) && PUSH_TOKEN.has(node.text)) add('SEC-03', node);
    ts.forEachChild(node, visit);
  };
  visit(tree);
  return found;
};

const rules = (file: string, source: string) => check(file, source).map((v) => v.rule);

describe('CONV-03 texte de l’interface seulement dans libelles.ts', () => {
  it.each([
    ['texte entre balises', '<Text>Faire l’appel</Text>'],
    ['chaîne entre accolades', "<Text>{'Faire l’appel'}</Text>"],
    ['gabarit entre accolades', '<Text>{`Appel`}</Text>'],
    ['libellé d’accessibilité', '<Pressable accessibilityLabel="Valider" />'],
    ['placeholder entre accolades', "<TextInput placeholder={'Nom'} />"],
  ])('repère %s', (_cas, jsx) => {
    expect(rules('src/app/Screen.tsx', `const A = () => ${jsx};`)).toEqual(['CONV-03']);
  });

  it('laisse passer les libellés importés, les espaces et les autres attributs', () => {
    const jsx =
      '<View testID="appel"><Text accessibilityLabel={labels.save}> {labels.title} </Text></View>';
    expect(rules('src/app/Screen.tsx', `const A = () => ${jsx};`)).toEqual([]);
  });

  it('autorise le texte dans libelles.ts', () => {
    // libelles.ts ne contient pas de JSX : on vérifie l'exception sur le même chemin en .tsx.
    expect(rules('src/app/Screen.tsx', 'const A = () => <Text>Ki&amp;La</Text>;')).toEqual([
      'CONV-03',
    ]);
    expect(rules(LABELS_FILE, "export const labels = { appName: 'Ki&La' };")).toEqual([]);
  });
});

describe('CONV-16 couleurs seulement dans le thème', () => {
  it.each(["'#1F3A93'", "'#fff'", "'rgb(31, 58, 147)'", "'rgba(0,0,0,0.5)'", "'hsl(220 65% 35%)'"])(
    'repère %s hors du thème',
    (color) => {
      expect(rules('src/ui/Card.tsx', `const s = { color: ${color} };`)).toEqual(['CONV-16']);
    },
  );

  it('laisse passer une couleur du thème et un texte qui contient un dièse non coloré', () => {
    const source = "const s = { color: theme.colors.encre }; const t = 'n° #12 bis';";
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
    ['SEC-03', 'await Notifications.getExpoPushTokenAsync();'],
    ['SEC-03', "import { getDevicePushTokenAsync } from 'expo-notifications';"],
  ])('%s repère : %s', (rule, source) => {
    expect(rules('src/data/sync.ts', source)).toEqual([rule]);
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
});
