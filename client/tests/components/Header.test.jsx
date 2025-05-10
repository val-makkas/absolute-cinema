import React from 'react';
import { render, screen } from '@testing-library/react';
import Header from 'src/components/Header';

describe('Header', () => {
  it('renders logo and title', () => {
    render(
      <Header
        search=""
        setSearch={jest.fn()}
        CARD_BG="#000"
        BORDER_GREY="#222"
        WHITE="#fff"
        FONT_HEADER="Arial"
      />
    );
    expect(screen.getByAltText(/logo/i)).toBeInTheDocument();
    expect(screen.getByText(/ABSOLUTE CINEMA/i)).toBeInTheDocument();
  });
});
