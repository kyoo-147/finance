import test from 'node:test';
import assert from 'node:assert/strict';
import {australiaDate,australiaMonth} from '../electron/calendar.mjs';
import {shouldQuitWhenAllWindowsClosed} from '../electron/lifecycle.mjs';

test('Australian calendar defaults cross UTC day and month boundaries correctly',()=>{
  assert.equal(australiaDate(new Date('2026-08-31T14:30:00Z')),'2026-09-01');
  assert.equal(australiaMonth(new Date('2026-08-31T14:30:00Z')),'2026-09');
  assert.equal(australiaDate(new Date('2026-12-31T13:30:00Z')),'2027-01-01');
});

test('closing all windows keeps the macOS app alive for Dock reactivation',()=>{
  assert.equal(shouldQuitWhenAllWindowsClosed('darwin'),false);
  assert.equal(shouldQuitWhenAllWindowsClosed('win32'),true);
  assert.equal(shouldQuitWhenAllWindowsClosed('linux'),true);
});
