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
  const [bufferPct, setBufferPct] = useState(0);
  const [skipFading, setSkipFading] = useState(false);
  const bufferTimerRef = useRef(null);
  const bufferStartRef = useRef(0);
  const bufferMinHoldRef = useRef(0);


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

    let tShow = null;

    const startUI = () => {
      clearTimeout(tShow);
      tShow = setTimeout(() => {
        bufferMinHoldRef.current = Date.now() + 250;
        setIsBuffering(true);
        setBufferPct((p) => (p > 0 ? p : 18));
      }, 80);
    };

    const finishUI = () => {
      clearTimeout(tShow);
      const remaining = bufferMinHoldRef.current - Date.now();

      const doFinish = () => {
        if (vid.readyState >= 3) {
          clearInterval(bufferTimerRef.current);
          setBufferPct(100);
          setTimeout(() => {
            setIsBuffering(false);
            setSkipFading(false);
            setBufferPct(0);
          }, 160);
        }
      };

      if (remaining > 0) setTimeout(doFinish, remaining);
      else doFinish();
    };

    vid.addEventListener("seeking", startUI);
    vid.addEventListener("waiting", startUI);
    vid.addEventListener("stalled", startUI);
    vid.addEventListener("loadstart", startUI);

    vid.addEventListener("playing", finishUI);
    vid.addEventListener("canplay", finishUI);
    vid.addEventListener("canplaythrough", finishUI);

    return () => {
      clearTimeout(tShow);
      vid.removeEventListener("seeking", startUI);
      vid.removeEventListener("waiting", startUI);
      vid.removeEventListener("stalled", startUI);
      vid.removeEventListener("loadstart", startUI);

      vid.removeEventListener("playing", finishUI);
      vid.removeEventListener("canplay", finishUI);
      vid.removeEventListener("canplaythrough", finishUI);
    };
  }, [video, familyMode]);
/* ---------- Skip engine (ONLY ONE) ---------- */
  useEffect(() => {
    const vid = videoRef.current;
    if (!vid) return;

    const segs = (skipMap || []).filter(
      (s) => (s.action || "skip") === "skip"
    );
    if (!familyMode || segs.length === 0) return;

    let lastJumpAt = -1;
    let rafId = null;
    let rvfcId = null;

    const checkAndSkip = () => {
      const t = vid.currentTime || 0;

      // allow re-skip if user scrubs backward
      if (t < lastJumpAt - 0.2) lastJumpAt = -1;

      for (const s of segs) {
        if (t >= s.start && t < s.end) {
          const dur = Number.isFinite(vid.duration) ? vid.duration : null;
          const target = dur
            ? Math.min(s.end + 0.05, dur - 0.05)
            : s.end + 0.05;

          // prevent hammering repeated seeks
          if (Math.abs(target - lastJumpAt) > 0.2) {
            lastJumpAt = target;


            // Option A+B: start fade + progress overlay immediately
            startSkipTransition();
            if (typeof vid.fastSeek === "function") vid.fastSeek(target);
            else vid.currentTime = target;

            // try to resume immediately (may still buffer)
            if (vid.paused) vid.play().catch(() => {});
          }
          break;
        }
      }
    };

    
    const onTimeUpdate = () => {
      // Backup path in case frame callbacks are throttled
      checkAndSkip();
    };

    vid.addEventListener("timeupdate", onTimeUpdate);

const loop = () => {
      checkAndSkip();

      // requestVideoFrameCallback won't fire while paused (or during some buffering),
      // so fall back to requestAnimationFrame in those cases to keep skip logic alive.
      const canUseRvfc =
        typeof vid.requestVideoFrameCallback === "function" &&
        !vid.paused &&
        vid.readyState >= 2; // HAVE_CURRENT_DATA

      if (canUseRvfc) {
        rvfcId = vid.requestVideoFrameCallback(loop);
      } else {
        rafId = requestAnimationFrame(loop);
      }
    };

    loop();

    return () => {
      // cancel what we can; if cancelVideoFrameCallback isn't present, it stops naturally after unmount
      if (rvfcId && typeof vid.cancelVideoFrameCallback === "function") {
        try {
          vid.cancelVideoFrameCallback(rvfcId);
        } catch {}
      }
      vid.removeEventListener("timeupdate", onTimeUpdate);
      if (rafId) cancelAnimationFrame(rafId);
    };
  }, [skipMap, familyMode]);

  // Cleanup timers
  useEffect(() => {
    return () => {
      clearInterval(bufferTimerRef.current);
    };
  }, []);

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

          {skipFading && <div className="nf-fade-layer" />}
          {isBuffering && (
            <div className="nf-skip-overlay" aria-label="Skipping">
              <div className="nf-skip-title">Skipping…</div>
              <div className="nf-progress">
                <div
                  className="nf-progress-bar"
                  style={{ width: `${bufferPct}%` }}
                />
              </div>
              <div className="nf-pct">{bufferPct}%</div>
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
