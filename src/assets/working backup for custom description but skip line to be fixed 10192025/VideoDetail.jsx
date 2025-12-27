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

  const [duration, setDuration] = useState(0);


  // Load last selected profile from localStorage
useEffect(() => {
  const savedProfile = localStorage.getItem('lastProfile');
  if (savedProfile) {
    setFilteringProfile(savedProfile);
  }
}, []);

// Save current profile to localStorage whenever changed
useEffect(() => {
  localStorage.setItem('lastProfile', filteringProfile);
}, [filteringProfile]);


  const videoRef = useRef(null);

  useEffect(() => {
  const v = videoRef.current;
  if (!v) return;

  const updateDuration = () => setDuration(v.duration || 0);

  // If duration already known (cached), set immediately
  if (v.readyState >= 1) updateDuration();

  v.addEventListener("loadedmetadata", updateDuration);
  return () => v.removeEventListener("loadedmetadata", updateDuration);
}, [video]);


//Scrubber with skip maps
function SmartSkipsBar({ duration, segments, familyMode }) {
  if (!duration || !segments.length) return null;

  return (
    <div
      className={`ss-bar ${!familyMode ? 'dimmed' : ''}`}
      aria-label="SmartSkips timeline"
      style={{
        width: '100%',        // keep aligned with video width
        marginTop: '4px',
        position: 'relative',
      }}
    >
      {segments.map((s, i) => {
        const left = (s.start / duration) * 100;
        const width = ((s.end - s.start) / duration) * 100;

        return (
          <div
            key={i}
            className="ss-seg"
            style={{
              left: `${left}%`,
              width: `${width}%`,
              top: 0,
              bottom: 0,
            }}
            title={
                    (s.label || s.reason)
                    ? `${s.label || s.reason} (${s.start.toFixed(1)}s–${s.end.toFixed(1)}s)`
                    : `Skipped segment (${s.start.toFixed(1)}s–${s.end.toFixed(1)}s)`
                  }


          />
        );
      })}
    </div>
  );
}




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

// 2️⃣ Check all profiles for any segments (safe, supports string|object)
useEffect(() => {
  if (!video) { setHasAnyProfileSegments(false); return; }

  const raw = video.skipMapUrl;
  let urls = [];

  if (typeof raw === 'string') {
    if (raw.trim()) urls = [raw.trim()];              // only non-empty
  } else if (raw && typeof raw === 'object') {
    urls = Object.values(raw).filter(Boolean);        // truthy URLs only
  }

  if (!urls.length) { setHasAnyProfileSegments(false); return; }

  let canceled = false;
  Promise.all(
    urls.map(u =>
      fetch(u)
        .then(r => r.json())
        .then(j => {
          const arr = Array.isArray(j) ? j : (Array.isArray(j?.segments) ? j.segments : []);
          return Array.isArray(arr) && arr.length > 0;
        })
        .catch(() => false)
    )
  ).then(res => !canceled && setHasAnyProfileSegments(res.some(Boolean)));

  return () => { canceled = true; };
}, [video]);


  // 3️⃣ Helper to pick the right skipMap URL per profile
  const getSkipMapUrl = () => {
  if (!video) return null;
  const raw = video.skipMapUrl;

  if (typeof raw === 'string') return raw.trim() || null;

  if (!raw || typeof raw !== 'object') return null;

  if (filteringProfile === 'Custom') {
    if (customProfile) {
      const key = 'custom_' + customProfile.toLowerCase().replace(/ /g, '_');
      return raw[key] || null;
    }
    return raw.mild || null; // fallback
  }
  return raw[filteringProfile.toLowerCase()] || null; // 'mild' | 'strict'
};


  // 4️⃣ Load the skipMap whenever profile changes
 useEffect(() => {
  const url = getSkipMapUrl();
  if (!url) { setSkipMap([]); return; }

  fetch(url)
    .then(res => res.json())
    .then(j => {
      const raw = Array.isArray(j) ? j : (Array.isArray(j?.segments) ? j.segments : []);
      const norm = raw
            .map(s => ({
              start: +s.start,
              end: +s.end,
              label: s.label || s.reason,   // ✅ keep label or fallback
              reason: s.reason || s.label,  // ✅ keep backward compatibility
              action: s.action,
              source: s.source
            }))
            .filter(s => Number.isFinite(s.start) && Number.isFinite(s.end) && s.end > s.start)
            .sort((a,b) => a.start - b.start);

      setSkipMap(norm);
    })
    .catch(err => { console.error('Failed to load skip-map:', err); setSkipMap([]); });
}, [video, filteringProfile, customProfile]);


  // 5️⃣ Skip logic during playback
