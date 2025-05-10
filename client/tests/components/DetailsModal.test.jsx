import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import DetailsModal from 'src/components/DetailsModal';

describe('DetailsModal', () => {
  it('renders movie details and close button', () => {
    render(
      <MemoryRouter>
        <DetailsModal
          open={true}
          onClose={jest.fn()}
          details={{ title: 'Movie', overview: 'Desc' }}
          extensionManifests={{}}
          detailsLoading={false}
          CARD_BG="#000"
          OVERLAY_BG="#000"
          BORDER_GREY="#000"
          WHITE="#fff"
          LIGHT_GREY="#ccc"
          FONT_HEADER="Arial"
          onWatchAlone={jest.fn()}
        />
      </MemoryRouter>
    );
    expect(screen.getByText(/Movie/i)).toBeInTheDocument();
    expect(screen.getAllByText(/Desc/).length).toBeGreaterThan(0);
  });

  it('calls onClose when close button is clicked', () => {
    const onClose = jest.fn();
    render(
      <MemoryRouter>
        <DetailsModal
          open={true}
          onClose={onClose}
          details={{ title: 'Movie', overview: 'Desc' }}
          extensionManifests={{}}
          detailsLoading={false}
          CARD_BG="#000"
          OVERLAY_BG="#000"
          BORDER_GREY="#000"
          WHITE="#fff"
          LIGHT_GREY="#ccc"
          FONT_HEADER="Arial"
          onWatchAlone={jest.fn()}
        />
      </MemoryRouter>
    );
  });
});
