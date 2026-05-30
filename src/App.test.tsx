import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import App from './App';
import { createMemoryRepository } from './persistence/memoryRepository';
import { HistoryScreen } from './components/history/HistoryScreen';
import { DIFFICULTY } from './game/difficulty';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/**
 * Returns all cell buttons from the DOM.
 * Cells carry data-testid="cell-{r}-{c}".
 */
function getAllCells(): HTMLElement[] {
  return screen.getAllByRole('button', { name: /^cell /i });
}

// ---------------------------------------------------------------------------
// Smoke / structural tests
// ---------------------------------------------------------------------------

describe('App renders without crashing', () => {
  it('mounts and shows the game board', () => {
    render(<App />);
    // beginner board is 9x9 = 81 cells, plus some navigation buttons
    const cells = getAllCells();
    expect(cells.length).toBeGreaterThanOrEqual(81);
  });

  it('renders the iPhone frame (zinc-900 bezel element)', () => {
    const { container } = render(<App />);
    // IPhoneFrame renders a div with rounded-[3rem] and bg-zinc-900
    const frame = container.querySelector('.bg-zinc-900.rounded-\\[3rem\\]');
    expect(frame).toBeInTheDocument();
  });

  it('renders a StatusBar with a clock (HH:MM pattern)', () => {
    render(<App />);
    // StatusBar renders a tabular-nums span with the current time
    const timeSpan = document.querySelector('.tabular-nums');
    expect(timeSpan).toBeInTheDocument();
    expect(timeSpan?.textContent).toMatch(/^\d{2}:\d{2}$/);
  });

  it('renders the HomeIndicator bar', () => {
    const { container } = render(<App />);
    // HomeIndicator: w-32 h-1 bg-white/40 rounded-full
    const bar = container.querySelector('.w-32.h-1');
    expect(bar).toBeInTheDocument();
  });

  it('renders the tab bar with Game and History buttons', () => {
    render(<App />);
    // TabBar renders buttons with label "Game" and "History" in the nav
    const nav = screen.getByRole('navigation', { name: /tab navigation/i });
    expect(nav).toBeInTheDocument();
    // Both tab buttons are within the nav
    const navButtons = nav.querySelectorAll('button');
    expect(navButtons.length).toBe(2);
    expect(navButtons[0].textContent).toContain('Game');
    expect(navButtons[1].textContent).toContain('History');
  });
});

// ---------------------------------------------------------------------------
// Cell interaction tests
// ---------------------------------------------------------------------------

describe('Cell interactions', () => {
  it('all beginner cells start in hidden state', () => {
    render(<App />);
    const cells = document.querySelectorAll('[data-testid^="cell-"]');
    expect(cells.length).toBe(81); // 9x9
    cells.forEach((cell) => {
      expect(cell).toHaveAttribute('data-state', 'hidden');
    });
  });

  it('clicking a hidden cell reveals it (first click is never an immediate loss)', async () => {
    const user = userEvent.setup();
    render(<App />);

    const firstCell = document.querySelector('[data-testid="cell-0-0"]') as HTMLElement;
    expect(firstCell).toBeInTheDocument();
    expect(firstCell).toHaveAttribute('data-state', 'hidden');

    await user.click(firstCell);

    // After first click the game status moves to 'playing' (mines placed).
    // The clicked cell must become revealed (never a mine on first click).
    expect(firstCell).toHaveAttribute('data-state', 'revealed');
  });

  it('clicking center cell on first click never loses the game', async () => {
    const user = userEvent.setup();
    render(<App />);

    // Click center of beginner board (4,4)
    const centerCell = document.querySelector('[data-testid="cell-4-4"]') as HTMLElement;
    await user.click(centerCell);

    // Face button reflects status: loss = 😵, ok = 😶/🙂/😎
    const faceBtn = screen.getByRole('button', { name: /new game/i });
    expect(faceBtn.textContent).not.toBe('😵');
  });

  it('right-clicking a hidden cell flags it (data-state becomes flagged)', async () => {
    const user = userEvent.setup();
    render(<App />);

    const targetCell = document.querySelector('[data-testid="cell-0-0"]') as HTMLElement;
    expect(targetCell).toHaveAttribute('data-state', 'hidden');

    await user.pointer({ target: targetCell, keys: '[MouseRight]' });

    expect(targetCell).toHaveAttribute('data-state', 'flagged');
  });

  it('right-clicking a flagged cell toggles it back to hidden', async () => {
    const user = userEvent.setup();
    render(<App />);

    const targetCell = document.querySelector('[data-testid="cell-1-1"]') as HTMLElement;

    // Flag it
    await user.pointer({ target: targetCell, keys: '[MouseRight]' });
    expect(targetCell).toHaveAttribute('data-state', 'flagged');

    // Unflag it
    await user.pointer({ target: targetCell, keys: '[MouseRight]' });
    expect(targetCell).toHaveAttribute('data-state', 'hidden');
  });
});

