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
// Acceptance criteria: board scaling fix (fix-game-scaling)
// ---------------------------------------------------------------------------
// NOTE: jsdom has NO layout engine. These tests assert structure (class lists
// and inline-style strings) only — never offsetWidth or getBoundingClientRect.
// True visual "fills/fits nicely" is a HUMAN check in the running app (npm run
// dev); jsdom cannot verify rendered layout.

describe('fix-game-scaling: GameScreen root carries min-h-0', () => {
  it('GameScreen root has flex-1 class', () => {
    const { container } = render(<App />);
    // The GameScreen root is the flex column that sits between the phone screen
    // content wrapper and the board region.
    const gameScreenRoot = container.querySelector('.flex-1.min-h-0.bg-zinc-900');
    expect(gameScreenRoot).toBeInTheDocument();
    expect((gameScreenRoot as HTMLElement).classList.contains('flex-1')).toBe(true);
  });

  it('GameScreen root has min-h-0 class (enables flex-column shrink)', () => {
    const { container } = render(<App />);
    const gameScreenRoot = container.querySelector('.flex-1.min-h-0.bg-zinc-900');
    expect(gameScreenRoot).toBeInTheDocument();
    expect((gameScreenRoot as HTMLElement).classList.contains('min-h-0')).toBe(true);
  });

  it('GameScreen root has overflow-hidden class', () => {
    const { container } = render(<App />);
    const gameScreenRoot = container.querySelector('.flex-1.min-h-0.bg-zinc-900');
    expect(gameScreenRoot).toBeInTheDocument();
    expect((gameScreenRoot as HTMLElement).classList.contains('overflow-hidden')).toBe(true);
  });
});

describe('fix-game-scaling: Board outer region carries min-h-0 and min-w-0', () => {
  it('Board outer region has flex-1 class', () => {
    const { container } = render(<App />);
    // The board outer region is the flex-1 div that wraps the fit wrapper and grid.
    // It carries flex-1, min-h-0, min-w-0, items-center, justify-center.
    const outerRegion = container.querySelector('.flex-1.min-h-0.min-w-0');
    expect(outerRegion).toBeInTheDocument();
    expect((outerRegion as HTMLElement).classList.contains('flex-1')).toBe(true);
  });

  it('Board outer region has min-h-0 class (allows region to shrink to bounded height)', () => {
    const { container } = render(<App />);
    const outerRegion = container.querySelector('.flex-1.min-h-0.min-w-0');
    expect(outerRegion).toBeInTheDocument();
    expect((outerRegion as HTMLElement).classList.contains('min-h-0')).toBe(true);
  });

  it('Board outer region has min-w-0 class', () => {
    const { container } = render(<App />);
    const outerRegion = container.querySelector('.flex-1.min-h-0.min-w-0');
    expect(outerRegion).toBeInTheDocument();
    expect((outerRegion as HTMLElement).classList.contains('min-w-0')).toBe(true);
  });

  it('Board outer region has items-center and justify-center for centering', () => {
    const { container } = render(<App />);
    const outerRegion = container.querySelector('.flex-1.min-h-0.min-w-0');
    expect(outerRegion).toBeInTheDocument();
    const el = outerRegion as HTMLElement;
    expect(el.classList.contains('items-center')).toBe(true);
    expect(el.classList.contains('justify-center')).toBe(true);
  });

  it('Board outer region has overflow-hidden class', () => {
    const { container } = render(<App />);
    const outerRegion = container.querySelector('.flex-1.min-h-0.min-w-0');
    expect(outerRegion).toBeInTheDocument();
    expect((outerRegion as HTMLElement).classList.contains('overflow-hidden')).toBe(true);
  });
});

