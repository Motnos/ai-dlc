import { createRng } from './rng';

describe('createRng', () => {
  describe('determinism', () => {
    it('two rngs with the same seed produce identical next() sequences', () => {
      const rng1 = createRng(42);
      const rng2 = createRng(42);
      for (let i = 0; i < 100; i++) {
        expect(rng1.next()).toBe(rng2.next());
      }
    });

    it('two rngs with the same seed produce identical int() sequences', () => {
      const rng1 = createRng(99);
      const rng2 = createRng(99);
      for (let i = 0; i < 100; i++) {
        expect(rng1.int(100)).toBe(rng2.int(100));
      }
    });

    it('different seeds produce different sequences', () => {
      const rng1 = createRng(1);
      const rng2 = createRng(2);
      const seq1 = Array.from({ length: 20 }, () => rng1.next());
      const seq2 = Array.from({ length: 20 }, () => rng2.next());
      // Very unlikely two different seeds produce the exact same 20 values
      expect(seq1).not.toEqual(seq2);
    });

    it('seed 0 works (coerced to uint32)', () => {
      const rng1 = createRng(0);
      const rng2 = createRng(0);
      expect(rng1.next()).toBe(rng2.next());
    });

    it('negative seed is coerced to uint32 deterministically', () => {
      const rng1 = createRng(-1);
      const rng2 = createRng(-1);
      const v1 = rng1.next();
      const v2 = rng2.next();
      expect(v1).toBe(v2);
    });
  });

  describe('next() range', () => {
    it('returns values in [0, 1)', () => {
      const rng = createRng(12345);
      for (let i = 0; i < 1000; i++) {
        const v = rng.next();
        expect(v).toBeGreaterThanOrEqual(0);
        expect(v).toBeLessThan(1);
      }
    });

    it('next() never returns exactly 1', () => {
      const rng = createRng(0);
      for (let i = 0; i < 1000; i++) {
        expect(rng.next()).not.toBe(1);
      }
    });
  });

  describe('int() range', () => {
    it('returns integers in [0, maxExclusive)', () => {
      const rng = createRng(7);
      for (let i = 0; i < 1000; i++) {
        const v = rng.int(10);
        expect(Number.isInteger(v)).toBe(true);
        expect(v).toBeGreaterThanOrEqual(0);
        expect(v).toBeLessThan(10);
      }
    });

    it('returns 0 for maxExclusive <= 0', () => {
      const rng = createRng(1);
      expect(rng.int(0)).toBe(0);
      expect(rng.int(-5)).toBe(0);
    });

    it('returns 0 for maxExclusive === 1 (only valid value)', () => {
      const rng = createRng(1);
      for (let i = 0; i < 50; i++) {
        expect(rng.int(1)).toBe(0);
      }
    });

    it('covers the full range for small max', () => {
      const rng = createRng(987654);
      const seen = new Set<number>();
      for (let i = 0; i < 10000; i++) {
        seen.add(rng.int(5));
      }
      // With 10000 samples, all 5 values (0-4) should appear
      expect(seen.size).toBe(5);
    });

    it('int(n) and next() are consistent: int uses next internally', () => {
      // Verify int(n) = floor(next() * n) by comparing two same-seed rngs
      const rng1 = createRng(555);
      const rng2 = createRng(555);
      for (let i = 0; i < 50; i++) {
        const n = 20;
        const fromInt = rng1.int(n);
        const fromNext = Math.floor(rng2.next() * n);
        expect(fromInt).toBe(fromNext);
      }
    });
  });

  describe('state independence', () => {
    it('each createRng call produces an independent instance', () => {
      const rng1 = createRng(100);
      const rng2 = createRng(100);
      // Advance rng1
      for (let i = 0; i < 10; i++) rng1.next();
      // rng2 should still be at start
      const rng3 = createRng(100);
      expect(rng2.next()).toBe(rng3.next());
    });
  });
});
