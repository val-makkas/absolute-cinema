import React from 'react';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import App from 'src/App';

describe('App', () => {
  it('renders main layout and header', () => {
    render(
      <MemoryRouter>
        <App />
      </MemoryRouter>
    );
    expect(screen.getByText(/Absolute Cinema/i)).toBeInTheDocument();
  });
});
