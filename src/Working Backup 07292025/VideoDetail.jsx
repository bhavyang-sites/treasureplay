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
  const [familyMode, setFamilyMode] = useState(false);
  const [filteringProfile, setFilteringProfile] = useState("Mild");
  const [customProfile, setCustomProfile] = useState("");
  const customProfiles = ["Kids Safe", "Teens", "Religious"];

  const videoRef = useRef(null);
  const navigate = useNavigate();

  // load video metadata...
  useEffect(() => {
    fetch('/video_metadata.json')
      .then(res => res.json())
      .then(data => {
        const found = data.find(v => v.id === id);
        setVideo(found || null);
      })
      .catch(console.error);
  }, [id]);

  // load skip map...
  useEffect(() => {
    if (!video) return;
    fetch(video.skipMapUrl)
      .then(res => res.json())
      .then(map => setSkipMap(map))
      .catch(console.error);
  }, [video]);

  // skip logic...
  useEffect(() => {
    const vid = videoRef.current;
    if (!vid || !familyMode) return;

    const skipSegments = () => {
      const t = vid.currentTime;
      for (const s of skipMap) {
        if (t >= s.start && t < s.end) {
          vid.currentTime = s.end;
          break;
        }
      }
    };

    vid.addEventListener('timeupdate', skipSegments);
    vid.addEventListener('seeking', skipSegments);
    return () => {
      vid.removeEventListener('timeupdate', skipSegments);
      vid.removeEventListener('seeking', skipSegments);
    };
  }, [skipMap, familyMode]);

  if (!video) {
    return <div className="video-loading">Loading...</div>;
  }

// …above imports and hooks…

return (
  <div className="video-detail-container">
    {/* Back button */}
    <button className="back-button" onClick={() => navigate('/')}>← Back</button>

    {/* Title */}
    <h2 className="video-title">{video.title}</h2>

    {/* NEW: side-by-side layout */}
    <div className="video-detail-content">
      {/* ← Controls panel */}
      <div className="controls-panel">
        {familyFilterEnabledVideos.includes(video.id) && (
          <>
            {/* Family Mode Toggle */}
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

            {familyMode && (
              <div className="profile-block">
                {/* Radio group */}
                <div className="profile-selector">
                  {['Mild','Strict','Custom'].map(opt => (
                    <label key={opt}>
                      <input
                        type="radio"
                        value={opt}
                        checked={filteringProfile===opt}
                        onChange={() => setFilteringProfile(opt)}
                      />
                      {opt}
                    </label>
                  ))}
                </div>

                {/* Custom dropdown */}
                {filteringProfile==='Custom' && (
                  <div className="custom-dropdown">
                    <label>Select Custom Profile:</label>
                    <select
                      value={customProfile}
                      onChange={e=>setCustomProfile(e.target.value)}
                    >
                      <option value="">— Choose —</option>
                      {customProfiles.map(p=>(
                        <option key={p} value={p}>{p}</option>
                      ))}
                    </select>
                  </div>
                )}

                {/* Description */}
                <div className="profile-description">
                  {filteringProfile==='Mild'   && 'Blocks only explicit content. Ideal for general audiences.'}
                  {filteringProfile==='Strict' && 'Strictly filters nudity, suggestive content, and violence. Best for young kids.'}
                  {filteringProfile==='Custom' && customProfile && `Custom settings applied: ${customProfile}`}
                  {filteringProfile==='Custom' && !customProfile && 'Please select a custom profile to apply.'}
                </div>
              </div>
            )}
          </>
        )}
      </div>

      {/* → Video player */}
      <div className="video-wrapper">
        <video ref={videoRef} controls className="video-player">
          <source src={video.videoUrl} type="video/mp4" />
          Your browser does not support HTML5 video.
        </video>
      </div>
    </div>
  </div>
);
};

export default VideoDetail;