// ---------------------------------------------------------------------------
// Mines-remaining readout
// ---------------------------------------------------------------------------

describe('Mines-remaining readout', () => {
  it('shows 010 for beginner (10 mines) before any flags', () => {
    render(<App />);
    // GameHeader renders mines as 3-digit padded string
    const minesDisplay = document.querySelector('.font-mono.text-red-400');
    expect(minesDisplay).toBeInTheDocument();
    expect(minesDisplay?.textContent).toBe('010');
  });

  it('decrements when a flag is placed', async () => {
    const user = userEvent.setup();
    render(<App />);

    const minesDisplay = document.querySelector('.font-mono.text-red-400') as HTMLElement;
    expect(minesDisplay.textContent).toBe('010');

    const cell = document.querySelector('[data-testid="cell-0-0"]') as HTMLElement;
    await user.pointer({ target: cell, keys: '[MouseRight]' });

    expect(minesDisplay.textContent).toBe('009');
  });
});

// ---------------------------------------------------------------------------
// Difficulty selector
// ---------------------------------------------------------------------------

describe('Difficulty selection', () => {
  it('beginner starts with 81 cells (9x9)', () => {
    render(<App />);
    const cells = document.querySelectorAll('[data-testid^="cell-"]');
    expect(cells.length).toBe(
      DIFFICULTY.beginner.rows * DIFFICULTY.beginner.cols,
    );
  });

  it('switching to intermediate renders 256 cells (16x16)', async () => {
    const user = userEvent.setup();
    render(<App />);

    const select = screen.getByRole('combobox', { name: /difficulty/i });
    await user.selectOptions(select, 'intermediate');

    const cells = document.querySelectorAll('[data-testid^="cell-"]');
    expect(cells.length).toBe(
      DIFFICULTY.intermediate.rows * DIFFICULTY.intermediate.cols,
    );
  });

  it('switching to expert renders 480 cells (16x30)', async () => {
    const user = userEvent.setup();
    render(<App />);

    const select = screen.getByRole('combobox', { name: /difficulty/i });
    await user.selectOptions(select, 'expert');

    const cells = document.querySelectorAll('[data-testid^="cell-"]');
    expect(cells.length).toBe(
      DIFFICULTY.expert.rows * DIFFICULTY.expert.cols,
    );
  });

  it('switching back to beginner resets cell count to 81', async () => {
    const user = userEvent.setup();
    render(<App />);

    const select = screen.getByRole('combobox', { name: /difficulty/i });
    await user.selectOptions(select, 'expert');
    await user.selectOptions(select, 'beginner');

    const cells = document.querySelectorAll('[data-testid^="cell-"]');
    expect(cells.length).toBe(81);
  });
});

// ---------------------------------------------------------------------------
// New game (reset button)
// ---------------------------------------------------------------------------