// 5️⃣ Robust skip logic during playback
useEffect(() => {
  const vid = videoRef.current;
  if (!vid) return;

  // only "skip" actions, sorted
  const segments = (skipMap || [])
    .filter(s => (s.action || 'skip') === 'skip')
    .sort((a,b) => a.start - b.start);

  if (!familyMode || segments.length === 0) return;

  // a little slack prevents boundary flicker / misses
  const EPS_START = 0.12; // enter a tad early
  const EPS_END   = 0.04; // leave a tad early

  let lastJumpAt = -1;

  const jumpIfNeeded = () => {
    // if family mode toggled off mid-flight, bail
    if (!familyMode) return;

    const t = vid.currentTime || 0;

    // don't immediately re-trigger after a jump
    if (lastJumpAt >= 0 && (t - lastJumpAt) < 0.15) return;

    // find any segment that currently contains t (with slack)
    for (let i = 0; i < segments.length; i++) {
      const s = segments[i];
      if (t >= (s.start - EPS_START) && t < (s.end - EPS_END)) {
        const dur = vid.duration || Infinity;
        const target = Math.min(s.end + 0.02, dur - 0.05);
        if (Math.abs(target - t) > 0.01) {
          vid.currentTime = target;
          lastJumpAt = target;
        }
        break;
      }
    }
  };

  // run often enough to never miss narrow segments
  const interval = setInterval(jumpIfNeeded, 100); // 10 Hz

  // also hook player events
  vid.addEventListener('timeupdate', jumpIfNeeded);
  vid.addEventListener('seeking', jumpIfNeeded);
  vid.addEventListener('seeked', () => requestAnimationFrame(jumpIfNeeded));
  vid.addEventListener('loadeddata', jumpIfNeeded);
  vid.addEventListener('play', jumpIfNeeded);
  vid.addEventListener('ratechange', jumpIfNeeded);

  // trigger once right away (e.g., if playback starts inside a segment)
  jumpIfNeeded();

  return () => {
    clearInterval(interval);
    vid.removeEventListener('timeupdate', jumpIfNeeded);
    vid.removeEventListener('seeking', jumpIfNeeded);
    vid.removeEventListener('seeked', () => requestAnimationFrame(jumpIfNeeded));
    vid.removeEventListener('loadeddata', jumpIfNeeded);
    vid.removeEventListener('play', jumpIfNeeded);
    vid.removeEventListener('ratechange', jumpIfNeeded);
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
            {familyMode && (
  <div className="profile-description">
    {filteringProfile === 'Mild'   && 'Blocks only explicit content. Ideal for general audiences.'}
    {filteringProfile === 'Strict' && 'Strictly filters nudity, suggestive content, and violence. Best for young kids.'}
    {filteringProfile === 'Custom' && (customProfile
      ? `Custom settings applied: ${customProfile}`
      : 'Please select a custom profile to apply.'
    )}
  </div>
)}

          </>
        )}
      </div>
      
<div className="video-wrapper" style={{ position: 'relative' }}>
  <video
    ref={videoRef}
    className="video-player"
    src={video.videoUrl}
    poster={video.thumbnail}
    controls
    preload="metadata"
  />
  <SmartSkipsBar
    duration={duration}
    segments={familyMode ? skipMap : []}
    className={!familyMode ? 'dimmed' : ''}
  />



<p style={{ color: 'white', fontSize: '12px' }}>
  Duration: {duration.toFixed(2)}s | Segments: {skipMap.length}
</p>


</div>

    </div>
  </div>
);
};

export default VideoDetail;
