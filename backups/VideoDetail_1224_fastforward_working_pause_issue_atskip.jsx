// VideoDetail.jsx
import React, { useEffect, useMemo, useRef, useState } from "react";
import { useParams, useNavigate, useLocation } from "react-router-dom";
import "./VideoDetail.css";

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
 * IMPORTANT: clip-end limiter REMOVED (no forced pause / clamp).
 */
export function useJumpClipHotkey({
  videoRef,
  jumpTo = "22:44",
  enabled = true,
  autoPlay = true,
  requireFocus = false,
}) {
  const clipStart = useMemo(() => toSeconds(jumpTo), [jumpTo]);

  useEffect(() => {
    if (!enabled) return;

    let v = null;
    let rafId = null;
    const cleanupFns = [];

    const doJump = () => {
      if (!v) return;
      if (typeof clipStart !== "number") return;

      // Ensure the video can receive keyboard focus
      if (document.activeElement !== v) {
        try {
          v.focus();
        } catch {}
      }

      const dur = v.duration;
      const start = Number.isFinite(dur)
        ? Math.min(clipStart, Math.max(0, dur - 0.2))
        : clipStart;

      v.currentTime = start;
      if (autoPlay) v.play().catch(() => {});
    };

    const attach = () => {
      v = videoRef?.current;

      if (!v) {
        rafId = requestAnimationFrame(attach);
        return;
      }

      const onLoadedMetadata = () => {
        // helpful so arrow key works immediately without clicking video
        try {
          v.focus();
        } catch {}
      };

      const onKeyDown = (e) => {
        const tag = (e.target?.tagName || "").toLowerCase();
        if (
          tag === "input" ||
          tag === "textarea" ||
          tag === "select" ||
          e.target?.isContentEditable
        )
          return;

        if (requireFocus && document.activeElement !== v) return;

        if (e.key === "ArrowRight") {
          e.preventDefault();

          // If metadata isn't ready yet, wait once, then jump.
          if (!Number.isFinite(v.duration) || v.readyState < 1) {
            v.addEventListener("loadedmetadata", doJump, { once: true });
            try {
              v.focus();
            } catch {}
            return;
          }

          doJump();
        }
      };

      v.addEventListener("loadedmetadata", onLoadedMetadata);
      window.addEventListener("keydown", onKeyDown, { passive: false });

      cleanupFns.push(() => v.removeEventListener("loadedmetadata", onLoadedMetadata));
      cleanupFns.push(() => window.removeEventListener("keydown", onKeyDown));
    };

    attach();

    return () => {
      if (rafId) cancelAnimationFrame(rafId);
      cleanupFns.forEach((fn) => fn());
    };
  }, [videoRef, enabled, clipStart, autoPlay, requireFocus]);
}

const VideoDetail = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const normalizedId = id.toLowerCase();

  const [video, setVideo] = useState();
  const [skipMap, setSkipMap] = useState([]);
  const [familyMode, setFamilyMode] = useState(false);
  const [filteringProfile, setFilteringProfile] = useState("Strict");
  const [customProfile, setCustomProfile] = useState("");
  const [showProfileCard, setShowProfileCard] = useState(false);

  const customProfiles = ["Kids Safe", "Teens", "Religious"];
  const videoRef = useRef(null);
  const location = useLocation();
  const shouldAutoplay =
    new URLSearchParams(location.search).get("autoplay") === "1";

  // Keep ArrowRight jump, but NO clip-end pause/limit anymore
  useJumpClipHotkey({
    videoRef,
    jumpTo: "22:44",
    enabled: true,
    autoPlay: true,
    requireFocus: false,
  });

  // Load metadata
  useEffect(() => {
    fetch("/video_metadata.json")
      .then((res) => res.json())
      .then((json) => {
        const arr = Array.isArray(json)
          ? json
          : json.videos && Array.isArray(json.videos)
          ? json.videos
          : [json];

        const found = arr.find((v) => v.id.toLowerCase() === normalizedId) || null;
        setVideo(found);
      })
      .catch(() => setVideo(null));
  }, [normalizedId]);

  // Remember last profile
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

  // Load skip map for selected profile
  useEffect(() => {
    if (!video) return;

    const raw = video.skipMapUrl;
    let url = null;

    if (typeof raw === "string") {
      url = raw;
    } else if (raw && typeof raw === "object") {
      if (filteringProfile === "Custom" && customProfile) {
        const key = "custom_" + customProfile.toLowerCase().replace(/ /g, "_");
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

        const dur = videoRef.current?.duration; // seconds (may be NaN until metadata loaded)

        const toSecSmart = (x) => {
          const n = Number(x);
          if (!Number.isFinite(n)) return null;

          // If duration is known: treat as ms only if way larger than duration
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
          );

        setSkipMap(normalized);
      })
      .catch(() => setSkipMap([]));
  }, [video, filteringProfile, customProfile]);

  // Skip logic (smooth + avoids repeated hammering)
  useEffect(() => {
    const vid = videoRef.current;
    if (!vid) return;

    const segs = (skipMap || [])
      .filter((s) => (s.action || "skip") === "skip")
      .sort((a, b) => a.start - b.start);

    if (!familyMode || segs.length === 0) return;

    let lastJumpAt = -1;
    const EPS_START = 0.12;
    const EPS_END = 0.04;

    const jumpIfNeeded = () => {
      if (!familyMode) return;
      const t = vid.currentTime || 0;

      // allow re-skip if user scrubs backward
      if (t < lastJumpAt - 0.2) lastJumpAt = -1;

      for (let s of segs) {
        if (t >= s.start - EPS_START && t < s.end - EPS_END) {
          const dur = Number.isFinite(vid.duration) ? vid.duration : null;
          const target = dur
            ? Math.min(s.end + 0.05, dur - 0.05)
            : s.end + 0.05;

          if (Math.abs(target - t) > 0.01) {
            if (typeof vid.fastSeek === "function") vid.fastSeek(target);
            else vid.currentTime = target;

            lastJumpAt = target;

            // keep playing if seek caused pause/waiting
            if (vid.paused) vid.play().catch(() => {});
          }
          break;
        }
      }
    };

    // No interval + no "seeking" listener (less churn)
    vid.addEventListener("seeked", jumpIfNeeded);
    vid.addEventListener("timeupdate", jumpIfNeeded);

    return () => {
      vid.removeEventListener("seeked", jumpIfNeeded);
      vid.removeEventListener("timeupdate", jumpIfNeeded);
    };
  }, [skipMap, familyMode]);

  // Auto-hide profile card after a few seconds
  useEffect(() => {
    if (!familyMode || !showProfileCard) return;

    const timer = setTimeout(() => {
      setShowProfileCard(false);
    }, 5000);

    return () => clearTimeout(timer);
  }, [familyMode, showProfileCard]);

  // Loading / error states
  if (video === undefined) {
    return <div className="video-loading">Loading...</div>;
  }
  if (!video) {
    return <div className="video-loading">Video not found.</div>;
  }

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
