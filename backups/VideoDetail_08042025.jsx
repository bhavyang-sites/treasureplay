// VideoDetail.jsx
import React, { useEffect, useRef, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import './VideoDetail.css';

// IDs eligible for Family Mode (lowercase)
const familyFilterEnabledVideos = ['adult', 'rapid_merged', 'swimwear'];

const VideoDetail = () => {
  const { id } = useParams();
  const [video, setVideo] = useState(undefined); // undefined = loading, null = not found
  const [skipMap, setSkipMap] = useState([]);
  const [familyMode, setFamilyMode] = useState(false);
  const [filteringProfile, setFilteringProfile] = useState('Mild');
  const [customProfile, setCustomProfile] = useState('');
  const customProfiles = ['Kids Safe', 'Teens', 'Religious'];

  const videoRef = useRef(null);
  const navigate = useNavigate();
  const normalizedId = String(id).toLowerCase();

  // Load video metadata (handle array, wrapped array, or single object)
  useEffect(() => {
    fetch('/video_metadata.json')
      .then(res => res.json())
      .then(json => {
        let arr = [];
        if (Array.isArray(json)) {
          arr = json;
        } else if (json.videos && Array.isArray(json.videos)) {
          arr = json.videos;
        } else {
          arr = [json];
        }
        const found = arr.find(v => String(v.id).toLowerCase() === normalizedId) || null;
        setVideo(found);
      })
      .catch(err => {
        console.error('Error loading metadata.json', err);
        setVideo(null);
      });
  }, [normalizedId]);

  // Determine which skip map URL to use based on profile
  const getSkipMapUrl = () => {
    if (!video || !video.skipMapUrl) return null;
    switch (filteringProfile) {
      case 'Mild':
        return video.skipMapUrl.mild;
      case 'Strict':
        return video.skipMapUrl.strict;
      case 'Custom':
        if (!customProfile) return null;
        const key = 'custom_' + customProfile.toLowerCase().replace(/ /g, '_');
        return video.skipMapUrl[key];
      default:
        return null;
    }
  };

  // Load skip map when video or profile changes
  useEffect(() => {
    const url = getSkipMapUrl();
    if (!url) {
      setSkipMap([]);
      return;
    }
    fetch(url)
      .then(res => res.json())
      .then(map => setSkipMap(map))
      .catch(console.error);
  }, [video, filteringProfile, customProfile]);

  // Apply skip segments during playback
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

  // Loading / not found states
  if (video === undefined) {
    return <div className="video-loading">Loading...</div>;
  }
  if (video === null) {
    return <div className="video-loading">Video not found.</div>;
  }

  // Use lowercase id for matching
  const videoIdLower = String(video.id).toLowerCase();

  return (
    <div className="video-detail-container">
      <button className="back-button" onClick={() => navigate('/')}>← Back</button>
      <h2 className="video-title">{video.title}</h2>
      <div className="video-detail-content">
        <div className="controls-panel">
          {familyFilterEnabledVideos.includes(videoIdLower) && (
            <>
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
                  <div className="profile-selector">
                    {['Mild', 'Strict', 'Custom'].map(opt => (
                      <label key={opt}>
                        <input
                          type="radio"
                          value={opt}
                          checked={filteringProfile === opt}
                          onChange={() => setFilteringProfile(opt)}
                        />
                        {opt}
                      </label>
                    ))}
                  </div>
                  {filteringProfile === 'Custom' && (
                    <div className="custom-dropdown">
                      <label>Select Custom Profile:</label>
                      <select
                        value={customProfile}
                        onChange={e => setCustomProfile(e.target.value)}
                      >
                        <option value="">— Choose —</option>
                        {customProfiles.map(p => (
                          <option key={p} value={p}>
                            {p}
                          </option>
                        ))}
                      </select>
                    </div>
                  )}
                  <div className="profile-description">
                    {filteringProfile === 'Mild' &&
                      'Blocks only explicit content. Ideal for general audiences.'}
                    {filteringProfile === 'Strict' &&
                      'Strictly filters nudity, suggestive content, and violence. Best for young kids.'}
                    {filteringProfile === 'Custom' &&
                      customProfile &&
                      `Custom settings applied: ${customProfile}`}
                    {filteringProfile === 'Custom' &&
                      !customProfile &&
                      'Please select a custom profile to apply.'}
                  </div>
                </div>
              )}
            </>
          )}
        </div>
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
