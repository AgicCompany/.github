import { test } from 'node:test';
import assert from 'node:assert/strict';
import { planningValue } from './fields.mjs';

const issue = (...nodes) => ({ issueFieldValues: { nodes } });
const select = (name, value) => ({ __typename: 'IssueFieldSingleSelectValue', name: value, field: { name } });
const date = (name, value) => ({ __typename: 'IssueFieldDateValue', dateValue: value, field: { name } });

test('project field value wins while it exists and is set', () => {
  assert.equal(planningValue(issue(select('Priority', 'Medium')), { Priority: 'High' }, 'Priority'), 'High');
});

test('issue field is used when the project field is empty or deleted', () => {
  assert.equal(planningValue(issue(select('Priority', 'Medium')), {}, 'Priority'), 'Medium');
  assert.equal(planningValue(issue(date('Target date', '2026-12-31')), {}, 'Target date'), '2026-12-31');
});

test('no value anywhere, drafts and other field types give null', () => {
  assert.equal(planningValue(issue(), {}, 'Severity'), null);
  assert.equal(planningValue({}, {}, 'Severity'), null);
  assert.equal(planningValue(issue({ __typename: 'IssueFieldNumberValue', value: 3, field: { name: 'Severity' } }), {}, 'Severity'), null);
});
