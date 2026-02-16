/**
 * Sandbox Test Runner — Runs real unit and integration tests
 * on AI-generated feature components.
 *
 * Usage: node test_runner.js <component_path> <manifest_path>
 *
 * Outputs JSON to stdout:
 * {
 *   "success": bool,
 *   "unitTests": { "passed": [...], "failed": [...] },
 *   "integrationTests": { "passed": [...], "failed": [...] },
 *   "errors": [...]
 * }
 */
const vm = require('vm');
const fs = require('fs');
const path = require('path');

const componentPath = process.argv[2];
const manifestPath = process.argv[3];
const existingRoutesJson = process.argv[4] || '[]';

if (!componentPath || !manifestPath) {
  console.log(JSON.stringify({
    success: false,
    unitTests: { passed: [], failed: [] },
    integrationTests: { passed: [], failed: [] },
    errors: ['Usage: node test_runner.js <component_path> <manifest_path>']
  }));
  process.exit(0);
}

// ─── Mock React ────────────────────────────────────────────────
function createElement(type, props, ...children) {
  return { $$typeof: Symbol.for('react.element'), type, props: { ...props, children }, key: null };
}

const mockReact = {
  createElement,
  useState: (init) => [init, () => {}],
  useEffect: () => {},
  useCallback: (fn) => fn,
  useMemo: (fn) => fn(),
  useRef: (init) => ({ current: init }),
  useContext: () => ({}),
  createContext: () => ({ Provider: 'ContextProvider', Consumer: 'ContextConsumer' }),
  Fragment: Symbol.for('react.fragment'),
  memo: (c) => c,
  forwardRef: (c) => c,
};

// ─── Mock Recharts ─────────────────────────────────────────────
const chartComponent = (name) => function MockChart(props) {
  return createElement(name, props);
};
const mockRecharts = {
  BarChart: chartComponent('BarChart'),
  Bar: chartComponent('Bar'),
  LineChart: chartComponent('LineChart'),
  Line: chartComponent('Line'),
  PieChart: chartComponent('PieChart'),
  Pie: chartComponent('Pie'),
  Cell: chartComponent('Cell'),
  XAxis: chartComponent('XAxis'),
  YAxis: chartComponent('YAxis'),
  CartesianGrid: chartComponent('CartesianGrid'),
  Tooltip: chartComponent('Tooltip'),
  Legend: chartComponent('Legend'),
  ResponsiveContainer: chartComponent('ResponsiveContainer'),
  AreaChart: chartComponent('AreaChart'),
  Area: chartComponent('Area'),
  RadarChart: chartComponent('RadarChart'),
  Radar: chartComponent('Radar'),
  PolarGrid: chartComponent('PolarGrid'),
  PolarAngleAxis: chartComponent('PolarAngleAxis'),
  PolarRadiusAxis: chartComponent('PolarRadiusAxis'),
};

// ─── Mock UI Components ────────────────────────────────────────
const uiComponent = (name) => function MockUI(props) {
  return createElement(name, props);
};
const mockUIComponents = {
  Card: uiComponent('Card'),
  Badge: uiComponent('Badge'),
  Button: uiComponent('Button'),
  Input: uiComponent('Input'),
  Modal: uiComponent('Modal'),
  Table: uiComponent('Table'),
};

// ─── Module Registry ───────────────────────────────────────────
const moduleRegistry = {
  'react': mockReact,
  'recharts': mockRecharts,
};

function mockRequire(moduleName) {
  if (moduleRegistry[moduleName]) return moduleRegistry[moduleName];
  throw new Error(`Module '${moduleName}' is not allowed. Only: ${Object.keys(moduleRegistry).join(', ')}`);
}

