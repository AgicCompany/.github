import { test } from 'node:test';
import assert from 'node:assert/strict';
import { resolveCategory, nativeFromLegacy, isBlocked, isNativeMirror } from './status.mjs';

test('board value wins on a board not yet migrated', () => {
  assert.equal(resolveCategory({ nativeCategory: 'started', projectStatus: 'Removed', legacyBoard: true }), 'not_planned');
  assert.equal(resolveCategory({ nativeCategory: 'planned', projectStatus: 'In Progress', legacyBoard: true }), 'started');
});

test('native status wins on a migrated board', () => {
  assert.equal(resolveCategory({ nativeCategory: 'started', projectStatus: 'Backlog' }), 'started');
});

test('a board is migrated only when all options are native names', () => {
  assert.equal(isNativeMirror(['Backlog', 'Todo', 'In progress', 'In review', 'Done', 'Not planned', 'Duplicate']), true);
  assert.equal(isNativeMirror(['Backlog', 'Ready', 'In Progress']), false);
  assert.equal(isNativeMirror([]), false);
});

test('board value is used for drafts and issues without native status', () => {
  assert.equal(resolveCategory({ nativeCategory: null, projectStatus: 'In Review' }), 'started');
  assert.equal(resolveCategory({ nativeCategory: null, projectStatus: 'todo' }), 'planned');
});

test('closed issue without status uses the close reason', () => {
  assert.equal(resolveCategory({ closed: true, stateReason: 'NOT_PLANNED' }), 'not_planned');
  assert.equal(resolveCategory({ closed: true, stateReason: 'COMPLETED' }), 'completed');
  assert.equal(resolveCategory({ closed: false }), null);
});

test('legacy names map to native names, unknown names do not', () => {
  assert.equal(nativeFromLegacy('Ready'), 'Todo');
  assert.equal(nativeFromLegacy(' blocked '), 'In progress');
  assert.equal(nativeFromLegacy('Validated by QA'), 'In review');
  assert.equal(nativeFromLegacy('Rolling out'), null);
});

test('blocked comes from the Blocked issue field or the legacy board value', () => {
  assert.equal(isBlocked('Yes'), true);
  assert.equal(isBlocked(null, 'Blocked'), true);
  assert.equal(isBlocked('No', 'In progress'), false);
  assert.equal(isBlocked(null, null), false);
});
