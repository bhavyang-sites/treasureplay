// VideoDetail.jsx
import React, { useEffect, useMemo, useRef, useState } from "react";
import { useParams, useNavigate, useLocation } from "react-router-dom";
import "./VideoDetail.css";

/* ---------- helpers ---------- */
function toSeconds(ts) {
  if (typeof ts === "number") return ts;
  if (typeof ts !== "string") return null;

  const parts = ts.split(":").map((p) => p.trim());
  if (parts.some((p) => p === "" || isNaN(Number(p)))) return null;

  if (parts.length === 2) {
    const [m, s] = parts.map(Number);
    return m * 60 + s;
  }
  if (parts.length === 3) {
    const [h, m, s] = parts.map(Number);
    return h * 3600 + m * 60 + s;
  }
  return null;
}

/**
 * ArrowRight hotkey: jump to a time (e.g., "22:44") and optionally autoplay.
 * IMPORTANT: NO clip-end limiter (you wanted to manually stop/trim).
 */
export function useJumpClipHotkey({
  videoRef,
  jumpTo = "22:44",
  enabled = true,
  autoPlay = true,
  requireFocus = false,
}) {
  const jumpSeconds = useMemo(() => toSeconds(jumpTo), [jumpTo]);

  useEffect(() => {
    if (!enabled) return;

    const onKeyDown = (e) => {
      const tag = (e.target?.tagName || "").toLowerCase();
      if (
        tag === "input" ||
        tag === "textarea" ||
        tag === "select" ||
        e.target?.isContentEditable
      ) {
        return;
      }

      const vid = videoRef?.current;
      if (!vid) return;

      if (requireFocus && document.activeElement !== vid) return;

      if (e.key === "ArrowRight") {
        e.preventDefault();

        const doJump = () => {
          if (typeof jumpSeconds !== "number") return;

          const dur = Number.isFinite(vid.duration) ? vid.duration : null;
          const target = dur
            ? Math.min(jumpSeconds, Math.max(0, dur - 0.2))
            : jumpSeconds;

          try {
            vid.focus();
          } catch {}

          if (typeof vid.fastSeek === "function") vid.fastSeek(target);
          else vid.currentTime = target;

          if (autoPlay) vid.play().catch(() => {});
        };

        // If metadata isn't ready, wait once and jump.
        if (!Number.isFinite(vid.duration) || vid.readyState < 1) {
          vid.addEventListener("loadedmetadata", doJump, { once: true });
          try {
            vid.focus();
          } catch {}
          return;
        }

        doJump();
      }
    };

    window.addEventListener("keydown", onKeyDown, { passive: false });
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [videoRef, enabled, jumpSeconds, autoPlay, requireFocus]);
}

/* ---------- Main Component ---------- */
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

  // Netflix-style buffering overlay
  const [isBuffering, setIsBuffering] = useState(false);

  const customProfiles = ["Kids Safe", "Teens", "Religious"];
  const videoRef = useRef(null);

  const shouldAutoplay =
    new URLSearchParams(location.search).get("autoplay") === "1";

  // ArrowRight jump (NO clip end)
  useJumpClipHotkey({
    videoRef,
    jumpTo: "22:44",
    enabled: true,
    autoPlay: true,
    requireFocus: false,
  });

  /* ---------- Load metadata ---------- */
  useEffect(() => {
    fetch("/video_metadata.json")
      .then((res) => res.json())
      .then((json) => {
        const arr = Array.isArray(json)
          ? json
          : json.videos && Array.isArray(json.videos)
          ? json.videos
          : [json];

        const found =
          arr.find((v) => (v.id || "").toLowerCase() === normalizedId) || null;
        setVideo(found);
      })
      .catch(() => setVideo(null));
  }, [normalizedId]);

  /* ---------- Remember last profile ---------- */
  useEffect(() => {
    const saved = localStorage.getItem("lastProfile");
    if (saved) setFilteringProfile(saved);
  }, []);

  useEffect(() => {
    localStorage.setItem("lastProfile", filteringProfile);
  }, [filteringProfile]);

  const handleProfileChange = (e) => {
    const val = e.target.value;
    setFilteringProfile(val);
    setShowProfileCard(true);

    if (val !== "Custom") {
      setCustomProfile("");
    }
  };

  /* ---------- Load skip map for selected profile ---------- */
  useEffect(() => {
    if (!video) return;

    const raw = video.skipMapUrl;
    let url = null;

    if (typeof raw === "string") {
      url = raw;
    } else if (raw && typeof raw === "object") {
      if (filteringProfile === "Custom" && customProfile) {
        const key =
          "custom_" + customProfile.toLowerCase().replace(/ /g, "_");
        url = raw[key];
      } else {
        url = raw[filteringProfile.toLowerCase()];
      }
    }

    if (!url) {
      setSkipMap([]);
      return;
    }

    fetch(url)
      .then((r) => r.json())
      .then((data) => {
        const arr = Array.isArray(data)
          ? data
          : Array.isArray(data?.segments)
          ? data.segments
          : [];

        const dur = videoRef.current?.duration; // may be NaN until metadata is loaded

        // Smart ms-vs-seconds heuristic (does NOT break at >1000 seconds)
        const toSecSmart = (x) => {
          const n = Number(x);
          if (!Number.isFinite(n)) return null;

          // If duration is known, treat as ms only if it's way larger than duration
          if (Number.isFinite(dur) && dur > 0) {
            return n > dur * 10 ? n / 1000 : n;
          }

          // Fallback: treat as ms only if extremely large
          return n > 100000 ? n / 1000 : n;
        };

        const normalized = arr
          .map((s) => ({
            start: toSecSmart(s.start),
            end: toSecSmart(s.end),
            action: s.action || "skip",
            label: s.label,
            source: s.source,
          }))
          .filter(
            (s) =>
              Number.isFinite(s.start) &&
              Number.isFinite(s.end) &&
              s.end > s.start
          )
          .sort((a, b) => a.start - b.start);

        setSkipMap(normalized);
      })
      .catch(() => setSkipMap([]));
  }, [video, filteringProfile, customProfile]);

  /* ---------- Auto-resume after buffering ends ---------- */
  useEffect(() => {
    const vid = videoRef.current;
    if (!vid) return;

    const onCanPlay = () => {
      if (familyMode && vid.paused) vid.play().catch(() => {});
    };

    vid.addEventListener("canplay", onCanPlay);
    return () => vid.removeEventListener("canplay", onCanPlay);
  }, [familyMode]);

  /* ---------- Netflix-style buffering overlay (seek / wait / canplay) ---------- */
  useEffect(() => {
    const vid = videoRef.current;
    if (!vid) return;

    let t = null;

    const show = () => {
      // small delay prevents flicker on very short stalls
      clearTimeout(t);
      t = setTimeout(() => setIsBuffering(true), 120);
    };

    const hide = () => {
      clearTimeout(t);
      setIsBuffering(false);
    };

    vid.addEventListener("seeking", show);
    vid.addEventListener("waiting", show);
    vid.addEventListener("stalled", show);

    vid.addEventListener("canplay", hide);
    vid.addEventListener("playing", hide);
return () => {
      clearTimeout(t);
      vid.removeEventListener("seeking", show);
      vid.removeEventListener("waiting", show);
      vid.removeEventListener("stalled", show);
      vid.removeEventListener("canplay", hide);
      vid.removeEventListener("playing", hide);
};
  }, [video, familyMode]);



  /* ---------- Skip engine (ONLY ONE) ---------- */
/* ---------- Skip engine (Optimized + Visual Masking) ---------- */
useEffect(() => {
  const vid = videoRef.current;
  if (!vid) return;

  const segs = (skipMap || []).filter((s) => (s.action || "skip") === "skip");
  // If Family Mode is off, ensure we clean up any leftover filters
  if (!familyMode) {
    vid.style.filter = "none"; 
    vid.playbackRate = 1.0;
    return;
  }
  
  if (segs.length === 0) return;

  let lastJumpAt = -1;
  let rafId = null;
  let rvfcId = null;
  
  // Track if we are currently "masking" content
  let isMasking = false; 

  const checkAndSkip = () => {
    const t = vid.currentTime || 0;

    // Reset jump tracker if user scrubs backward manually
    if (t < lastJumpAt - 0.2) lastJumpAt = -1;

    // 1. EXIT STRATEGY: Check if we need to restore normal viewing
    if (isMasking) {
       // Are we still inside ANY skip segment?
       const insideAny = segs.some(s => t >= s.start && t < s.end);
       
       if (!insideAny) {
         // --- INSTANT RESTORE ---
         vid.style.filter = "none"; // Remove blur/blackout
         vid.muted = false;
         vid.playbackRate = 1.0;
         isMasking = false;
         setIsBuffering(false); // Hide spinner
       }
    }

    // 2. ENTRY STRATEGY: Check if we entered a skip zone
    for (const s of segs) {
      if (t >= s.start && t < s.end) {
        
        const skipDuration = s.end - t;

        // Strategy A: MICRO-SKIP (The "Blur-Through" Method)
        // Use this for short skips (< 5s) to avoid buffering latency
        if (skipDuration < 5.0) {
           if (!isMasking) {
             isMasking = true;
             
             // --- INSTANT CENSORSHIP ---
             // Option 1: Heavy Blur (Classy, like frosted glass)
             vid.style.filter = "blur(60px) brightness(0.5)";
             
             // Option 2: Total Blackout (Safest for strict filtering)
             // vid.style.filter = "brightness(0)"; 

             vid.muted = true;       // Silence audio
             vid.playbackRate = 16.0; // Fast forward
           }
           return; // Let the loop run; we are speeding through
        }

        // Strategy B: LONG SEEK (Standard Skip)
        // Use this for long scenes where 16x speed is still too slow
        const dur = Number.isFinite(vid.duration) ? vid.duration : null;
        const target = dur ? Math.min(s.end + 0.05, dur - 0.05) : s.end + 0.05;

        if (Math.abs(target - lastJumpAt) > 0.2) {
          lastJumpAt = target;
          
          // Show spinner
          setIsBuffering(true);
          
          // Mute briefly to prevent audio chirp during seek
          vid.muted = true;
          
          if (typeof vid.fastSeek === "function") vid.fastSeek(target);
          else vid.currentTime = target;

          // Unmute slightly delayed to ensure seek is done (handled by restore logic or simple timeout)
          setTimeout(() => { if(!isMasking) vid.muted = false; }, 300);

          if (vid.paused) vid.play().catch(() => {});
        }
        break;
      }
    }
  };

  const loop = () => {
    checkAndSkip();
    if (typeof vid.requestVideoFrameCallback === "function") {
      rvfcId = vid.requestVideoFrameCallback(loop);
    } else {
      rafId = requestAnimationFrame(loop);
    }
  };

  loop();

  return () => {
    // Safety cleanup on unmount
    if (vid) {
       vid.style.filter = "none";
       vid.playbackRate = 1.0;
       vid.muted = false;
    }
    if (rvfcId && typeof vid.cancelVideoFrameCallback === "function") {
      try { vid.cancelVideoFrameCallback(rvfcId); } catch {}
    }
    if (rafId) cancelAnimationFrame(rafId);
  };
}, [skipMap, familyMode]);

  /* ---------- Auto-hide profile card ---------- */
  useEffect(() => {
    if (!familyMode || !showProfileCard) return;

    const timer = setTimeout(() => setShowProfileCard(false), 5000);
    return () => clearTimeout(timer);
  }, [familyMode, showProfileCard]);

  /* ---------- Loading / error ---------- */
  if (video === undefined) return <div className="video-loading">Loading...</div>;
  if (!video) return <div className="video-loading">Video not found.</div>;

  return (
    <div className="video-detail-page">
      {/* Back arrow */}
      <button className="back-arrow" onClick={() => navigate("/")}>
        <span className="arrow-icon">←</span>
      </button>

      {/* Fullscreen-style hero */}
      <div
        className="hero-bg"
        style={{ backgroundImage: `url(${video.thumbnail || ""})` }}
      >
        <div className="hero-overlay" />

        <div className="hero-content">
          <div className="netflix-player-shell">
          <video
            ref={videoRef}
            className="video-player"
            src={video.videoUrl}
            poster={video.thumbnail}
            controls
            preload="auto"
            autoPlay={shouldAutoplay}
            playsInline
            tabIndex={0}
            onLoadedMetadata={(e) => e.currentTarget.focus()}
          />

          {isBuffering && (
            <div className="nf-buffering-overlay" aria-label="Buffering">
              <div className="nf-spinner" />
              <div className="nf-shimmer" />
            </div>
          )}
        </div>

          {/* SmartSkips bottom overlay bar */}
          <div className="player-overlay">
            <div className="overlay-row">
              {/* Centered movie-style title */}
              <div className="overlay-title">{video.title}</div>

              {/* Family Mode block on the right (UNCHANGED UI) */}
              <div className="overlay-family">
                <div className="family-toggle-row">
                  <input
                    id="family-toggle"
                    type="checkbox"
                    className="toggle-checkbox"
                    checked={familyMode}
                    onChange={(e) => {
                      const on = e.target.checked;
                      setFamilyMode(on);
                      if (on) {
                        setFilteringProfile("Strict");
                        setCustomProfile("");
                        setShowProfileCard(true);
                      } else {
                        setShowProfileCard(false);
                      }
                    }}
                  />
                  <label htmlFor="family-toggle" className="toggle-switch" />
                  <span className="toggle-status">
                    {familyMode ? "Family Mode: On" : "Family Mode: Off"}
                  </span>
                </div>

                {/* Popover card (conditional, auto-hides) */}
                {familyMode && showProfileCard && (
                  <div className="profile-card family-popover">
                    <div className="profile-row elegant-dropdown">
                      <span>
                        Active Profile: <strong>{filteringProfile}</strong>
                      </span>
                      <select
                        className="select-elegant"
                        value={filteringProfile}
                        onChange={handleProfileChange}
                      >
                        <option value="Mild">Mild</option>
                        <option value="Strict">Strict</option>
                        <option value="Custom">Custom</option>
                      </select>
                    </div>

                    {filteringProfile === "Custom" && (
                      <div className="profile-row elegant-dropdown">
                        <select
                          className="select-elegant"
                          value={customProfile}
                          onChange={(e) => {
                            setCustomProfile(e.target.value);
                            setShowProfileCard(true);
                          }}
                        >
                          <option value="">Select sub-profile…</option>
                          {customProfiles.map((p) => (
                            <option key={p} value={p}>
                              {p}
                            </option>
                          ))}
                        </select>
                      </div>
                    )}

                    {skipMap && skipMap.length > 0 && (
                      <p className="profile-skips">Skips: {skipMap.length}</p>
                    )}

                    <p className="profile-desc">
                      {filteringProfile === "Mild" &&
                        "Blocks only explicit content. Ideal for general audiences."}
                      {filteringProfile === "Strict" &&
                        "Strictly filters nudity, suggestive content, and violence. Best for young kids."}
                      {filteringProfile === "Custom" &&
                        (customProfile
                          ? `Custom settings applied: ${customProfile}`
                          : "Please select a custom profile to apply.")}
                    </p>
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
