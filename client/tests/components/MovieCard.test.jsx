import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import MovieCard from 'src/components/MovieCard';

describe('MovieCard', () => {
  it('renders movie title and poster', () => {
    const movie = { title: 'Test Movie', poster: 'poster.png' };
    render(<MovieCard movie={movie} onClick={jest.fn()} />);
    expect(screen.getByAltText(/Test Movie/i)).toBeInTheDocument();
  });

  it('calls onClick when card is clicked', () => {
    const movie = { title: 'Test Movie', poster: 'poster.png' };
    const onClick = jest.fn();
    render(<MovieCard movie={movie} onClick={onClick} />);
    fireEvent.click(screen.getByAltText(/Test Movie/i));
    expect(onClick).toHaveBeenCalledWith(movie);
  });
});