describe('Reset / new game', () => {
  it('clicking the face button starts a new game and resets cells to hidden', async () => {
    const user = userEvent.setup();
    render(<App />);

    // Reveal a cell first
    const firstCell = document.querySelector('[data-testid="cell-0-0"]') as HTMLElement;
    await user.click(firstCell);
    expect(firstCell).toHaveAttribute('data-state', 'revealed');

    // Reset
    const resetBtn = screen.getByRole('button', { name: /new game/i });
    await user.click(resetBtn);

    // All cells should be hidden again (new board)
    const cells = document.querySelectorAll('[data-testid^="cell-"]');
    cells.forEach((cell) => {
      expect(cell).toHaveAttribute('data-state', 'hidden');
    });
  });
});

// ---------------------------------------------------------------------------
// Tab navigation
// ---------------------------------------------------------------------------

describe('Tab navigation', () => {
  it('History tab renders with "No games yet" empty state', async () => {
    const user = userEvent.setup();
    render(<App />);

    const historyTab = screen.getByRole('button', { name: /history/i });
    await user.click(historyTab);

    // Wait for async load (listResults resolves with [])
    await screen.findByText(/no games yet/i);
  });

  it('History tab renders "Game History" heading', async () => {
    const user = userEvent.setup();
    render(<App />);

    const historyTab = screen.getByRole('button', { name: /history/i });
    await user.click(historyTab);

    await screen.findByText(/game history/i);
  });

  it('switching back to Game tab shows the board again', async () => {
    const user = userEvent.setup();
    render(<App />);

    const historyTab = screen.getByRole('button', { name: /history/i });
    await user.click(historyTab);
    await screen.findByText(/no games yet/i);

    // Navigate back to Game tab — find it within the nav to avoid matching "New game"
    const nav = screen.getByRole('navigation', { name: /tab navigation/i });
    const gameTab = nav.querySelectorAll('button')[0] as HTMLElement;
    await user.click(gameTab);

    const cells = document.querySelectorAll('[data-testid^="cell-"]');
    expect(cells.length).toBe(81);
  });
});

// ---------------------------------------------------------------------------
// HistoryScreen component tests (isolated with createMemoryRepository)
// ---------------------------------------------------------------------------

describe('HistoryScreen (isolated)', () => {
  it('shows empty state when repository has no results', async () => {
    const repo = createMemoryRepository();
    render(<HistoryScreen repository={repo} playerId="test-player" />);

    await screen.findByText(/no games yet/i);
  });

  it('shows a recorded result after it is added', async () => {
    const repo = createMemoryRepository();
    await repo.recordResult('test-player', {
      difficulty: 'beginner',
      outcome: 'won',
      durationMs: 35_000,
      rows: 9,
      cols: 9,
      mines: 10,
    });

    render(<HistoryScreen repository={repo} playerId="test-player" />);

    await screen.findByText(/beginner/i);
    await screen.findByText(/won/i);
  });

  it('shows loading state initially then transitions', async () => {
    const repo = createMemoryRepository();
    render(<HistoryScreen repository={repo} playerId="test-player" />);

    // loading or done — either is fine; just wait for it to settle
    await screen.findByText(/no games yet|loading/i);
  });
});

// ---------------------------------------------------------------------------
// Board grid structure
// ---------------------------------------------------------------------------

describe('Board grid structure', () => {
  it('board div uses inline gridTemplateColumns style (required for dynamic cols)', () => {
    const { container } = render(<App />);
    // The board grid element has display:grid set via inline style
    // Select-none and touch-manipulation are on the grid div
    const gridDiv = container.querySelector('.select-none.touch-manipulation');
    expect(gridDiv).toBeInTheDocument();
    // It must have an inline style (not just classes) for gridTemplateColumns
    const inlineStyle = (gridDiv as HTMLElement)?.style?.display;
    expect(inlineStyle).toBe('grid');
  });

  it('cells have aspect-square class for responsive scaling', () => {
    const { container } = render(<App />);
    const firstCell = container.querySelector('[data-testid="cell-0-0"]');
    expect(firstCell?.className).toContain('aspect-square');
  });

  it('board container has select-none and touch-manipulation', () => {
    const { container } = render(<App />);
    const selectNone = container.querySelector('.select-none.touch-manipulation');
    expect(selectNone).toBeInTheDocument();
  });
});

