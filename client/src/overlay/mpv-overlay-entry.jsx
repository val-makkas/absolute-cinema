import React from 'react';
import { createRoot } from 'react-dom/client';
import MpvOverlay from './mpv-overlay.jsx';

const root = createRoot(document.getElementById('root'));
root.render(<MpvOverlay />);
