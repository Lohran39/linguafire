const test = require('node:test');
const assert = require('node:assert/strict');
const { evaluateReply } = require('../evals/conversation-cases');
const cases = require('../evals/pedagogy-cases');
test('false corrections outside the usual template are flagged', () => {
  assert.ok(evaluateReply({ correction: false }, 'You should say: Could I have water?').includes('false_correction'));
});
test('typographic apostrophes preserve the expected correction', () => {
  assert.deepEqual(evaluateReply({ correction: "I don't eat meat" }, 'Quick correction: I don’t eat meat. Would you like vegetables?'), []);
});
test('negation and number changes do not pass as the expected correction', () => {
  assert.ok(evaluateReply(cases.find(c => c.id === 'preserve-negation'), 'Quick correction: I eat meat. What else?').includes('missed_correction'));
  assert.ok(evaluateReply(cases.find(c => c.id === 'preserve-number'), 'Quick correction: I have one bag. What else?').includes('missed_correction'));
});
