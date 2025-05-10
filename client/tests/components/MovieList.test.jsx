import React from 'react';
import { render, screen } from '@testing-library/react';
import MovieList from 'src/components/MovieList';

describe('MovieList', () => {
  it('renders a list of movies', () => {
    const movies = [
      { id: 1, title: 'Movie 1', poster: 'poster1.png' },
      { id: 2, title: 'Movie 2', poster: 'poster2.png' },
    ];
    render(<MovieList movies={movies} onMovieClick={jest.fn()} />);
    expect(screen.getByAltText(/Movie 1/i)).toBeInTheDocument();
    expect(screen.getByAltText(/Movie 2/i)).toBeInTheDocument();
  });

  it('renders nothing when movies list is empty', () => {
    render(<MovieList movies={[]} onMovieClick={jest.fn()} />);
    expect(screen.queryByRole('img')).not.toBeInTheDocument();
    expect(screen.queryByText(/Movie/i)).not.toBeInTheDocument();
  });

  it('calls onMovieClick when a movie is clicked', () => {
    const movies = [
      { id: 1, title: 'Movie 1', poster: 'poster1.png' },
      { id: 2, title: 'Movie 2', poster: 'poster2.png' },
    ];
    const onMovieClick = jest.fn();
    render(<MovieList movies={movies} onMovieClick={onMovieClick} />);
    const movie1 = screen.getByAltText(/Movie 1/i);
    movie1.click();
    expect(onMovieClick).toHaveBeenCalledWith(movies[0]);
  });

  it('handles missing poster or title gracefully', () => {
    const movies = [
      { id: 1, title: '', poster: '' },
      { id: 2 },
    ];
    render(<MovieList movies={movies} onMovieClick={jest.fn()} />);
    // Should render fallback or empty for missing title/poster
    // The component only renders an image if poster and title are present
    expect(screen.getAllByRole('img').length).toBe(1);
  });

  it('renders correct alt text for movie posters', () => {
    const movies = [
      { id: 1, title: 'Movie 1', poster: 'poster1.png' },
    ];
    render(<MovieList movies={movies} onMovieClick={jest.fn()} />);
    const img = screen.getByAltText('Movie 1');
    expect(img).toBeInTheDocument();
  });
});
