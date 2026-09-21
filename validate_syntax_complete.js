/**
 * ===============================================================================
 * GIRO Angola — Complete JavaScript Syntax Validation Suite
 * ===============================================================================
 * Performs deep syntax compilation testing across:
 * 1. All primary application HTML files:
 *    - index.html
 *    - passenger.html
 *    - driver.html
 *    - admin.html
 *    - central.html
 *    - cadastro-motorista.html
 *    - cadastro-passageiro.html
 *    Extracts EVERY inline <script> tag and verifies compilation via:
 *    a) new Function(code)
 *    b) new vm.Script(code, { filename })
 *
 * 2. All standalone JavaScript files:
 *    - telemetry.js
 *    - service-worker.js
 *    - leaflet.js
 *    - All test suites in tests/*.js
 *
 * Usage:
 *   node validate_syntax_complete.js [--dir=path/to/target]
 *
 * Exit Codes:
 *   0: 100% Passed (Zero syntax errors)
 *   1: Syntax error detected
 * ===============================================================================
 */

const fs = require('fs');
const path = require('path');
const vm = require('vm');

// Parse CLI arguments
const args = process.argv.slice(2);
let targetDir = process.cwd();

for (const arg of args) {
  if (arg.startsWith('--dir=')) {
    targetDir = path.resolve(arg.split('=')[1]);
  }
}

console.log('================================================================================');
console.log('  GIRO Angola — Complete JavaScript Syntax Validation');
console.log(`  Target Directory: ${targetDir}`);
console.log('================================================================================\n');

if (!fs.existsSync(targetDir)) {
  console.error(`ERROR: Target directory does not exist: ${targetDir}`);
  process.exit(1);
}

const HTML_FILES = [
  'index.html',
  'passenger.html',
  'driver.html',
  'admin.html',
  'central.html',
  'cadastro-motorista.html',
  'cadastro-passageiro.html',
  'track.html'
];

const STANDALONE_JS = [
  'telemetry.js',
  'service-worker.js',
  'leaflet.js'
];

let totalScriptsChecked = 0;
let totalFilesChecked = 0;
let passedChecks = 0;
let failedChecks = 0;
const errors = [];

// Helper: Extract inline <script> blocks (excluding scripts with src attribute)
function extractInlineScripts(htmlContent) {
  const scripts = [];
  const scriptRegex = /<script(?![^>]*\bsrc=)[^>]*>([\s\S]*?)<\/script>/gi;
  let match;
  while ((match = scriptRegex.exec(htmlContent)) !== null) {
    scripts.push({
      code: match[1],
      index: scripts.length + 1
    });
  }
  return scripts;
}

// Helper: Validate JavaScript code using both new Function() and vm.Script()
function validateSyntax(code, label) {
  totalScriptsChecked++;
  let fnSuccess = false;
  let vmSuccess = false;
  let errorMsg = null;

  // 1. Test compilation via new Function(code)
  try {
    new Function(code);
    fnSuccess = true;
  } catch (err) {
    errorMsg = `[new Function]: ${err.message}`;
  }

  // 2. Test compilation via Node.js vm.Script
  try {
    new vm.Script(code, { filename: label });
    vmSuccess = true;
  } catch (err) {
    const vmErr = `[vm.Script]: ${err.message}`;
    errorMsg = errorMsg ? `${errorMsg} | ${vmErr}` : vmErr;
  }

  if (fnSuccess && vmSuccess) {
    passedChecks++;
    const lines = code.split('\n').length;
    console.log(`  \x1b[32m[PASS]\x1b[0m ${label} (${lines} lines, ${code.length} chars)`);
    return true;
  } else {
    failedChecks++;
    console.error(`  \x1b[31m[FAIL]\x1b[0m ${label}: ${errorMsg}`);
    errors.push({ label, error: errorMsg });
    return false;
  }
}

