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

  const customProfiles = ["Kids Safe", "Teens", "Religious"];
  const videoRef = useRef(null);

  const shouldAutoplay =
    new URLSearchParams(location.search).get("autoplay") === "1";

  /* ---------- Load Video Metadata ---------- */
  useEffect(() => {
    fetch("/video_metadata.json")
      .then((res) => res.json())
      .then((json) => {
        const arr = Array.isArray(json)
          ? json
          : json.videos && Array.isArray(json.videos)
          ? json.videos
          : [json];

        setVideo(arr.find((v) => v.id.toLowerCase() === normalizedId) || null);
      })
      .catch(() => setVideo(null));
  }, [normalizedId]);

  /* ---------- Load Skip Map ---------- */
  useEffect(() => {
    if (!video) return;

    const raw = video.skipMapUrl;
    let url = null;

    if (typeof raw === "string") url = raw;
    else if (raw && typeof raw === "object") {
      if (filteringProfile === "Custom" && customProfile) {
        const key = "custom_" + customProfile.toLowerCase().replace(/ /g, "_");
        url = raw[key];
      } else {
        url = raw[filteringProfile.toLowerCase()];
      }
    }

    if (!url) return setSkipMap([]);

    fetch(url)
      .then((r) => r.json())
      .then((data) => {
        const arr = Array.isArray(data)
          ? data
          : Array.isArray(data?.segments)
          ? data.segments
          : [];

        const toSec = (n) =>
          Number(n) > 100000 ? Number(n) / 1000 : Number(n);

        setSkipMap(
          arr
            .map((s) => ({
              start: toSec(s.start),
              end: toSec(s.end),
              action: s.action || "skip",
              label: s.label,
              source: s.source,
            }))
            .filter((s) => s.end > s.start)
        );
      })
      .catch(() => setSkipMap([]));
  }, [video, filteringProfile, customProfile]);

  /* ---------- Smart Skip Engine ---------- */
  useEffect(() => {
    const vid = videoRef.current;
    if (!vid || !familyMode || !skipMap.length) return;

    const segs = skipMap
      .filter((s) => s.action === "skip")
      .sort((a, b) => a.start - b.start);

    let lastJump = -1;

    const skip = () => {
      const t = vid.currentTime;
      for (const s of segs) {
        if (t >= s.start && t < s.end) {
          const target = s.end + 0.05;
          if (Math.abs(target - lastJump) > 0.2) {
            lastJump = target;
            vid.currentTime = target;
            if (vid.paused) vid.play().catch(() => {});
          }
          break;
        }
      }
    };

    vid.addEventListener("timeupdate", skip);
    vid.addEventListener("seeked", skip);
    return () => {
      vid.removeEventListener("timeupdate", skip);
      vid.removeEventListener("seeked", skip);
    };
  }, [skipMap, familyMode]);

  /* ---------- UI ---------- */
  if (!video) return <div className="video-loading">Loading...</div>;

  return (
    <div className="video-detail-page">
      <button className="back-arrow" onClick={() => navigate("/")}>←</button>

      <div className="hero-bg" style={{ backgroundImage: `url(${video.thumbnail})` }}>
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

          <div className="player-overlay">
            <div className="overlay-title">{video.title}</div>

            <div className="overlay-family">
              <input
                type="checkbox"
                checked={familyMode}
                onChange={(e) => setFamilyMode(e.target.checked)}
              />
              <span>Family Mode</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default VideoDetail;