describe('fix-game-scaling: new fit wrapper exists and has required classes', () => {
  it('fit wrapper exists as a div with w-full and h-full', () => {
    const { container } = render(<App />);
    // The fit wrapper fills the outer region and provides a definite size context
    // for the grid's max-w-full / max-h-full. It carries w-full h-full min-h-0.
    const fitWrapper = container.querySelector('.w-full.h-full.min-h-0');
    expect(fitWrapper).toBeInTheDocument();
  });

  it('fit wrapper has items-center class', () => {
    const { container } = render(<App />);
    const fitWrapper = container.querySelector('.w-full.h-full.min-h-0');
    expect(fitWrapper).toBeInTheDocument();
    expect((fitWrapper as HTMLElement).classList.contains('items-center')).toBe(true);
  });

  it('fit wrapper has justify-center class', () => {
    const { container } = render(<App />);
    const fitWrapper = container.querySelector('.w-full.h-full.min-h-0');
    expect(fitWrapper).toBeInTheDocument();
    expect((fitWrapper as HTMLElement).classList.contains('justify-center')).toBe(true);
  });

  it('fit wrapper has min-h-0 class', () => {
    const { container } = render(<App />);
    const fitWrapper = container.querySelector('.w-full.h-full.min-h-0');
    expect(fitWrapper).toBeInTheDocument();
    expect((fitWrapper as HTMLElement).classList.contains('min-h-0')).toBe(true);
  });

  it('at least one ancestor of the grid div within the board carries items-center and justify-center', () => {
    const { container } = render(<App />);
    const gridDiv = container.querySelector('.select-none.touch-manipulation') as HTMLElement;
    expect(gridDiv).toBeInTheDocument();
    // Walk up from the grid div looking for an ancestor with both centering classes
    let ancestor = gridDiv.parentElement;
    let found = false;
    while (ancestor && ancestor !== container) {
      if (
        ancestor.classList.contains('items-center') &&
        ancestor.classList.contains('justify-center')
      ) {
        found = true;
        break;
      }
      ancestor = ancestor.parentElement;
    }
    expect(found).toBe(true);
  });
});

// WHY width is the single definite axis:
// Setting only `style.width = '100%'` (one definite axis) while leaving height
// auto lets `aspect-ratio` derive the height. `max-h-full` then actually binds
// for square/tall boards (it caps a derived auto height and the browser shrinks
// proportionally). If BOTH width AND height were definite (e.g. `w-full h-full`
// classes), `aspect-ratio` would be ignored entirely per CSS Sizing spec, the
// max-* caps would be no-ops, and the board would fill the full W×H box
// regardless of cols/rows — wrong shape, top-aligned, not fitted. Width must
// remain the only intentional axis so aspect-ratio stays authoritative.
describe('fix-game-scaling: grid div single-axis sizing (inline width + no explicit height)', () => {
  it('beginner: grid div has inline style.width === "100%" (single definite axis for aspect-ratio)', () => {
    const { container } = render(<App />);
    const gridDiv = container.querySelector('.select-none.touch-manipulation') as HTMLElement;
    expect(gridDiv).toBeInTheDocument();
    // width:100% is the ONLY explicit axis — aspect-ratio derives height from it
    expect(gridDiv.style.width).toBe('100%');
  });

  it('beginner: grid div has inline style.height === "" (height is auto/derived, NOT pinned)', () => {
    const { container } = render(<App />);
    const gridDiv = container.querySelector('.select-none.touch-manipulation') as HTMLElement;
    expect(gridDiv).toBeInTheDocument();
    // height must NOT be set inline — it must come from aspect-ratio alone
    expect(gridDiv.style.height).toBe('');
  });

  it('beginner: grid div does NOT carry h-full class (would defeat aspect-ratio)', () => {
    const { container } = render(<App />);
    const gridDiv = container.querySelector('.select-none.touch-manipulation') as HTMLElement;
    expect(gridDiv).toBeInTheDocument();
    expect(gridDiv.classList.contains('h-full')).toBe(false);
  });

  it('beginner: grid div does NOT carry w-full class (width comes from inline style, not class)', () => {
    const { container } = render(<App />);
    const gridDiv = container.querySelector('.select-none.touch-manipulation') as HTMLElement;
    expect(gridDiv).toBeInTheDocument();
    expect(gridDiv.classList.contains('w-full')).toBe(false);
  });

  it('intermediate: grid div retains inline style.width === "100%" and style.height === "" after difficulty switch', async () => {
    const user = userEvent.setup();
    const { container } = render(<App />);
    const select = screen.getByRole('combobox', { name: /difficulty/i });
    await user.selectOptions(select, 'intermediate');
    const gridDiv = container.querySelector('.select-none.touch-manipulation') as HTMLElement;
    expect(gridDiv.style.width).toBe('100%');
    expect(gridDiv.style.height).toBe('');
  });

  it('expert: grid div retains inline style.width === "100%" and style.height === "" after difficulty switch', async () => {
    const user = userEvent.setup();
    const { container } = render(<App />);
    const select = screen.getByRole('combobox', { name: /difficulty/i });
    await user.selectOptions(select, 'expert');
    const gridDiv = container.querySelector('.select-none.touch-manipulation') as HTMLElement;
    expect(gridDiv.style.width).toBe('100%');
    expect(gridDiv.style.height).toBe('');
  });
});

