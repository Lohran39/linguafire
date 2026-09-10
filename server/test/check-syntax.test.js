const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { checkSyntax } = require('../scripts/check-syntax');

test('syntax check covers every nested source file without running it or checking dependencies', (t) => {
  const directory = fs.mkdtempSync(path.join(os.tmpdir(), 'linguafire-syntax-'));
  t.after(() => fs.rmSync(directory, { recursive: true, force: true }));
  fs.mkdirSync(path.join(directory, 'routes'));
  fs.mkdirSync(path.join(directory, 'node_modules'));
  fs.writeFileSync(path.join(directory, 'a.js'), 'throw new Error("Do not execute source files");');
  fs.writeFileSync(path.join(directory, 'routes/z.js'), 'const broken = ;');
  fs.writeFileSync(path.join(directory, 'node_modules/ignored.js'), 'const ignored = ;');

  const result = checkSyntax(directory);
  assert.equal(result.checked, 2);
  assert.equal(result.failures.length, 1);
  assert.equal(result.failures[0].file, path.join(directory, 'routes/z.js'));
  assert.match(result.failures[0].error, /SyntaxError/);

  fs.writeFileSync(path.join(directory, 'routes/z.js'), 'const valid = 1;');
  assert.deepEqual(checkSyntax(directory), { checked: 2, failures: [] });
});