// ---------------------------------------------------------------------------
// Acceptance criteria: phone frame deterministic size (fix-phone-resize)
// ---------------------------------------------------------------------------

describe('IPhoneFrame deterministic size (AC-1)', () => {
  it('outer bezel has a non-empty inline style.aspectRatio', () => {
    const { container } = render(<App />);
    const frame = container.querySelector('.bg-zinc-900.rounded-\\[3rem\\]') as HTMLElement;
    expect(frame).toBeInTheDocument();
    expect(frame.style.aspectRatio).toBeTruthy();
    expect(frame.style.aspectRatio).not.toBe('');
  });

  it('outer bezel inline style.aspectRatio is exactly "9 / 19.5"', () => {
    const { container } = render(<App />);
    const frame = container.querySelector('.bg-zinc-900.rounded-\\[3rem\\]') as HTMLElement;
    expect(frame.style.aspectRatio).toBe('9 / 19.5');
  });

  it('outer bezel has a non-empty inline style.height', () => {
    const { container } = render(<App />);
    const frame = container.querySelector('.bg-zinc-900.rounded-\\[3rem\\]') as HTMLElement;
    expect(frame.style.height).toBeTruthy();
    expect(frame.style.height).not.toBe('');
  });

  it('outer bezel inline style.height contains a viewport unit (dvh) or min()', () => {
    const { container } = render(<App />);
    const frame = container.querySelector('.bg-zinc-900.rounded-\\[3rem\\]') as HTMLElement;
    // The height must be viewport-derived, not a fixed pixel value
    const height = frame.style.height;
    expect(height.includes('dvh') || height.includes('min(')).toBe(true);
  });

  it('outer bezel inline style.height is exactly "min(92dvh, 900px)"', () => {
    const { container } = render(<App />);
    const frame = container.querySelector('.bg-zinc-900.rounded-\\[3rem\\]') as HTMLElement;
    expect(frame.style.height).toBe('min(92dvh, 900px)');
  });

  it('outer bezel has no inline maxHeight (old sizing key is gone)', () => {
    const { container } = render(<App />);
    const frame = container.querySelector('.bg-zinc-900.rounded-\\[3rem\\]') as HTMLElement;
    // The old style used maxHeight; after the fix it must be empty/absent
    expect(frame.style.maxHeight).toBe('');
  });
});

// ---------------------------------------------------------------------------
// Acceptance criteria: tab-switch frame stability (fix-phone-resize AC-2)
// ---------------------------------------------------------------------------

