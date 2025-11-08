import React from 'react';
import { Routes, Route } from 'react-router-dom';
import HomePage from './HomePage';
import VideoDetail from './VideoDetail';

function App() {
  return (
    <Routes>
      <Route path="/" element={<HomePage />} />
      <Route path="/video/:id" element={<VideoDetail />} />
    </Routes>
  );
}

export default App;
