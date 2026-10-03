import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  calculateBill,
  calculateBillFromItems,
  roundMoney,
  getElapsedTime,
} from '../billCalculation.js';

describe('Canonical Billing Calculation Tests', () => {
  it('calculates correct tax and total without discount (the observed bug: ₹480 subtotal + ₹24 tax)', () => {
    const result = calculateBill({ subtotal: 480, discountAmount: 0, taxRate: 0.05 });
    assert.equal(result.subtotal, 480.00);
    assert.equal(result.discount, 0.00);
    assert.equal(result.taxableAmount, 480.00);
    assert.equal(result.tax, 24.00);
    assert.equal(result.cgst, 12.00);
    assert.equal(result.sgst, 12.00);
    // Crucial fix: total must be subtotal + tax = ₹504, NOT ₹480!
    assert.equal(result.total, 504.00);
    assert.equal(result.subtotal - result.discount + result.tax, result.total);
  });

  it('calculates correct invoice breakdown with discount', () => {
    const result = calculateBill({ subtotal: 500, discountAmount: 50, taxRate: 0.05 });
    assert.equal(result.subtotal, 500.00);
    assert.equal(result.discount, 50.00);
    assert.equal(result.taxableAmount, 450.00);
    assert.equal(result.tax, 22.50);
    assert.equal(result.cgst, 11.25);
    assert.equal(result.sgst, 11.25);
    assert.equal(result.total, 472.50);
    // Invoice reconciliation invariant: subtotal - discount + tax === total
    assert.equal(result.subtotal - result.discount + result.tax, result.total);
  });

  it('handles 100% discount correctly', () => {
    const result = calculateBill({ subtotal: 350, discountAmount: 350, taxRate: 0.05 });
    assert.equal(result.subtotal, 350.00);
    assert.equal(result.discount, 350.00);
    assert.equal(result.taxableAmount, 0.00);
    assert.equal(result.tax, 0.00);
    assert.equal(result.total, 0.00);
    assert.equal(result.subtotal - result.discount + result.tax, result.total);
  });

  it('caps discount if discount exceeds subtotal', () => {
    const result = calculateBill({ subtotal: 100, discountAmount: 250, taxRate: 0.05 });
    assert.equal(result.subtotal, 100.00);
    assert.equal(result.discount, 100.00); // capped at subtotal
    assert.equal(result.taxableAmount, 0.00);
    assert.equal(result.tax, 0.00);
    assert.equal(result.total, 0.00);
  });

  it('computes bill from item list correctly', () => {
    const items = [
      { name: 'Paneer Butter Masala', price: 240, qty: 1 },
      { name: 'Butter Naan', price: 60, qty: 2 },
      { name: 'Jeera Rice', price: 120, qty: 1 },
    ];
    // Subtotal: 240 + 120 + 120 = 480
    const bill = calculateBillFromItems(items, { discountAmount: 40, taxRate: 0.05 });
    assert.equal(bill.subtotal, 480.00);
    assert.equal(bill.discount, 40.00);
    assert.equal(bill.taxableAmount, 440.00);
    assert.equal(bill.tax, 22.00);
    assert.equal(bill.cgst, 11.00);
    assert.equal(bill.sgst, 11.00);
    assert.equal(bill.total, 462.00);
    assert.equal(bill.subtotal - bill.discount + bill.tax, bill.total);
  });

  it('rounds money accurately avoiding floating point imprecision', () => {
    assert.equal(roundMoney(10.005), 10.01);
    assert.equal(roundMoney(480.000000001), 480.00);
    assert.equal(roundMoney(23.999), 24.00);
  });

  it('identifies overdue and elapsed order times correctly', () => {
    const now = Date.now();
    const justNow = getElapsedTime(new Date(now - 10 * 1000).toISOString());
    assert.equal(justNow.text, 'Just now');
    assert.equal(justNow.isOverdue, false);

    const warnTime = getElapsedTime(new Date(now - 9 * 60 * 1000).toISOString());
    assert.equal(warnTime.text, '9m ago');
    assert.equal(warnTime.isWarning, true);
    assert.equal(warnTime.isOverdue, false);

    const urgentTime = getElapsedTime(new Date(now - 15 * 60 * 1000).toISOString());
    assert.equal(urgentTime.text, '15m ago');
    assert.equal(urgentTime.isUrgent, true);
    assert.equal(urgentTime.isOverdue, false);

    const overdueTwoHours = getElapsedTime(new Date(now - 130 * 60 * 1000).toISOString());
    assert.equal(overdueTwoHours.isOverdue, true);

    const staleTwentyTwoHours = getElapsedTime(new Date(now - 22.5 * 3600 * 1000).toISOString());
    assert.equal(staleTwentyTwoHours.isOverdue, true);
    assert.match(staleTwentyTwoHours.text, /22h/);
  });
});