// -----------------------------------------------------------------------------
// 1. Validate HTML Inline Script Tags
// -----------------------------------------------------------------------------
console.log('\x1b[1m--- Section 1: HTML Inline <script> Tags Validation ---\x1b[0m');

for (const htmlFile of HTML_FILES) {
  const filePath = path.join(targetDir, htmlFile);
  if (!fs.existsSync(filePath)) {
    console.error(`  \x1b[31m[MISSING]\x1b[0m File not found: ${htmlFile}`);
    errors.push({ label: htmlFile, error: 'File not found' });
    failedChecks++;
    continue;
  }

  totalFilesChecked++;
  const htmlContent = fs.readFileSync(filePath, 'utf8');
  const scripts = extractInlineScripts(htmlContent);

  console.log(`\n\x1b[36m${htmlFile}\x1b[0m (${scripts.length} inline script tags found):`);
  if (scripts.length === 0) {
    console.warn(`  \x1b[33m[WARN]\x1b[0m No inline script tags found in ${htmlFile}`);
  }

  scripts.forEach(s => {
    validateSyntax(s.code, `${htmlFile} [Script #${s.index}]`);
  });
}

// -----------------------------------------------------------------------------
// 2. Validate Standalone JavaScript Files
// -----------------------------------------------------------------------------
console.log('\n\x1b[1m--- Section 2: Standalone Root JavaScript Files ---\x1b[0m');

for (const jsFile of STANDALONE_JS) {
  const filePath = path.join(targetDir, jsFile);
  if (!fs.existsSync(filePath)) {
    console.error(`  \x1b[31m[MISSING]\x1b[0m File not found: ${jsFile}`);
    errors.push({ label: jsFile, error: 'File not found' });
    failedChecks++;
    continue;
  }

  totalFilesChecked++;
  const jsContent = fs.readFileSync(filePath, 'utf8');
  validateSyntax(jsContent, jsFile);
}

// -----------------------------------------------------------------------------
// 3. Validate Test Suite Files (tests/*.js)
// -----------------------------------------------------------------------------
console.log('\n\x1b[1m--- Section 3: Test Suites (tests/*.js) ---\x1b[0m');

const testsDir = path.join(targetDir, 'tests');
if (fs.existsSync(testsDir)) {
  const testFiles = fs.readdirSync(testsDir)
    .filter(f => f.endsWith('.js'))
    .sort();

  console.log(`Found ${testFiles.length} JavaScript test files in tests/ directory:\n`);
  for (const tf of testFiles) {
    totalFilesChecked++;
    const testPath = path.join(testsDir, tf);
    const testContent = fs.readFileSync(testPath, 'utf8');
    validateSyntax(testContent, `tests/${tf}`);
  }
} else {
  console.warn('  \x1b[33m[WARN]\x1b[0m tests/ directory not found in target');
}

// -----------------------------------------------------------------------------
// Summary & Verdict
// -----------------------------------------------------------------------------
console.log('\n================================================================================');
console.log('  Validation Summary');
console.log('================================================================================');
console.log(`  Total Files Inspected:   ${totalFilesChecked}`);
console.log(`  Total Scripts Tested:   ${totalScriptsChecked}`);
console.log(`  Passed (0 errors):      \x1b[32m${passedChecks}\x1b[0m`);
console.log(`  Failed:                 ${failedChecks > 0 ? '\x1b[31m' + failedChecks + '\x1b[0m' : '\x1b[32m0\x1b[0m'}`);
console.log('================================================================================\n');

if (failedChecks === 0) {
  console.log('\x1b[32m[SUCCESS] 100% SYNTAX VALIDATION PASSED — ZERO ERRORS DETECTED!\x1b[0m\n');
  process.exit(0);
} else {
  console.error('\x1b[31m[FAILURE] SYNTAX ERRORS DETECTED:\x1b[0m');
  errors.forEach(e => console.error(`  - ${e.label}: ${e.error}`));
  process.exit(1);
}
