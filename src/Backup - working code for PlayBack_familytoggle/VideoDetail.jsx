// VideoDetail.jsx
import React, { useEffect, useRef, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import './VideoDetail.css';

// IDs eligible for Family Mode
const familyFilterEnabledVideos = ['adult', 'rapid_merged'];

const VideoDetail = () => {
  const { id } = useParams();
  const [video, setVideo] = useState(null);
  const [skipMap, setSkipMap] = useState([]);
  // Family Mode is OFF by default now
  const [familyMode, setFamilyMode] = useState(false);
  const videoRef = useRef(null);
  const navigate = useNavigate();

  // Load metadata for the selected video
  useEffect(() => {
    fetch('/video_metadata.json')
      .then(res => res.json())
      .then(data => {
        const found = data.find(v => v.id === id);
        setVideo(found || null);
      })
      .catch(console.error);
  }, [id]);

  // Load skip map for the selected video
  useEffect(() => {
    if (!video) return;
    fetch(video.skipMapUrl)
      .then(res => res.json())
      .then(map => setSkipMap(map))
      .catch(console.error);
  }, [video]);

  // Skip logic: skip segments during playback and when user seeks
  useEffect(() => {
    const vid = videoRef.current;
    if (!vid || !familyMode) return;

    const skipSegments = () => {
      const currentTime = vid.currentTime;
      for (const segment of skipMap) {
        if (currentTime >= segment.start && currentTime < segment.end) {
          // Jump to end of the segment
          vid.currentTime = segment.end;
          break;
        }
      }
    };

    // Attach listeners
    vid.addEventListener('timeupdate', skipSegments);
    vid.addEventListener('seeking', skipSegments);
    // Cleanup listeners
    return () => {
      vid.removeEventListener('timeupdate', skipSegments);
      vid.removeEventListener('seeking', skipSegments);
    };
  }, [skipMap, familyMode]);

  if (!video) {
    return <div className="video-loading">Loading...</div>;
  }

  return (
    <div className="video-detail-container">
      {/* Back button */}
      <button className="back-button" onClick={() => navigate('/')}>← Back</button>

      {/* Video title */}
      <h2 className="video-title">{video.title}</h2>

      {/* Family Mode Toggle (shown only for eligible videos) */}
      {familyFilterEnabledVideos.includes(video.id) && (
        <div className="toggle-container">
          <input
            id="family-toggle"
            type="checkbox"
            className="toggle-checkbox"
            checked={familyMode}
            onChange={e => setFamilyMode(e.target.checked)}
          />
          <label htmlFor="family-toggle" className="toggle-switch" />
          <span className="toggle-text">
            {familyMode ? 'Family Mode: ON' : 'Family Mode: OFF'}
          </span>
        </div>
      )}

      {/* Video player wrapper */}
      <div className="video-wrapper">
        <video
          ref={videoRef}
          controls
          className="video-player"
        >
          <source src={video.videoUrl} type="video/mp4" />
          Your browser does not support HTML5 video.
        </video>
      </div>
    </div>
  );
};

export default VideoDetail;
