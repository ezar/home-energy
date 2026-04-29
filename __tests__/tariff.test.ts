import { describe, it, expect } from 'vitest'
import { getPeriod } from '@/lib/tariff'

describe('getPeriod — weekends', () => {
  it('Sunday → P3 regardless of hour', () => {
    expect(getPeriod(new Date('2024-01-07T12:00:00Z'))).toBe(3) // Sunday noon
    expect(getPeriod(new Date('2024-01-07T10:00:00Z'))).toBe(3) // Sunday peak hour
  })
  it('Saturday → P3 regardless of hour', () => {
    expect(getPeriod(new Date('2024-01-06T20:00:00Z'))).toBe(3) // Saturday peak
  })
})

describe('getPeriod — fixed holidays', () => {
  it('01-01 New Year → P3', () => {
    expect(getPeriod(new Date('2024-01-01T10:00:00Z'))).toBe(3)
  })
  it('12-25 Christmas → P3', () => {
    expect(getPeriod(new Date('2024-12-25T18:00:00Z'))).toBe(3)
  })
  it('05-01 Labour Day → P3', () => {
    expect(getPeriod(new Date('2024-05-01T10:00:00Z'))).toBe(3)
  })
})

describe('getPeriod — Good Friday (variable holiday)', () => {
  // 2024: Easter Sunday = 31 Mar → Good Friday = 29 Mar
  it('2024-03-29 → P3', () => {
    expect(getPeriod(new Date('2024-03-29T10:00:00Z'))).toBe(3)
  })
  // 2025: Easter Sunday = 20 Apr → Good Friday = 18 Apr
  it('2025-04-18 → P3', () => {
    expect(getPeriod(new Date('2025-04-18T10:00:00Z'))).toBe(3)
  })
  // Day before Good Friday is a normal weekday
  it('day before Good Friday is not P3', () => {
    expect(getPeriod(new Date('2024-03-28T10:00:00Z'))).toBe(1) // Thursday, peak hour
  })
})

describe('getPeriod — P1 peak hours (weekdays)', () => {
  // Monday 2024-01-08
  it('10:00 → P1', () => expect(getPeriod(new Date('2024-01-08T10:00:00Z'))).toBe(1))
  it('13:00 → P1', () => expect(getPeriod(new Date('2024-01-08T13:00:00Z'))).toBe(1))
  it('18:00 → P1', () => expect(getPeriod(new Date('2024-01-08T18:00:00Z'))).toBe(1))
  it('21:00 → P1', () => expect(getPeriod(new Date('2024-01-08T21:00:00Z'))).toBe(1))
  it('14:00 boundary → P2 (not P1)', () => expect(getPeriod(new Date('2024-01-08T14:00:00Z'))).toBe(2))
  it('22:00 boundary → P2 (not P1)', () => expect(getPeriod(new Date('2024-01-08T22:00:00Z'))).toBe(2))
})

describe('getPeriod — P2 shoulder hours (weekdays)', () => {
  it('08:00 → P2', () => expect(getPeriod(new Date('2024-01-08T08:00:00Z'))).toBe(2))
  it('09:00 → P2', () => expect(getPeriod(new Date('2024-01-08T09:00:00Z'))).toBe(2))
  it('14:00 → P2', () => expect(getPeriod(new Date('2024-01-08T14:00:00Z'))).toBe(2))
  it('17:00 → P2', () => expect(getPeriod(new Date('2024-01-08T17:00:00Z'))).toBe(2))
  it('22:00 → P2', () => expect(getPeriod(new Date('2024-01-08T22:00:00Z'))).toBe(2))
  it('23:00 → P2', () => expect(getPeriod(new Date('2024-01-08T23:00:00Z'))).toBe(2))
  it('08:00 boundary → P2 (not P3)', () => expect(getPeriod(new Date('2024-01-08T08:00:00Z'))).toBe(2))
})

describe('getPeriod — P3 valley hours (weekday nights)', () => {
  it('00:00 → P3', () => expect(getPeriod(new Date('2024-01-08T00:00:00Z'))).toBe(3))
  it('03:00 → P3', () => expect(getPeriod(new Date('2024-01-08T03:00:00Z'))).toBe(3))
  it('07:00 → P3', () => expect(getPeriod(new Date('2024-01-08T07:00:00Z'))).toBe(3))
})
