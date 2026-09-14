import test from 'node:test';
import assert from 'node:assert/strict';
import { readPendingDrafts, reconcileDrafts, sameDraft, loadActivities, saveActivity } from '../src/services/activity-drafts.ts';
const entry = (activity, revision, extra = {}) => ({ activity, revision, state: { version: 1, ...extra } });

test('invalid local caches never become pending writes', () => {
  for (const raw of ['null', '[]', '{', '"text"', '{"__proto__": {}}']) assert.deepEqual(readPendingDrafts(raw), {});
  const good = entry('music', 2);
  assert.deepEqual(readPendingDrafts(JSON.stringify({ music: good, navigation: good, lessons: entry('lessons', -1) })), { music: good });
});

test('object key order does not create conflicts, but answer order matters', () => {
  assert.ok(sameDraft({ a: { x: 1, y: 2 }, b: [1, 2] }, { b: [1, 2], a: { y: 2, x: 1 } }));
  assert.equal(sameDraft([1, 2], [2, 1]), false);
  assert.ok(sameDraft({ version: 1, optional: undefined }, { version: 1 }));
  const cloud = entry('music', 5, { input: 'hello' });
  const local = { ...cloud, revision: 1, state: { input: 'hello', version: 1 } };
  const result = reconcileDrafts([cloud], { music: local });
  assert.equal(result.dirty.size, 0); assert.equal(result.conflicts.length, 0);
  assert.equal(result.entries.music.revision, 5);
});

test('conflicting answers preserve cloud state and return local work for archival', () => {
  const cloud = entry('conversation', 3, { input: 'cloud' });
  const local = entry('conversation', 2, { input: 'local' });
  const result = reconcileDrafts([cloud], { conversation: local });
  assert.deepEqual(result.entries.conversation, cloud);
  assert.deepEqual(result.conflicts, [local]); assert.equal(result.dirty.size, 0);
});

test('navigation rebases while offline work with matching revision stays pending', () => {
  const pending = { navigation: entry('navigation', 1, { activeTab: 'music' }), lessons: entry('lessons', 0, { answer: 'hello' }) };
  const result = reconcileDrafts([entry('navigation', 3)], pending);
  assert.equal(result.entries.navigation.revision, 3); assert.equal(pending.navigation.revision, 1);
  assert.deepEqual([...result.dirty], ['navigation', 'lessons']);
});

test('API rejects malformed responses and never acknowledges an invalid save revision', async t => {
  const mock = t.mock.method(globalThis, 'fetch', async () => Response.json({ activities: null }));
  await assert.rejects(loadActivities());
  mock.mock.mockImplementation(async () => Response.json({ activities: [entry('music', 1)] }));
  assert.equal((await loadActivities())[0].revision, 1);
  for (const response of [{}, { revision: '2' }, { revision: 1 }]) {
    mock.mock.mockImplementation(async () => Response.json(response));
    await assert.rejects(saveActivity('music', { version: 1 }, 1));
  }
  mock.mock.mockImplementation(async () => Response.json({ revision: 2 }));
  assert.equal(await saveActivity('music', { version: 1 }, 1), 2);
  mock.mock.mockImplementation(async () => Response.json({}, { status: 409 }));
  assert.equal(await saveActivity('music', { version: 1 }, 1), null);
});
