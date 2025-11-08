import React, { useEffect, useRef, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import './VideoDetail.css';

const familyFilterEnabledVideos = ['adult', 'rapid_merged']; // IDs that qualify for Family Mode

const VideoDetail = () => {
  const { id } = useParams();
  const [video, setVideo] = useState(null);
  const [skipMap, setSkipMap] = useState([]);
  const [familyMode, setFamilyMode] = useState(true);
  const videoRef = useRef(null);
  const navigate = useNavigate();

  useEffect(() => {
    fetch('/video_metadata.json')
      .then(res => res.json())
      .then(data => setVideo(data.find(v => v.id === id) || null));
  }, [id]);

  useEffect(() => {
    if (!video) return;
    fetch(video.skipMapUrl)
      .then(res => res.json())
      .then(map => setSkipMap(map));
  }, [video]);

  useEffect(() => {
    const vid = videoRef.current;
    if (!vid || !familyMode) return;
    const onTimeUpdate = () => {
      const t = vid.currentTime;
      for (const s of skipMap) {
        if (t >= s.start && t < s.end) {
          vid.currentTime = s.end;
          break;
        }
      }
    };
    vid.addEventListener('timeupdate', onTimeUpdate);
    return () => vid.removeEventListener('timeupdate', onTimeUpdate);
  }, [skipMap, familyMode]);

  if (!video) return <div className="video-loading">Loading...</div>;

  return (
    <div className="video-detail-container">
      <button className="back-button" onClick={() => navigate('/')}>← Back</button>

      {/* Video Title */}
      <h2 className="video-title">{video.title}</h2>

      {/* 👨‍👩‍👧‍👦 Family Mode Toggle (for eligible videos only) */}
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
            Family Mode {familyMode ? 'ON' : 'OFF'}
          </span>
        </div>
      )}

      {/* Video Player */}
      <div className="video-wrapper">
        <video ref={videoRef} controls className="video-player">
          <source src={video.videoUrl} type="video/mp4" />
          Your browser does not support HTML5 video.
        </video>
      </div>
    </div>
  );
};

export default VideoDetail;
