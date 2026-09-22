import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdirSync, mkdtempSync, readdirSync, rmSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { tempDir } from './paths.mjs';
import { detectFullPack } from './full-pack.mjs';

// openspec/config.yaml, binding: the mini pack is NEVER installed natively on a machine
// that already has the full skill pack installed. This detector is how that rule is
// enforced mechanically, so a marker it fails to see is a rule that did not apply.

const withHome = (build) => {
  const home = mkdtempSync(path.join(tempDir(), 'full-pack-'));
  try {
    build(home);
    return { home, dispose: () => rmSync(home, { recursive: true, force: true }) };
  } catch (error) {
    rmSync(home, { recursive: true, force: true });
    throw error;
  }
};

/** A spawn that reports nothing on PATH, and records what it was asked. */
const noCli = () => {
  const calls = [];
  return {
    calls,
    spawn: (file, args) => {
      calls.push([file, ...args]);
      return { status: 1, stdout: '', stderr: 'not found' };
    },
  };
};

const cliPresent = () => ({ spawn: () => ({ status: 0, stdout: '/usr/local/bin/prometheus\n', stderr: '' }) });

test('a clean home with nothing on PATH reports absent', () => {
  const { home, dispose } = withHome(() => {});
  try {
    const found = detectFullPack({ home, spawn: noCli().spawn, platform: 'linux' });

    assert.equal(found.present, false);
    assert.deepEqual(found.markers, []);
  } finally {
    dispose();
  }
});

test('the prometheus CLI on PATH is a marker on its own', () => {
  const { home, dispose } = withHome(() => {});
  try {
    const found = detectFullPack({ home, spawn: cliPresent().spawn, platform: 'linux' });

    assert.equal(found.present, true);
    assert.equal(found.markers.length, 1);
    assert.match(found.markers[0], /prometheus.*PATH|PATH.*prometheus/i);
  } finally {
    dispose();
  }
});

test('setup-state.json is a marker on its own, and names its path', () => {
  const { home, dispose } = withHome((h) => {
    mkdirSync(path.join(h, '.prometheus'), { recursive: true });
    writeFileSync(path.join(h, '.prometheus', 'setup-state.json'), '{}');
  });
  try {
    const found = detectFullPack({ home, spawn: noCli().spawn, platform: 'linux' });

    assert.equal(found.present, true);
    assert.equal(found.markers.length, 1);
    assert.match(found.markers[0], /setup-state\.json/);
  } finally {
    dispose();
  }
});

test('a kbd-process-orchestrator skill directory is a marker under either skills root', () => {
  for (const root of ['.claude', '.agents']) {
    const { home, dispose } = withHome((h) => {
      mkdirSync(path.join(h, root, 'skills', 'kbd-process-orchestrator'), { recursive: true });
    });
    try {
      const found = detectFullPack({ home, spawn: noCli().spawn, platform: 'linux' });

      assert.equal(found.present, true, `${root} should be detected`);
      assert.equal(found.markers.length, 1);
      assert.match(found.markers[0], /kbd-process-orchestrator/);
      assert.match(found.markers[0], new RegExp(root.replace('.', '\\.')));
    } finally {
      dispose();
    }
  }
});

// The full pack installs LaunchAgents on macOS and systemd user units on Linux, both
// named ai.prometheus.* — verified on a real full-pack machine, which had nine.
test('an ai.prometheus.* service unit is a marker, per platform', () => {
  const cases = [
    ['darwin', ['Library', 'LaunchAgents'], 'ai.prometheus.liter-llm-api.plist'],
    ['linux', ['.config', 'systemd', 'user'], 'ai.prometheus.surreal-memory.service'],
  ];

  for (const [platform, dir, unit] of cases) {
    const { home, dispose } = withHome((h) => {
      mkdirSync(path.join(h, ...dir), { recursive: true });
      writeFileSync(path.join(h, ...dir, unit), '');
    });
    try {
      const found = detectFullPack({ home, spawn: noCli().spawn, platform });

      assert.equal(found.present, true, `${platform} should be detected`);
      assert.equal(found.markers.length, 1);
      assert.match(found.markers[0], /ai\.prometheus\./);
    } finally {
      dispose();
    }
  }
});

test('a unit directory holding only unrelated units is not a marker', () => {
  const { home, dispose } = withHome((h) => {
    mkdirSync(path.join(h, 'Library', 'LaunchAgents'), { recursive: true });
    writeFileSync(path.join(h, 'Library', 'LaunchAgents', 'com.apple.something.plist'), '');
  });
  try {
    const found = detectFullPack({ home, spawn: noCli().spawn, platform: 'darwin' });

    assert.equal(found.present, false, JSON.stringify(found.markers));
  } finally {
    dispose();
  }
});

// Windows has no service unit the full pack installs, so there is nothing to look for —
// and looking in a macOS path on Windows would be a false marker waiting to happen.
test('the unit marker does not apply on Windows', () => {
  const { home, dispose } = withHome((h) => {
    mkdirSync(path.join(h, 'Library', 'LaunchAgents'), { recursive: true });
    writeFileSync(path.join(h, 'Library', 'LaunchAgents', 'ai.prometheus.exec.plist'), '');
  });
  try {
    const found = detectFullPack({ home, spawn: noCli().spawn, platform: 'win32' });

    assert.equal(found.present, false, JSON.stringify(found.markers));
  } finally {
    dispose();
  }
});

test('every marker present is reported, not just the first', () => {
  const { home, dispose } = withHome((h) => {
    mkdirSync(path.join(h, '.prometheus'), { recursive: true });
    writeFileSync(path.join(h, '.prometheus', 'setup-state.json'), '{}');
    mkdirSync(path.join(h, '.claude', 'skills', 'kbd-process-orchestrator'), { recursive: true });
  });
  try {
    const found = detectFullPack({ home, spawn: cliPresent().spawn, platform: 'linux' });

    assert.equal(found.present, true);
    assert.equal(found.markers.length, 3, JSON.stringify(found.markers));
  } finally {
    dispose();
  }
});

// The detector is read-only: it decides whether we may write, so it must never write.
test('detection creates nothing', () => {
  const { home, dispose } = withHome(() => {});
  try {
    detectFullPack({ home, spawn: noCli().spawn, platform: 'linux' });

    assert.deepEqual(readdirSync(home), []);
  } finally {
    dispose();
  }
});

test('the PATH probe never runs through a shell', () => {
  const { home, dispose } = withHome(() => {});
  const probe = noCli();
  try {
    detectFullPack({ home, spawn: probe.spawn, platform: 'linux' });

    assert.equal(probe.calls.length, 1);
    assert.ok(
      !probe.calls[0].some((arg) => typeof arg === 'string' && /[;&|]/.test(arg)),
      JSON.stringify(probe.calls),
    );
  } finally {
    dispose();
  }
});

// A detector that treats an unreadable home as "absent" would report a full-pack machine
// as clean and let the installer write there — the rule failing open on the dangerous side.
test('an unreadable home does not read as absent', () => {
  const missing = path.join(tempDir(), 'full-pack-does-not-exist-', String(Date.now()));

  assert.throws(() => detectFullPack({ home: missing, spawn: noCli().spawn, platform: 'linux' }), /home/i);
});