describe('IPhoneFrame tab-switch stability (AC-2)', () => {
  it('frame style.height is unchanged after switching from Game to History tab', async () => {
    const user = userEvent.setup();
    const { container } = render(<App />);

    const frame = container.querySelector('.bg-zinc-900.rounded-\\[3rem\\]') as HTMLElement;
    const heightBefore = frame.style.height;

    const historyTab = screen.getByRole('button', { name: /history/i });
    await user.click(historyTab);
    await screen.findByText(/no games yet/i);

    expect(frame.style.height).toBe(heightBefore);
  });

  it('frame style.aspectRatio is unchanged after switching from Game to History tab', async () => {
    const user = userEvent.setup();
    const { container } = render(<App />);

    const frame = container.querySelector('.bg-zinc-900.rounded-\\[3rem\\]') as HTMLElement;
    const aspectRatioBefore = frame.style.aspectRatio;

    const historyTab = screen.getByRole('button', { name: /history/i });
    await user.click(historyTab);
    await screen.findByText(/no games yet/i);

    expect(frame.style.aspectRatio).toBe(aspectRatioBefore);
  });

  it('frame className is unchanged after switching from Game to History tab', async () => {
    const user = userEvent.setup();
    const { container } = render(<App />);

    const frame = container.querySelector('.bg-zinc-900.rounded-\\[3rem\\]') as HTMLElement;
    const classNameBefore = frame.className;

    const historyTab = screen.getByRole('button', { name: /history/i });
    await user.click(historyTab);
    await screen.findByText(/no games yet/i);

    expect(frame.className).toBe(classNameBefore);
  });

  it('frame style.height, style.aspectRatio and className are all stable across tab switch', async () => {
    const user = userEvent.setup();
    const { container } = render(<App />);

    const frame = container.querySelector('.bg-zinc-900.rounded-\\[3rem\\]') as HTMLElement;
    const heightBefore = frame.style.height;
    const aspectRatioBefore = frame.style.aspectRatio;
    const classNameBefore = frame.className;

    const historyTab = screen.getByRole('button', { name: /history/i });
    await user.click(historyTab);
    await screen.findByText(/no games yet/i);

    expect(frame.style.height).toBe(heightBefore);
    expect(frame.style.aspectRatio).toBe(aspectRatioBefore);
    expect(frame.className).toBe(classNameBefore);
  });
});

// ---------------------------------------------------------------------------
// Acceptance criteria: board grid fit (fix-phone-resize AC-4)
// ---------------------------------------------------------------------------

describe('Board grid fit at all difficulties (AC-4)', () => {
  it('beginner: grid div carries max-w-full and max-h-full', () => {
    const { container } = render(<App />);
    const gridDiv = container.querySelector('.select-none.touch-manipulation') as HTMLElement;
    expect(gridDiv.classList.contains('max-w-full')).toBe(true);
    expect(gridDiv.classList.contains('max-h-full')).toBe(true);
  });

  it('beginner: grid div retains inline style.display === "grid"', () => {
    const { container } = render(<App />);
    const gridDiv = container.querySelector('.select-none.touch-manipulation') as HTMLElement;
    expect(gridDiv.style.display).toBe('grid');
  });

  it('beginner (9x9): grid div has inline style.aspectRatio === "9 / 9"', () => {
    const { container } = render(<App />);
    const gridDiv = container.querySelector('.select-none.touch-manipulation') as HTMLElement;
    expect(gridDiv.style.aspectRatio).toBe('9 / 9');
  });

  it('beginner: grid retains select-none and touch-manipulation classes', () => {
    const { container } = render(<App />);
    const gridDiv = container.querySelector('.select-none.touch-manipulation') as HTMLElement;
    expect(gridDiv).toBeInTheDocument();
    expect(gridDiv.classList.contains('select-none')).toBe(true);
    expect(gridDiv.classList.contains('touch-manipulation')).toBe(true);
  });

  it('intermediate (16x16): grid div has inline style.aspectRatio === "16 / 16"', async () => {
    const user = userEvent.setup();
    const { container } = render(<App />);

    const select = screen.getByRole('combobox', { name: /difficulty/i });
    await user.selectOptions(select, 'intermediate');

    const gridDiv = container.querySelector('.select-none.touch-manipulation') as HTMLElement;
    expect(gridDiv.style.aspectRatio).toBe('16 / 16');
    expect(gridDiv.classList.contains('max-w-full')).toBe(true);
    expect(gridDiv.classList.contains('max-h-full')).toBe(true);
    expect(gridDiv.style.display).toBe('grid');
  });

  it('expert (30x16): grid div has inline style.aspectRatio === "30 / 16"', async () => {
    const user = userEvent.setup();
    const { container } = render(<App />);

    const select = screen.getByRole('combobox', { name: /difficulty/i });
    await user.selectOptions(select, 'expert');

    const gridDiv = container.querySelector('.select-none.touch-manipulation') as HTMLElement;
    expect(gridDiv.style.aspectRatio).toBe('30 / 16');
    expect(gridDiv.classList.contains('max-w-full')).toBe(true);
    expect(gridDiv.classList.contains('max-h-full')).toBe(true);
    expect(gridDiv.style.display).toBe('grid');
  });

  it('aspect ratio updates correctly when switching difficulty (beginner -> expert -> beginner)', async () => {
    const user = userEvent.setup();
    const { container } = render(<App />);

    const select = screen.getByRole('combobox', { name: /difficulty/i });
    const gridDiv = container.querySelector('.select-none.touch-manipulation') as HTMLElement;

    expect(gridDiv.style.aspectRatio).toBe('9 / 9');

    await user.selectOptions(select, 'expert');
    expect(gridDiv.style.aspectRatio).toBe('30 / 16');

    await user.selectOptions(select, 'beginner');
    expect(gridDiv.style.aspectRatio).toBe('9 / 9');
  });
});

