import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import ExtensionsModal from 'src/components/app/ExtensionsModal';

describe('ExtensionsModal', () => {
  const mockManifests = {
    ext1: { name: 'Extension 1', description: 'Desc 1', logo: '', background: '' },
    ext2: { name: 'Extension 2', description: 'Desc 2', logo: '', background: '' },
  };
  it('renders modal with extension list and close button', () => {
    render(<ExtensionsModal open={true} onOpenChange={jest.fn()} extensions={['ext1', 'ext2']} extensionManifests={mockManifests} newManifestUrl="" setNewManifestUrl={jest.fn()} onAdd={jest.fn()} onRemove={jest.fn()} showExtensionDetails={null} setShowExtensionDetails={jest.fn()} />);
    // There are multiple elements with "Extensions" text, so use getAllByText
    expect(screen.getAllByText(/Extensions/i).length).toBeGreaterThan(0);
    // Try to find the close button by role and name, including hidden text
    const closeBtn = screen.getByRole('button', { name: /close/i, hidden: true });
    expect(closeBtn).toBeInTheDocument();
  });

  it('calls onOpenChange when close button is clicked', () => {
    const onOpenChange = jest.fn();
    render(<ExtensionsModal open={true} onOpenChange={onOpenChange} extensions={['ext1']} extensionManifests={mockManifests} newManifestUrl="" setNewManifestUrl={jest.fn()} onAdd={jest.fn()} onRemove={jest.fn()} showExtensionDetails={null} setShowExtensionDetails={jest.fn()} />);
    const closeBtn = screen.getByRole('button', { name: /close/i, hidden: true });
    fireEvent.click(closeBtn);
    expect(onOpenChange).toHaveBeenCalled();
  });
});
