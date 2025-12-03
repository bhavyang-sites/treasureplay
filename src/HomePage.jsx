import React, { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import "./HomePage.css";
import { motion } from "framer-motion";

const NAV_ITEMS = ["Home", "Movies", "Shows", "Kids"];

const HomePage = () => {
  const [videoMetadata, setVideoMetadata] = useState([]);
  const [familyMode, setFamilyMode] = useState(
    () => JSON.parse(localStorage.getItem("familyMode") || "false")
  );

  const navigate = useNavigate();

  useEffect(() => {
    fetch("/video_metadata.json")
      .then((res) => res.json())
      .then((data) => setVideoMetadata(Array.isArray(data) ? data : []))
      .catch((err) =>
        console.error("Failed to load video metadata:", err)
      );
  }, []);

  useEffect(() => {
    localStorage.setItem("familyMode", JSON.stringify(familyMode));
  }, [familyMode]);

  const hero = useMemo(() => {
    if (!videoMetadata.length) return null;
    return videoMetadata.find((v) => v.featured) || videoMetadata[0];
  }, [videoMetadata]);

  const rows = useMemo(() => {
    if (!videoMetadata.length) return [];
    const hasCategory = videoMetadata.some((v) => v.category);
    if (!hasCategory) {
      return [{ title: "All Titles", items: videoMetadata }];
    }
    const map = new Map();
    for (const v of videoMetadata) {
      const key = v.category || "Other";
      if (!map.has(key)) map.set(key, []);
      map.get(key).push(v);
    }
    return Array.from(map.entries()).map(([title, items]) => ({
      title,
      items,
    }));
  }, [videoMetadata]);

  const onThumbActivate = (id) => navigate(`/video/${id}`);

  return (
    <div className="homepage-container">
      {/* HEADER (nav + family mode only) */}
      <header className="hp-header">
        <nav className="hp-nav" aria-label="Primary">
          {NAV_ITEMS.map((label) => (
            <button
              key={label}
              className={`nav-link ${
                label === "Home" ? "nav-link-active" : ""
              }`}
              type="button"
            >
              {label}
            </button>
          ))}
        </nav>

        <div className="right-ctls">
          <button
            type="button"
            className="fm-badge"
            onClick={() => setFamilyMode((prev) => !prev)}
          >
            <svg className="fm-icon" viewBox="0 0 24 24" aria-hidden="true">
              <circle
                cx="12"
                cy="12"
                r="10"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.6"
              />
              <path
                d="M8.5 12.5 11 15l4.5-6"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.6"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
            <span>{familyMode ? "Family Mode: On" : "Family Mode: Off"}</span>
          </button>
        </div>
      </header>

      <div className="hp-body">
        {/* SIDE RAIL with logo + icons */}
        <aside className="side-dock" aria-label="Secondary navigation">
          <div className="side-logo">
            <span className="side-logo-main">treasure</span>
            <span className="side-logo-sub">play</span>
          </div>

          <div className="side-dock-content">
            <button className="side-icon side-profile" aria-label="Profile">
              <span>👤</span>
            </button>

            <button
              className="side-icon"
              aria-label="Search"
              onClick={() => navigate("/search")}
            >
              <span>🔍</span>
            </button>

            <button
              className="side-icon"
              aria-label="Home"
              onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })}
            >
              <span>⌂</span>
            </button>

            <button
              className="side-icon"
              aria-label="SmartSkips info"
              onClick={() => navigate("/about-smartskips")}
            >
              <span>📺</span>
            </button>

            <div className="side-pill">FREE</div>

            <button className="side-icon side-lang" aria-label="Language">
              <span>अ</span>
            </button>
          </div>
        </aside>

        {/* MAIN CONTENT: hero + rows + footer */}
        <div className="hp-main">
          {hero && (
            <section
              className="hero"
              style={{
                backgroundImage: `url(${hero.backdrop || hero.thumbnail})`,
              }}
            >
              <div className="hero-gradient" />
              <div className="home-hero-overlay">
                <motion.h2
                  className="hero-title"
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.6, delay: 0.15 }}
                >
                  {hero.title}
                </motion.h2>

                {hero.tagline ? (
                  <p className="hero-tagline">{hero.tagline}</p>
                ) : null}

                <div className="hero-actions">
                  <button
                    className="btn btn-primary"
                    onClick={() => onThumbActivate(hero.id)}
                    type="button"
                  >
                    ▶ Play
                  </button>
                  <button
                    className="btn btn-ghost"
                    onClick={() => navigate("/about-smartskips")}
                    type="button"
                  >
                    What is SmartSkips?
                  </button>
                </div>
              </div>
            </section>
          )}

          <main className="rows">
            {rows.map((row) => (
              <ThumbRow
                key={row.title}
                title={row.title}
                items={row.items}
                familyMode={familyMode}
                onThumbActivate={onThumbActivate}
              />
            ))}
          </main>

          <footer className="hp-footer">
            <div className="cta">
              <span>Ready to try SmartSkips on your catalog?</span>
              <button
                className="btn btn-outline"
                onClick={() => navigate("/demo-request")}
                type="button"
              >
                Get a live demo
              </button>
            </div>
          </footer>
        </div>
      </div>
    </div>
  );
};

function ThumbRow({ title, items, familyMode, onThumbActivate }) {
  if (!items || !items.length) return null;

  return (
    <section className="row">
      <div className="row-header">
        <h3 className="row-title">{title}</h3>
      </div>
      <div className="thumbnail-row">
        {items.map((video) => (
          <article
            key={video.id}
            className="thumbnail-item"
            tabIndex={0}
            onClick={() => onThumbActivate(video.id)}
            onKeyDown={(e) => {
              if (e.key === "Enter" || e.key === " ") {
                e.preventDefault();
                onThumbActivate(video.id);
              }
            }}
          >
            <div className="thumbnail-wrapper">
              <img
                src={video.thumbnail}
                alt={video.title}
                className="thumbnail-image"
                loading="lazy"
              />
              {familyMode && <span className="fm-chip">FM</span>}
            </div>
            <p className="thumbnail-title">{video.title}</p>
          </article>
        ))}
      </div>
    </section>
  );
}

export default HomePage;
