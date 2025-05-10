import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import SearchModal from 'src/components/app/SearchModal';

describe('SearchModal', () => {
  it('renders search input', () => {
    render(<SearchModal open={true} onClose={jest.fn()} search="" setSearch={jest.fn()} />);
    expect(screen.getByPlaceholderText(/Search movies/i)).toBeInTheDocument();
  });

  it('calls setSearch when input changes', () => {
    const setSearch = jest.fn();
    render(<SearchModal open={true} onClose={jest.fn()} search="" setSearch={setSearch} />);
    fireEvent.change(screen.getByPlaceholderText(/Search movies/i), { target: { value: 'test' } });
    expect(setSearch).toHaveBeenCalledWith('test');
  });
});
