import { DIFFICULTY } from './difficulty';

describe('DIFFICULTY config', () => {
  it('beginner is 9x9 with 10 mines', () => {
    expect(DIFFICULTY.beginner).toEqual({ rows: 9, cols: 9, mines: 10 });
  });

  it('intermediate is 16x16 with 40 mines', () => {
    expect(DIFFICULTY.intermediate).toEqual({ rows: 16, cols: 16, mines: 40 });
  });

  it('expert is 16x30 with 99 mines', () => {
    expect(DIFFICULTY.expert).toEqual({ rows: 16, cols: 30, mines: 99 });
  });

  it('has exactly the three expected keys', () => {
    const keys = Object.keys(DIFFICULTY);
    expect(keys).toHaveLength(3);
    expect(keys).toContain('beginner');
    expect(keys).toContain('intermediate');
    expect(keys).toContain('expert');
  });

  it('all values have positive rows, cols and mines', () => {
    for (const cfg of Object.values(DIFFICULTY)) {
      expect(cfg.rows).toBeGreaterThan(0);
      expect(cfg.cols).toBeGreaterThan(0);
      expect(cfg.mines).toBeGreaterThan(0);
    }
  });

  it('mines are fewer than total cells for every difficulty', () => {
    for (const cfg of Object.values(DIFFICULTY)) {
      expect(cfg.mines).toBeLessThan(cfg.rows * cfg.cols);
    }
  });
});