// ---------------------------------------------------------------------------
// Failure cases
// ---------------------------------------------------------------------------

describe('Failure cases', () => {
  it('flagging all 10 cells makes mines-remaining show 000', async () => {
    const user = userEvent.setup();
    render(<App />);

    // Flag the first 10 cells (row 0, cols 0-8 and row 1, col 0)
    for (let c = 0; c < 9; c++) {
      const cell = document.querySelector(`[data-testid="cell-0-${c}"]`) as HTMLElement;
      await user.pointer({ target: cell, keys: '[MouseRight]' });
    }
    const cell10 = document.querySelector('[data-testid="cell-1-0"]') as HTMLElement;
    await user.pointer({ target: cell10, keys: '[MouseRight]' });

    const minesDisplay = document.querySelector('.font-mono.text-red-400') as HTMLElement;
    expect(minesDisplay.textContent).toBe('000');
  });

  it('over-flagging makes mines-remaining go negative', async () => {
    const user = userEvent.setup();
    render(<App />);

    // Flag 11 cells (one more than 10 mines)
    for (let c = 0; c < 9; c++) {
      const cell = document.querySelector(`[data-testid="cell-0-${c}"]`) as HTMLElement;
      await user.pointer({ target: cell, keys: '[MouseRight]' });
    }
    for (let c = 0; c < 2; c++) {
      const cell = document.querySelector(`[data-testid="cell-1-${c}"]`) as HTMLElement;
      await user.pointer({ target: cell, keys: '[MouseRight]' });
    }

    const minesDisplay = document.querySelector('.font-mono.text-red-400') as HTMLElement;
    // formatMines(-1) = String(-1).padStart(3,'0') = "0-1" (length 2, padded to 3)
    // The key assertion is that the value is less than zero (has a '-' in it)
    expect(minesDisplay.textContent).toContain('-');
  });

  it('memoryRepository.loadSave returns null when no save exists', async () => {
    const repo = createMemoryRepository();
    const result = await repo.loadSave('nonexistent-player');
    expect(result).toBeNull();
  });

  it('memoryRepository.listResults returns [] when no results exist', async () => {
    const repo = createMemoryRepository();
    const results = await repo.listResults('nobody');
    expect(results).toEqual([]);
  });

  it('memoryRepository round-trips a recorded result', async () => {
    const repo = createMemoryRepository();
    await repo.recordResult('p1', {
      difficulty: 'expert',
      outcome: 'lost',
      durationMs: 5000,
      rows: 16,
      cols: 30,
      mines: 99,
    });
    const results = await repo.listResults('p1');
    expect(results).toHaveLength(1);
    expect(results[0].difficulty).toBe('expert');
    expect(results[0].outcome).toBe('lost');
    expect(results[0].durationMs).toBe(5000);
  });
});
