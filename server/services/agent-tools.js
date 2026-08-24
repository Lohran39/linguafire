const fs = require('fs/promises');
const path = require('path');
const { exec, spawn } = require('child_process');
const util = require('util');

const execAsync = util.promisify(exec);

function createAgentTools(config = {}) {
  const {
    workspaceRoot,
    commandTimeoutMs = 15000,
    deployTimeoutMs = 120000,
    runningServers = new Map()
  } = config;

  if (!workspaceRoot) {
    throw new Error('createAgentTools requires workspaceRoot.');
  }

  function resolveWorkspacePath(targetPath = '.') {
    const resolvedPath = path.resolve(workspaceRoot, targetPath);
    if (resolvedPath !== workspaceRoot && !resolvedPath.startsWith(`${workspaceRoot}${path.sep}`)) {
      throw new Error('Path outside workspace is not allowed.');
    }
    return resolvedPath;
  }

  async function listFilesTool(input = {}) {
    const targetDir = resolveWorkspacePath(input.path || '.');
    const maxEntries = Math.min(Number(input.max_entries || 200), 500);
    const entries = await fs.readdir(targetDir, { withFileTypes: true });
    return {
      path: path.relative(workspaceRoot, targetDir) || '.',
      entries: entries
        .slice(0, maxEntries)
        .map((entry) => ({ name: entry.name, type: entry.isDirectory() ? 'directory' : 'file' }))
    };
  }

  async function readFileTool(input = {}) {
    const filePath = resolveWorkspacePath(input.path);
    const content = await fs.readFile(filePath, 'utf8');
    const maxChars = Math.min(Number(input.max_chars || 20000), 50000);
    return {
      path: path.relative(workspaceRoot, filePath),
      content: content.slice(0, maxChars),
      truncated: content.length > maxChars
    };
  }

  async function writeFileTool(input = {}) {
    if (typeof input.content !== 'string') {
      throw new Error('Tool write_file requires string content.');
    }

    const filePath = resolveWorkspacePath(input.path);
    await fs.mkdir(path.dirname(filePath), { recursive: true });
    await fs.writeFile(filePath, input.content, 'utf8');
    return {
      path: path.relative(workspaceRoot, filePath),
      bytes_written: Buffer.byteLength(input.content, 'utf8')
    };
  }

  async function runCommandTool(input = {}) {
    const command = String(input.command || '').trim();
    if (!command) throw new Error('Tool run_command requires a command.');

    const blockedPatterns = [/\bsudo\b/i, /\brm\s+-rf\s+\//i, /\bshutdown\b/i, /\breboot\b/i, /\bmkfs\b/i];
    if (blockedPatterns.some((pattern) => pattern.test(command))) {
      throw new Error('Blocked potentially dangerous command.');
    }

    const cwd = resolveWorkspacePath(input.cwd || '.');
    const { stdout, stderr } = await execAsync(command, {
      cwd,
      timeout: commandTimeoutMs,
      maxBuffer: 1024 * 1024
    });

    return {
      cwd: path.relative(workspaceRoot, cwd) || '.',
      stdout: stdout.trim(),
      stderr: stderr.trim()
    };
  }

  async function startServerTool(input = {}) {
    const command = String(input.command || '').trim();
    if (!command) throw new Error('Tool start_server requires a command.');

    const cwd = resolveWorkspacePath(input.cwd || '.');
    const url = String(input.url || '').trim();
    const shell = process.platform === 'win32' ? 'cmd.exe' : '/bin/zsh';
    const shellArgs = process.platform === 'win32' ? ['/c', command] : ['-lc', command];

    const child = spawn(shell, shellArgs, {
      cwd,
      detached: true,
      stdio: 'ignore',
      env: process.env
    });
    child.unref();

    const serverId = `srv_${Date.now()}`;
    runningServers.set(serverId, {
      pid: child.pid,
      command,
      cwd: path.relative(workspaceRoot, cwd) || '.',
      url
    });

    return {
      server_id: serverId,
      pid: child.pid,
      cwd: path.relative(workspaceRoot, cwd) || '.',
      command,
      url: url || null
    };
  }

  async function deployCommandTool(input = {}) {
    const command = String(input.command || '').trim();
    if (!command) throw new Error('Tool deploy_command requires a command.');

    const cwd = resolveWorkspacePath(input.cwd || '.');
    const { stdout, stderr } = await execAsync(command, {
      cwd,
      timeout: deployTimeoutMs,
      maxBuffer: 1024 * 1024 * 4
    });

    return {
      cwd: path.relative(workspaceRoot, cwd) || '.',
      stdout: stdout.trim(),
      stderr: stderr.trim()
    };
  }

  return {
    list_files: { description: 'Lista arquivos e pastas do workspace.', execute: listFilesTool },
    read_file: { description: 'Le um arquivo UTF-8 do workspace.', execute: readFileTool },
    write_file: { description: 'Escreve um arquivo UTF-8 no workspace.', execute: writeFileTool },
    run_command: { description: 'Executa um comando de shell no workspace.', execute: runCommandTool },
    start_server: { description: 'Inicia um servidor/processo persistente no workspace e retorna pid/url.', execute: startServerTool },
    deploy_command: { description: 'Executa um comando de build ou deploy com timeout maior.', execute: deployCommandTool }
  };
}

module.exports = { createAgentTools };
