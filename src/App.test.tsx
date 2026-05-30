import { render, screen } from '@testing-library/react';
import App from './App';

it('renders the placeholder heading', () => {
  render(<App />);
  expect(screen.getByRole('heading')).toBeInTheDocument();
});

it('heading text is AI-DLC', () => {
  render(<App />);
  expect(screen.getByRole('heading', { name: 'AI-DLC' })).toBeInTheDocument();
});
