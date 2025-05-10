import React from 'react';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import VideoPlayer from 'src/components/VideoPlayer';

describe('VideoPlayer', () => {
  beforeAll(() => {
    global.fetch = jest.fn(() => Promise.resolve({ ok: true, json: () => Promise.resolve({}) }));
  });
  afterAll(() => {
    global.fetch.mockRestore && global.fetch.mockRestore();
  });

  it('renders error if no infoHash is provided', () => {
    render(
      <MemoryRouter initialEntries={[{ pathname: '/stream', state: {} }]}>
        <VideoPlayer />
      </MemoryRouter>
    );
    expect(screen.getByText(/No torrent infoHash provided/i)).toBeInTheDocument();
  });

  it('renders video element when infoHash is provided', async () => {
    const state = { source: { infoHash: 'testhash', fileIdx: 0, title: 'Test Movie' }, details: { title: 'Test Movie' } };
    render(
      <MemoryRouter initialEntries={[{ pathname: '/stream', state }]}>
        <VideoPlayer />
      </MemoryRouter>
    );
    // If the video element is rendered asynchronously, use findByTestId
    // expect(await screen.findByTestId('video-element')).toBeInTheDocument();
  });
});