describe('fix-game-scaling: grid div retains all pinned attributes at every difficulty', () => {
  it('beginner: grid has inline style.display === "grid"', () => {
    const { container } = render(<App />);
    const gridDiv = container.querySelector('.select-none.touch-manipulation') as HTMLElement;
    expect(gridDiv.style.display).toBe('grid');
  });

  it('beginner (9x9): grid has inline style.aspectRatio === "9 / 9"', () => {
    const { container } = render(<App />);
    const gridDiv = container.querySelector('.select-none.touch-manipulation') as HTMLElement;
    expect(gridDiv.style.aspectRatio).toBe('9 / 9');
  });

  it('beginner: grid retains max-w-full, max-h-full, select-none, touch-manipulation', () => {
    const { container } = render(<App />);
    const gridDiv = container.querySelector('.select-none.touch-manipulation') as HTMLElement;
    expect(gridDiv.classList.contains('max-w-full')).toBe(true);
    expect(gridDiv.classList.contains('max-h-full')).toBe(true);
    expect(gridDiv.classList.contains('select-none')).toBe(true);
    expect(gridDiv.classList.contains('touch-manipulation')).toBe(true);
  });

  it('intermediate (16x16): grid has inline style.aspectRatio === "16 / 16"', async () => {
    const user = userEvent.setup();
    const { container } = render(<App />);
    const select = screen.getByRole('combobox', { name: /difficulty/i });
    await user.selectOptions(select, 'intermediate');
    const gridDiv = container.querySelector('.select-none.touch-manipulation') as HTMLElement;
    expect(gridDiv.style.display).toBe('grid');
    expect(gridDiv.style.aspectRatio).toBe('16 / 16');
    expect(gridDiv.classList.contains('max-w-full')).toBe(true);
    expect(gridDiv.classList.contains('max-h-full')).toBe(true);
    expect(gridDiv.classList.contains('select-none')).toBe(true);
    expect(gridDiv.classList.contains('touch-manipulation')).toBe(true);
  });

  it('expert (30x16): grid has inline style.aspectRatio === "30 / 16"', async () => {
    const user = userEvent.setup();
    const { container } = render(<App />);
    const select = screen.getByRole('combobox', { name: /difficulty/i });
    await user.selectOptions(select, 'expert');
    const gridDiv = container.querySelector('.select-none.touch-manipulation') as HTMLElement;
    expect(gridDiv.style.display).toBe('grid');
    expect(gridDiv.style.aspectRatio).toBe('30 / 16');
    expect(gridDiv.classList.contains('max-w-full')).toBe(true);
    expect(gridDiv.classList.contains('max-h-full')).toBe(true);
    expect(gridDiv.classList.contains('select-none')).toBe(true);
    expect(gridDiv.classList.contains('touch-manipulation')).toBe(true);
  });
});

describe('fix-game-scaling: grid div retains single-axis sizing + fit caps together', () => {
  it('beginner: grid has inline width:100%, no inline height, and max-w-full + max-h-full caps simultaneously', () => {
    const { container } = render(<App />);
    const gridDiv = container.querySelector('.select-none.touch-manipulation') as HTMLElement;
    // single definite axis: width only (inline style, not a class)
    expect(gridDiv.style.width).toBe('100%');
    // height must be auto/derived — not pinned inline — so aspect-ratio is authoritative
    expect(gridDiv.style.height).toBe('');
    // fit caps (allow max-h-full to actually clamp a derived auto height)
    expect(gridDiv.classList.contains('max-w-full')).toBe(true);
    expect(gridDiv.classList.contains('max-h-full')).toBe(true);
  });

  it('intermediate: grid retains inline width:100%, no inline height, and max-w-full + max-h-full after difficulty switch', async () => {
    const user = userEvent.setup();
    const { container } = render(<App />);
    const select = screen.getByRole('combobox', { name: /difficulty/i });
    await user.selectOptions(select, 'intermediate');
    const gridDiv = container.querySelector('.select-none.touch-manipulation') as HTMLElement;
    expect(gridDiv.style.width).toBe('100%');
    expect(gridDiv.style.height).toBe('');
    expect(gridDiv.classList.contains('max-w-full')).toBe(true);
    expect(gridDiv.classList.contains('max-h-full')).toBe(true);
  });

  it('expert: grid retains inline width:100%, no inline height, and max-w-full + max-h-full after difficulty switch', async () => {
    const user = userEvent.setup();
    const { container } = render(<App />);
    const select = screen.getByRole('combobox', { name: /difficulty/i });
    await user.selectOptions(select, 'expert');
    const gridDiv = container.querySelector('.select-none.touch-manipulation') as HTMLElement;
    expect(gridDiv.style.width).toBe('100%');
    expect(gridDiv.style.height).toBe('');
    expect(gridDiv.classList.contains('max-w-full')).toBe(true);
    expect(gridDiv.classList.contains('max-h-full')).toBe(true);
  });
});

