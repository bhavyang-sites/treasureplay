// VideoDetail.jsx
import React, { useEffect, useRef, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import './VideoDetail.css';

const VideoDetail = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const normalizedId = id.toLowerCase();

  // Video metadata state
  const [video, setVideo] = useState();           // undefined=loading, null=not found, object=loaded
  const [skipMap, setSkipMap] = useState([]);     // for the currently selected profile
  const [familyMode, setFamilyMode] = useState(false);
  // const [filteringProfile, setFilteringProfile] = useState('Mild');
  const [filteringProfile, setFilteringProfile] = useState('Strict');
  const [customProfile, setCustomProfile] = useState('');
  const customProfiles = ['Kids Safe', 'Teens', 'Religious'];

  const handleProfileChange = (e) => {
  const val = e.target.value;
  setFilteringProfile(val);
  if (val !== 'Custom') setCustomProfile(''); // avoid stale subprofile
  };

  // Flag: true if ANY one of the profile skip maps has ≥1 segment
  const [hasAnyProfileSegments, setHasAnyProfileSegments] = useState(false);

  const videoRef = useRef(null);

  // 1️⃣ Load metadata
  useEffect(() => {
    fetch('/video_metadata.json')
      .then(res => res.json())
      .then(json => {
        const arr = Array.isArray(json)
          ? json
          : (json.videos && Array.isArray(json.videos))
            ? json.videos
            : [json];
        const found = arr.find(v => v.id.toLowerCase() === normalizedId) || null;
        setVideo(found);
      })
      .catch(err => {
        console.error('Error loading metadata.json', err);
        setVideo(null);
      });
  }, [normalizedId]);

  // 2️⃣ After metadata loads, check all profile maps for any segments
  useEffect(() => {
    if (!video || (!video.skipMapUrl && video.skipMapUrl !== '')) {
      setHasAnyProfileSegments(false);
      return;
    }

    // Support both string (legacy) and object (multi‐profile) forms
    const urls = typeof video.skipMapUrl === 'string'
      ? [video.skipMapUrl]
        : Object.values(video.skipMapUrl);
    let cancelled = false;

    Promise.all(
      urls.map(url =>
        fetch(url)
          .then(res => res.json())
          .then(arr => Array.isArray(arr) && arr.length > 0)
          .catch(() => false)
      )
    ).then(results => {
      if (!cancelled) {
        setHasAnyProfileSegments(results.some(x => x));
      }
    });

    return () => { cancelled = true; };
  }, [video]);

  // 3️⃣ Helper to pick the right skipMap URL per profile
  const getSkipMapUrl = () => {
    if (!video) return null;
    // Legacy string case
    if (typeof video.skipMapUrl === 'string') {
      return video.skipMapUrl;
    }
    // Object case
    switch (filteringProfile) {
      case 'Mild':   return video.skipMapUrl.mild;
      case 'Strict': return video.skipMapUrl.strict;
      case 'Custom':
        if (customProfile) {
          return video.skipMapUrl['custom_' + customProfile.toLowerCase().replace(/ /g, '_')];
        }
      // fallback to Mild profile's skip map if no custom sub-profile chosen
      return video.skipMapUrl.mild || null;
      default: return null;
    }
  };

  // 4️⃣ Load the skipMap whenever profile changes
  useEffect(() => {
    const url = getSkipMapUrl();
    if (!url) {
      setSkipMap([]);
      return;
    }
    fetch(url)
      .then(res => res.json())
      .then(map => setSkipMap(Array.isArray(map) ? map : []))
      .catch(err => {
        console.error('Failed to load skip-map:', err);
        setSkipMap([]);
      });
  }, [video, filteringProfile, customProfile]);

  // 5️⃣ Skip logic during playback
  useEffect(() => {
    const vid = videoRef.current;
    if (!vid || !familyMode) return;
    const skip = () => {
      const t = vid.currentTime;
      for (const s of skipMap) {
        if (t >= s.start && t < s.end) {
          vid.currentTime = s.end;
          break;
        }
      }
    };
    vid.addEventListener('timeupdate', skip);
    vid.addEventListener('seeking', skip);
    return () => {
      vid.removeEventListener('timeupdate', skip);
      vid.removeEventListener('seeking', skip);
    };
  }, [skipMap, familyMode]);

  // Loading / Not found
  if (video === undefined) return <div className="video-loading">Loading...</div>;
  if (video === null)      return <div className="video-loading">Video not found.</div>;

return (
  <div className="video-detail-container">
    <button className="back-button" onClick={() => navigate('/')}>← Back</button>
    <h2 className="video-title">{video.title}</h2>

    <div className="video-detail-content">
      <div className="controls-panel">
        {/* Only show Family Mode UI if at least one profile map has segments */}
        {hasAnyProfileSegments && (
          <>
            {/* Family Mode Toggle */}
            <div className="toggle-block">
              <div className="toggle-row">
                <input
                  id="family-toggle"
                  type="checkbox"
                  className="toggle-checkbox"
                  checked={familyMode}
                  onChange={e => {
                    const on = e.target.checked;
                    setFamilyMode(on);
                    if (on) {
                      setFilteringProfile('Strict');   // default profile on enable (changed from Mild to Strict for demo video)
                      setCustomProfile('');          // optional: clear custom choice
                    }

                  }}
                />
                <label htmlFor="family-toggle" className="toggle-switch" />

                {/* Family Mode ON/OFF next to toggle, with spacing */}
                <span className="toggle-status">
                  {familyMode ? 'Family Mode is On' : 'Family Mode is Off'}
                </span>
              </div>

              {/* Active profile info on the next line */}
              {familyMode && (
                <div className="profile-row">
                  <em>Active Profile:</em>{' '}
                  <span className="profile-name">
                    {filteringProfile === 'Custom'
                      ? (customProfile || 'Custom') /* guard so it never crashes */
                      : filteringProfile}
                  </span>
                  <span className="segments-info">
                  &nbsp;•&nbsp;Skips: <strong>{skipMap.length}</strong>
                  </span>
                </div>
              )}
            </div>

            {/* Profile selector */}
            {familyMode && (
            <div className="select-wrap">
            <select 
              className="select-modern"
              value={filteringProfile} 
              onChange={handleProfileChange}
              >
                <option value="Mild">Mild</option>
                <option value="Strict">Strict</option>
                <option value="Custom">Custom</option>
              </select>
            </div>
            )}
            {/* Custom sub-profile dropdown */}
            {familyMode && filteringProfile === 'Custom' && (
            <div className="select-wrap">
              <select
                className="select-modern"
                value={customProfile}
                onChange={(e) => setCustomProfile(e.target.value)}
              >
                <option value="">Select a sub-profile…</option>
                {customProfiles.map(p => (
                  <option key={p} value={p}>{p}</option>
                ))}
              </select>
              <span className="select-arrow" aria-hidden>▾</span>
              </div>
            )}
            {familyMode && filteringProfile === 'Custom' && (
            <div className="profile-description">
              {filteringProfile === 'Mild' &&
                'Blocks only explicit content. Ideal for general audiences.'}
              {filteringProfile === 'Strict' &&
                'Strictly filters nudity, suggestive content, and violence. Best for young kids.'}
              {filteringProfile === 'Custom' && customProfile &&
                `Custom settings applied: ${customProfile}`}
              {filteringProfile === 'Custom' && !customProfile &&
                'Please select a custom profile to apply.'}
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
