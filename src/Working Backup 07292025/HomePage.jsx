import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import './HomePage.css'; // Import our custom CSS

const HomePage = () => {
  const [videoMetadata, setVideoMetadata] = useState([]);
  const navigate = useNavigate();

  useEffect(() => {
    fetch('/video_metadata.json')
      .then(res => res.json())
      .then(data => setVideoMetadata(data))
      .catch(err => console.error('Failed to load video metadata:', err));
  }, []);

  return (
    <div className="homepage-container">
      <h1 className="header">Family Mode Player</h1>
      <div className="thumbnail-row">
        {videoMetadata.map(video => (
          <div
            key={video.id}
            className="thumbnail-item"
            onClick={() => navigate(`/video/${video.id}`)}
          >
            <img
              src={video.thumbnail}
              alt={video.title}
              className="thumbnail-image"
            />
            <p className="thumbnail-title">{video.title}</p>
          </div>
        ))}
      </div>
    </div>
  );
};

export default HomePage;