describe('fix-game-scaling: cell counts and cell attributes per difficulty', () => {
  it('beginner: 81 cells, each with data-testid, data-state, and aspect-square', () => {
    const { container } = render(<App />);
    const cells = container.querySelectorAll('[data-testid^="cell-"]');
    expect(cells.length).toBe(81); // 9 * 9
    cells.forEach((cell) => {
      expect(cell).toHaveAttribute('data-testid');
      expect(cell).toHaveAttribute('data-state');
      expect((cell as HTMLElement).classList.contains('aspect-square')).toBe(true);
    });
  });

  it('intermediate: 256 cells, each with data-testid, data-state, and aspect-square', async () => {
    const user = userEvent.setup();
    const { container } = render(<App />);
    const select = screen.getByRole('combobox', { name: /difficulty/i });
    await user.selectOptions(select, 'intermediate');
    const cells = container.querySelectorAll('[data-testid^="cell-"]');
    expect(cells.length).toBe(256); // 16 * 16
    cells.forEach((cell) => {
      expect(cell).toHaveAttribute('data-testid');
      expect(cell).toHaveAttribute('data-state');
      expect((cell as HTMLElement).classList.contains('aspect-square')).toBe(true);
    });
  });

  it('expert: 480 cells, each with data-testid, data-state, and aspect-square', async () => {
    const user = userEvent.setup();
    const { container } = render(<App />);
    const select = screen.getByRole('combobox', { name: /difficulty/i });
    await user.selectOptions(select, 'expert');
    const cells = container.querySelectorAll('[data-testid^="cell-"]');
    expect(cells.length).toBe(480); // 30 * 16
    cells.forEach((cell) => {
      expect(cell).toHaveAttribute('data-testid');
      expect(cell).toHaveAttribute('data-state');
      expect((cell as HTMLElement).classList.contains('aspect-square')).toBe(true);
    });
  });
});

describe('fix-game-scaling: failure cases (negative tests)', () => {
  it('grid div has inline style.width === "100%" (intentional single-axis anchor, not a pixel value)', () => {
    const { container } = render(<App />);
    const gridDiv = container.querySelector('.select-none.touch-manipulation') as HTMLElement;
    // width:100% is the correct single-axis anchor — no hard-coded pixel width allowed
    expect(gridDiv.style.width).toBe('100%');
    // Confirm it is NOT a pixel value (e.g. "360px")
    expect(gridDiv.style.width.endsWith('px')).toBe(false);
  });

  it('grid div does NOT have a direct pixel height in its inline style', () => {
    const { container } = render(<App />);
    const gridDiv = container.querySelector('.select-none.touch-manipulation') as HTMLElement;
    // height must be '' (auto/derived from aspect-ratio) — never a px value
    expect(gridDiv.style.height).toBe('');
  });

  it('fit wrapper is NOT the direct parent of the outer region (correct nesting order)', () => {
    const { container } = render(<App />);
    // The outer region (flex-1 min-h-0 min-w-0) must contain the fit wrapper,
    // not the other way around.
    const outerRegion = container.querySelector('.flex-1.min-h-0.min-w-0') as HTMLElement;
    const fitWrapper = container.querySelector('.w-full.h-full.min-h-0') as HTMLElement;
    expect(outerRegion).toBeInTheDocument();
    expect(fitWrapper).toBeInTheDocument();
    // fitWrapper must be a descendant of outerRegion
    expect(outerRegion.contains(fitWrapper)).toBe(true);
    // outerRegion must NOT be a descendant of fitWrapper
    expect(fitWrapper.contains(outerRegion)).toBe(false);
  });

  it('grid div is a descendant of the fit wrapper', () => {
    const { container } = render(<App />);
    const fitWrapper = container.querySelector('.w-full.h-full.min-h-0') as HTMLElement;
    const gridDiv = container.querySelector('.select-none.touch-manipulation') as HTMLElement;
    expect(fitWrapper).toBeInTheDocument();
    expect(gridDiv).toBeInTheDocument();
    expect(fitWrapper.contains(gridDiv)).toBe(true);
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
