import React, { useEffect, useMemo, useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import './HomePage.css';
import { motion } from "framer-motion";
import FunkyLogo from "./components/FunkyLogo";


const NAV_ITEMS = ['Home', 'Movies', 'Shows', 'Kids'];

const HomePage = () => {
  const [videoMetadata, setVideoMetadata] = useState([]);
  const [familyMode, setFamilyMode] = useState(
    () => JSON.parse(localStorage.getItem('familyMode') || 'false')
  );

  const navigate = useNavigate();

  useEffect(() => {
    fetch('/video_metadata.json')
      .then((res) => res.json())
      .then((data) => setVideoMetadata(Array.isArray(data) ? data : []))
      .catch((err) => console.error('Failed to load video metadata:', err));
  }, []);

  useEffect(() => {
    localStorage.setItem('familyMode', JSON.stringify(familyMode));
  }, [familyMode]);

  // hero: prefer featured
  const hero = useMemo(() => {
    if (!videoMetadata.length) return null;
    return videoMetadata.find((v) => v.featured) || videoMetadata[0];
  }, [videoMetadata]);

  // rows: by category, fallback to All Titles
  const rows = useMemo(() => {
    if (!videoMetadata.length) return [];
    const hasCategory = videoMetadata.some((v) => v.category);
    if (!hasCategory) {
      return [{ title: 'All Titles', items: videoMetadata }];
    }
    const map = new Map();
    for (const v of videoMetadata) {
      const key = v.category || 'Other';
      if (!map.has(key)) map.set(key, []);
      map.get(key).push(v);
    }
    return Array.from(map.entries()).map(([title, items]) => ({ title, items }));
  }, [videoMetadata]);

  const onThumbActivate = (id) => navigate(`/video/${id}`);

  return (
    <div className="homepage-container">
      {/* Header / Nav */}
      <header className="hp-header">
        {/* Brand block (hoichoi-style, lowercase) */}
        <div className="brand">
          <div className="brand-mark">
            <span className="tp-primary">treasure</span>
            <span className="tp-secondary">play</span>
          </div>
          {/* <div className="brand-sub tagline">
            <span className="tag-soft">Smooth.</span>
            <span className="tag-soft">Smart.</span>
            <span className="tag-soft">Streaming.</span>
          </div> */}
        </div>

        {/* Center nav */}
        <nav className="hp-nav" aria-label="Primary">
          {NAV_ITEMS.map((label) => (
            <button key={label} className="nav-link" type="button">
              {label}
            </button>
          ))}
        </nav>

        {/* Right badge */}
        <div className="right-ctls">
          <span className="fm-badge" role="note">
            <svg className="fm-icon" viewBox="0 0 24 24" aria-hidden="true">
              <circle cx="12" cy="12" r="10" fill="none" stroke="currentColor" strokeWidth="1.6" />
              <path
                d="M8.5 12.5 11 15l4.5-6"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.6"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
            Family Mode {familyMode ? 'On' : 'Available'}
          </span>
        </div>
      </header>

      {/* Body: left dock + main content */}
      <div className="hp-body">
        {/* Hoichoi-like side strip */}
     {/* Left side dock */}
<aside className="side-dock" aria-label="Secondary navigation">
  <div className="side-dock-content">
    <button className="side-icon side-profile" aria-label="Profile">
      <span>👤</span>
    </button>

    <button className="side-icon" aria-label="Search">
      <span>🔍</span>
    </button>

    <button className="side-icon" aria-label="Home">
      <span>⌂</span>
    </button>

    <button className="side-icon" aria-label="TV">
      <span>📺</span>
    </button>

    <div className="side-pill">FREE</div>

    <button className="side-icon side-lang" aria-label="Language">
      <span>अ</span>
    </button>
  </div>
</aside>



        {/* Main column: hero + rows + footer */}
        <div className="hp-main">
          {/* Hero */}
          {hero && (
            <section
              className="hero"
              style={{ backgroundImage: `url(${hero.backdrop || hero.thumbnail})` }}
            >
              <div className="home-hero-overlay">
                <motion.h2
                  className="hero-title"
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.6, delay: 0.15 }}
                >
                  {hero.title}
                </motion.h2>

                {hero.tagline ? <p className="hero-tagline">{hero.tagline}</p> : null}

                <div className="hero-actions">
                  <button
                    className="btn btn-primary"
                    onClick={() => onThumbActivate(hero.id)}
                  >
                    ▶ Play
                  </button>
                  <button
                    className="btn btn-ghost"
                    onClick={() => navigate('/about-smartskips')}
                  >
                    What is SmartSkips?
                  </button>
                </div>
              </div>
            </section>
          )}

          {/* Rows */}
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

          {/* Footer CTA */}
          <footer className="hp-footer">
            <div className="cta">
              <span>Ready to try a pilot?</span>
              <button
                className="btn btn-outline"
                onClick={() => navigate('/demo-request')}
              >
                Get a live demo
              </button>
            </div>
          </footer>
        </div>
      </div>
    </div>
  );
}


/* --- helper row with arrows + smooth scroll --- */
function ThumbRow({ title, items, familyMode, onThumbActivate }) {
  return (
    <section className="row">
      <h3 className="row-title">{title}</h3>
      <div className="thumbnail-row">  {/* <- same class as your old working build */}
        {items.map((video) => (
          <article
            key={video.id}
            className="thumbnail-item"
            tabIndex={0}
            onClick={() => onThumbActivate(video.id)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onThumbActivate(video.id); }
            }}
          >
            <img src={video.thumbnail} alt={video.title} className="thumbnail-image" loading="lazy" />
            {familyMode && <span className="fm-chip">FM</span>}
            <p className="thumbnail-title">{video.title}</p>
          </article>
        ))}
      </div>
    </section>
  );
}

export default HomePage;