// ─── Forbidden Patterns ────────────────────────────────────────
const FORBIDDEN_PATTERNS = [
  { pattern: /\bfetch\s*\(/, name: 'fetch()' },
  { pattern: /\baxios\b/, name: 'axios' },
  { pattern: /\blocalStorage\b/, name: 'localStorage' },
  { pattern: /\bsessionStorage\b/, name: 'sessionStorage' },
  { pattern: /\beval\s*\(/, name: 'eval()' },
  { pattern: /new\s+Function\s*\(/, name: 'new Function()' },
  { pattern: /\bimport\s*\(/, name: 'dynamic import()' },
  { pattern: /\bdocument\s*\./, name: 'document access' },
  { pattern: /\bwindow\s*\./, name: 'window access' },
  { pattern: /\bXMLHttpRequest\b/, name: 'XMLHttpRequest' },
];

// ─── Test Results ──────────────────────────────────────────────
const results = {
  success: true,
  unitTests: { passed: [], failed: [] },
  integrationTests: { passed: [], failed: [] },
  errors: [],
};

function pass(category, testName) {
  results[category].passed.push(testName);
}

function fail(category, testName, reason) {
  results[category].failed.push({ test: testName, reason });
  results.success = false;
}

// ─── Read Files ────────────────────────────────────────────────
let code, manifest, existingRoutes;
try {
  code = fs.readFileSync(componentPath, 'utf-8');
} catch (e) {
  results.success = false;
  results.errors.push(`Cannot read component: ${e.message}`);
  console.log(JSON.stringify(results));
  process.exit(0);
}

try {
  manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf-8'));
} catch (e) {
  results.success = false;
  results.errors.push(`Cannot read manifest: ${e.message}`);
  console.log(JSON.stringify(results));
  process.exit(0);
}

try {
  existingRoutes = JSON.parse(existingRoutesJson);
} catch {
  existingRoutes = [];
}

// ═══════════════════════════════════════════════════════════════
// UNIT TESTS
// ═══════════════════════════════════════════════════════════════

// UT-1: No forbidden patterns
(function testForbiddenPatterns() {
  const found = [];
  for (const { pattern, name } of FORBIDDEN_PATTERNS) {
    if (pattern.test(code)) found.push(name);
  }
  if (found.length === 0) {
    pass('unitTests', 'No forbidden patterns');
  } else {
    fail('unitTests', 'No forbidden patterns', `Found: ${found.join(', ')}`);
  }
})();

// UT-2: Has exports.default
(function testExportsDefault() {
  if (/exports\.default\s*=/.test(code) || /exports\['default'\]\s*=/.test(code)) {
    pass('unitTests', 'Has exports.default');
  } else {
    fail('unitTests', 'Has exports.default', 'Component must set exports.default');
  }
})();

// UT-3: Code executes without errors
let exportedComponent = null;
(function testCodeExecutes() {
  try {
    const wrappedCode = `
      (function(React, require, exports, UIComponents) {
        var Card = UIComponents.Card;
        var Badge = UIComponents.Badge;
        var Button = UIComponents.Button;
        var Input = UIComponents.Input;
        var Modal = UIComponents.Modal;
        var Table = UIComponents.Table;
        ${code}
      })
    `;
    const script = new vm.Script(wrappedCode, { filename: 'component.jsx', timeout: 5000 });
    const context = vm.createContext({
      console: { log: () => {}, warn: () => {}, error: () => {} },
      setTimeout: () => {},
      clearTimeout: () => {},
      setInterval: () => {},
      clearInterval: () => {},
      Symbol: Symbol,
      Array, Object, String, Number, Boolean, Date, Math, JSON, Map, Set,
      RegExp, Error, TypeError, RangeError, parseInt, parseFloat, isNaN, isFinite,
      encodeURIComponent, decodeURIComponent,
    });
    const factory = script.runInContext(context);
    const exports = {};
    factory(mockReact, mockRequire, exports, mockUIComponents);
    exportedComponent = exports.default || exports;
    pass('unitTests', 'Code executes without errors');
  } catch (e) {
    fail('unitTests', 'Code executes without errors', e.message);
  }
})();

// UT-4: Exported value is a function (React component)
(function testIsFunction() {
  if (typeof exportedComponent === 'function') {
    pass('unitTests', 'Export is a function (React component)');
  } else {
    fail('unitTests', 'Export is a function (React component)',
      `Expected function, got ${typeof exportedComponent}`);
  }
})();

// UT-5: Component renders without crash
(function testComponentRenders() {
  if (typeof exportedComponent !== 'function') {
    fail('unitTests', 'Component renders without crash', 'Cannot test: export is not a function');
    return;
  }
  try {
    const result = exportedComponent({});
    if (result && (result.$$typeof === Symbol.for('react.element') || typeof result === 'object')) {
      pass('unitTests', 'Component renders without crash');
    } else if (result === null) {
      pass('unitTests', 'Component renders without crash');
    } else {
      fail('unitTests', 'Component renders without crash',
        `Expected React element, got ${typeof result}`);
    }
  } catch (e) {
    fail('unitTests', 'Component renders without crash', e.message);
  }
})();

// ═══════════════════════════════════════════════════════════════
// INTEGRATION TESTS
// ═══════════════════════════════════════════════════════════════

// IT-1: Manifest schema validation
(function testManifestSchema() {
  const required = ['name', 'slug', 'icon', 'description', 'route', 'component', 'sidebarEntry'];
  const missing = required.filter(k => !manifest[k]);
  if (missing.length === 0) {
    pass('integrationTests', 'Manifest schema is valid');
  } else {
    fail('integrationTests', 'Manifest schema is valid',
      `Missing fields: ${missing.join(', ')}`);
  }
})();

// IT-2: Sidebar entry validation
(function testSidebarEntry() {
  const entry = manifest.sidebarEntry;
  if (!entry) {
    fail('integrationTests', 'Sidebar entry is valid', 'Missing sidebarEntry');
    return;
  }
  const required = ['label', 'icon', 'order'];
  const missing = required.filter(k => !entry[k] && entry[k] !== 0);
  if (missing.length === 0) {
    pass('integrationTests', 'Sidebar entry is valid');
  } else {
    fail('integrationTests', 'Sidebar entry is valid',
      `Missing sidebarEntry fields: ${missing.join(', ')}`);
  }
})();

// IT-3: Route doesn't conflict with built-in routes
(function testRouteConflict() {
  const builtinRoutes = ['/', '/contacts', '/pipeline', '/settings'];
  const route = manifest.route;
  if (builtinRoutes.includes(route)) {
    fail('integrationTests', 'No route conflict',
      `Route '${route}' conflicts with built-in page`);
  } else if (existingRoutes.includes(route)) {
    fail('integrationTests', 'No route conflict',
      `Route '${route}' conflicts with existing feature`);
  } else {
    pass('integrationTests', 'No route conflict');
  }
})();

// IT-4: Slug is URL-safe
(function testSlugFormat() {
  const slug = manifest.slug;
  if (/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(slug)) {
    pass('integrationTests', 'Slug is URL-safe');
  } else {
    fail('integrationTests', 'Slug is URL-safe',
      `Slug '${slug}' contains invalid characters`);
  }
})();

// IT-5: Component file reference is valid
(function testComponentRef() {
  const comp = manifest.component;
  if (comp && comp.endsWith('.jsx')) {
    pass('integrationTests', 'Component file reference is valid');
  } else {
    fail('integrationTests', 'Component file reference is valid',
      `Expected .jsx file, got '${comp}'`);
  }
})();

// ─── Output Results ────────────────────────────────────────────
console.log(JSON.stringify(results));
