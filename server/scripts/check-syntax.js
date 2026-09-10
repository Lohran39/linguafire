const { readdirSync } = require('node:fs');
const path = require('node:path');
const { spawnSync } = require('node:child_process');

const EXCLUDED_DIRECTORIES = new Set(['node_modules', '.git']);

function listJavaScriptFiles(directory) {
  return readdirSync(directory, { withFileTypes: true })
    .sort((a, b) => a.name.localeCompare(b.name))
    .flatMap((entry) => {
      const filename = path.join(directory, entry.name);
      if (entry.isDirectory() && !EXCLUDED_DIRECTORIES.has(entry.name)) {
        return listJavaScriptFiles(filename);
      }
      return entry.isFile() && /\.(?:c|m)?js$/.test(entry.name) ? [filename] : [];
    });
}

function checkSyntax(directory) {
  const files = listJavaScriptFiles(directory);
  const failures = [];
  for (const file of files) {
    const result = spawnSync(process.execPath, ['--check', file], { encoding: 'utf8' });
    if (result.status !== 0) {
      failures.push({ file, error: result.error?.message || result.stderr || `Exit status: ${result.status}` });
    }
  }
  return { checked: files.length, failures };
}

if (require.main === module) {
  const result = checkSyntax(path.resolve(__dirname, '..'));
  for (const failure of result.failures) process.stderr.write(`${failure.file}\n${failure.error}\n`);
  process.stdout.write(`Syntax checked: ${result.checked} files; ${result.failures.length} failures.\n`);
  process.exitCode = result.failures.length ? 1 : 0;
}

module.exports = { listJavaScriptFiles, checkSyntax };
