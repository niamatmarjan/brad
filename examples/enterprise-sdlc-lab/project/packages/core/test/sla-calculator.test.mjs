import test from 'node:test';
import assert from 'node:assert/strict';
import { BusinessHoursCalculator } from '../src/sla-calculator.mjs';
import { RiskLevels, ChangeCategories } from '../src/types.mjs';

test('BusinessHoursCalculator: emergency changes calculate 2h 24/7 deadline without business hour skipping', () => {
  const start = new Date('2026-10-24T22:00:00Z'); // Saturday night
  const deadline = BusinessHoursCalculator.computeDeadline(start, RiskLevels.EMERGENCY, ChangeCategories.EMERGENCY);

  const diffMs = deadline.getTime() - start.getTime();
  assert.equal(diffMs, 2 * 3600 * 1000, 'Emergency deadline must be exactly 2 hours');
});

test('BusinessHoursCalculator: standard business hours skip weekends', () => {
  // Friday 16:00
  const friday4pm = new Date('2026-10-23T16:00:00');
  // High risk requires 8 business hours
  const deadline = BusinessHoursCalculator.computeDeadline(friday4pm, RiskLevels.HIGH, ChangeCategories.APPLICATION);

  // 1 hour left on Friday (16-17) + 7 hours on Monday (09:00 - 16:00)
  // Deadline must land on Monday afternoon
  assert.equal(deadline.getDay(), 1, 'Deadline must land on Monday (day 1)');
});

test('BusinessHoursCalculator: detects breached deadline accurately', () => {
  const pastDeadline = new Date(Date.now() - 60000);
  const futureDeadline = new Date(Date.now() + 60000);

  assert.equal(BusinessHoursCalculator.isBreached(pastDeadline), true);
  assert.equal(BusinessHoursCalculator.isBreached(futureDeadline), false);
});
