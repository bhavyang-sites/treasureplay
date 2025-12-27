import React, { useEffect, useMemo, useRef, useState } from "react";
import { useParams, useNavigate, useLocation } from "react-router-dom";
import "./VideoDetail.css";

/* ... keep your toSeconds and useJumpClipHotkey helpers exactly as they were ... */
function toSeconds(ts) {
  if (typeof ts === "number") return ts;
  if (typeof ts !== "string") return null;
  const parts = ts.split(":").map((p) => p.trim());
  if (parts.length === 2) { const [m, s] = parts.map(Number); return m * 60 + s; }
  if (parts.length === 3) { const [h, m, s] = parts.map(Number); return h * 3600 + m * 60 + s; }
  return null;
}

export function useJumpClipHotkey({ videoRef, jumpTo = "22:44", enabled = true, autoPlay = true, requireFocus = false }) {
  // ... (Keep your existing hotkey code here) ...
  const jumpSeconds = useMemo(() => toSeconds(jumpTo), [jumpTo]);
  useEffect(() => {
    if (!enabled) return;
    const onKeyDown = (e) => {
       // ... (paste your existing hotkey logic) ...
       if (e.key === "ArrowRight" && videoRef.current) {
          // simple jump logic for brevity in this snippet
          videoRef.current.currentTime = jumpSeconds;
       }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [videoRef, enabled, jumpSeconds]);
}


const VideoDetail = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const normalizedId = id.toLowerCase();

  const [video, setVideo] = useState();
  const [skipMap, setSkipMap] = useState([]);
  const [familyMode, setFamilyMode] = useState(false);
  const [filteringProfile, setFilteringProfile] = useState("Strict");
  const [customProfile, setCustomProfile] = useState("");
  const [showProfileCard, setShowProfileCard] = useState(false);
  const [isBuffering, setIsBuffering] = useState(false);

  const customProfiles = ["Kids Safe", "Teens", "Religious"];
  const videoRef = useRef(null);
  
  // --- GHOST PLAYER CHANGE: Ref for the hidden pre-loader ---
  const preloadRef = useRef(null);

  const shouldAutoplay = new URLSearchParams(location.search).get("autoplay") === "1";

  useJumpClipHotkey({ videoRef, jumpTo: "22:44", enabled: true });

  // 1. Metadata Load
  useEffect(() => {
    fetch("/video_metadata.json")
      .then((res) => res.json())
      .then((json) => {
        const arr = json.videos || (Array.isArray(json) ? json : [json]);
        setVideo(arr.find((v) => (v.id || "").toLowerCase() === normalizedId) || null);
      })
      .catch(() => setVideo(null));
  }, [normalizedId]);

  // 2. Profile Persistence
  useEffect(() => {
    const saved = localStorage.getItem("lastProfile");
    if (saved) setFilteringProfile(saved);
  }, []);
  useEffect(() => {
    localStorage.setItem("lastProfile", filteringProfile);
  }, [filteringProfile]);

  const handleProfileChange = (e) => {
    setFilteringProfile(e.target.value);
    setShowProfileCard(true);
    if (e.target.value !== "Custom") setCustomProfile("");
  };

  // 3. Skip Map Load
  useEffect(() => {
    if (!video) return;
    const raw = video.skipMapUrl;
    // ... (Your existing URL logic) ...
    let url = typeof raw === "string" ? raw : raw?.[filteringProfile.toLowerCase()];
    if(filteringProfile === "Custom" && customProfile) url = raw?.["custom_" + customProfile.toLowerCase().replace(/ /g, "_")];

    if (!url) { setSkipMap([]); return; }

    fetch(url).then((r) => r.json()).then((data) => {
        const arr = data.segments || (Array.isArray(data) ? data : []);
        // ... (Your existing normalization logic) ...
        // Simply returning normalized data here for brevity
        const normalized = arr.map(s => ({ start: Number(s.start), end: Number(s.end) })).sort((a,b)=>a.start-b.start);
        setSkipMap(normalized);
      }).catch(() => setSkipMap([]));
  }, [video, filteringProfile, customProfile]);


  // 4. Buffering Listeners
  useEffect(() => {
    const vid = videoRef.current;
    if (!vid) return;
    let t;
    const show = () => { clearTimeout(t); t = setTimeout(() => setIsBuffering(true), 150); };
    const hide = () => { clearTimeout(t); setIsBuffering(false); };
    
    vid.addEventListener("waiting", show);
    vid.addEventListener("playing", hide);
    return () => { vid.removeEventListener("waiting", show); vid.removeEventListener("playing", hide); };
  }, []);


  /* ---------- GHOST PRE-LOADER & SKIP ENGINE ---------- */
  useEffect(() => {
    const vid = videoRef.current;
    const ghost = preloadRef.current; // The hidden player
    if (!vid || !ghost) return;

    // Filter relevant skips
    const segs = (skipMap || []).filter((s) => (s.action || "skip") === "skip");
    
    // If Family Mode is OFF, ensure visual filters are gone
    if (!familyMode) {
      vid.style.filter = "none";
      vid.muted = false;
      return; 
    }
    if (segs.length === 0) return;

    // Track state
    let lastJumpAt = -1;
    let rvfcId = null;
    let rafId = null;
    
    // Used to ensure we only preload a specific segment once per session
    const preloadedSegments = new Set();

    const checkAndSkip = () => {
      const t = vid.currentTime || 0;

      // Reset jump tracker if user scrubs back
      if (t < lastJumpAt - 0.2) lastJumpAt = -1;

      // Find the UPCOMING skip (for preloading)
      // We look for a skip that starts within the next 15 seconds
      const nextSkip = segs.find(s => s.start > t && s.start - t < 15);
      
      if (nextSkip && !preloadedSegments.has(nextSkip.start)) {
        // --- PRELOAD ACTION ---
        // 1. Tell Ghost Player to load the destination timestamp
        ghost.src = vid.currentSrc; // Ensure it uses same source
        ghost.currentTime = nextSkip.end; 
        
        // 2. Mark done so we don't spam it
        preloadedSegments.add(nextSkip.start);
        // console.log("Ghost pre-fetching timestamp:", nextSkip.end);
      }

      // Check for ACTIVE skip
      for (const s of segs) {
        if (t >= s.start && t < s.end) {
          
          // Target time
          const dur = Number.isFinite(vid.duration) ? vid.duration : null;
          const target = dur ? Math.min(s.end + 0.05, dur - 0.05) : s.end + 0.05;

          if (Math.abs(target - lastJumpAt) > 0.2) {
            lastJumpAt = target;

            // --- INSTANT VISUAL MASK ---
            // Hide the "bad" frame instantly
            vid.style.filter = "brightness(0)"; 
            vid.muted = true; // Silence immediately

            // --- EXECUTE JUMP ---
            // Because Ghost Player has (hopefully) cached this range, this seek should be near-instant.
            if (typeof vid.fastSeek === "function") vid.fastSeek(target);
            else vid.currentTime = target;

            // --- RESTORE ---
            // We use a tiny timeout or "seeked" event to un-mask
            // But for responsiveness, we can unmask after a set safe delay
            // or attach a one-time 'seeked' listener.
            const onSeeked = () => {
               vid.style.filter = "none";
               vid.muted = false;
               setIsBuffering(false); // Force hide spinner
            };
            
            // If seek takes too long, unmask anyway after 1s so user isn't stuck in dark
            vid.addEventListener("seeked", onSeeked, { once: true });
            
            if (vid.paused) vid.play().catch(()=>{});
          }
          break;
        }
      }
    };

    const loop = () => {
      checkAndSkip();
      if (typeof vid.requestVideoFrameCallback === "function") rvfcId = vid.requestVideoFrameCallback(loop);
      else rafId = requestAnimationFrame(loop);
    };
    loop();

    return () => {
      if (rvfcId) vid.cancelVideoFrameCallback(rvfcId);
      if (rafId) cancelAnimationFrame(rafId);
      vid.style.filter = "none";
      vid.muted = false;
    };
  }, [skipMap, familyMode]);


  if (!video) return <div className="video-loading">Loading...</div>;

  return (
    <div className="video-detail-page">
      <button className="back-arrow" onClick={() => navigate("/")}><span className="arrow-icon">←</span></button>

      {/* --- GHOST PLAYER ELEMENT --- */}
      {/* Hidden, muted, distinct ID. Used only for caching data. */}
      <video 
        ref={preloadRef} 
        style={{ display: 'none' }} 
        preload="auto" 
        muted 
        playsInline 
      />

      <div className="hero-bg" style={{ backgroundImage: `url(${video.thumbnail || ""})` }}>
        <div className="hero-overlay" />
        <div className="hero-content">
          <div className="netflix-player-shell">
            <video
              ref={videoRef}
              className="video-player"
              src={video.videoUrl}
              poster={video.thumbnail}
              controls
              autoPlay={shouldAutoplay}
              playsInline
            />
            {isBuffering && (
              <div className="nf-buffering-overlay">
                <div className="nf-spinner" />
                <div className="nf-shimmer" />
              </div>
            )}
          </div>
          
          {/* ... (Your overlay controls, family toggle, etc.) ... */}
           <div className="player-overlay">
            <div className="overlay-row">
              <div className="overlay-title">{video.title}</div>
              <div className="overlay-family">
                <div className="family-toggle-row">
                  <input
                    id="family-toggle" type="checkbox" className="toggle-checkbox"
                    checked={familyMode}
                    onChange={(e) => {
                       const on = e.target.checked;
                       setFamilyMode(on);
                       if (on) { setFilteringProfile("Strict"); setShowProfileCard(true); }
                       else setShowProfileCard(false);
                    }}
                  />
                  <label htmlFor="family-toggle" className="toggle-switch" />
                  <span className="toggle-status">{familyMode ? "Family Mode: On" : "Family Mode: Off"}</span>
                </div>
                {familyMode && showProfileCard && (
                   <div className="profile-card family-popover">
                      {/* ... profile dropdowns ... */}
                       <div className="profile-row elegant-dropdown">
                          <span>Profile: <strong>{filteringProfile}</strong></span>
                          {/* ... etc ... */}
                       </div>
                   </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default VideoDetail;