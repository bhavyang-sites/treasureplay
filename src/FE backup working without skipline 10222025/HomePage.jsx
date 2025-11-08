import React, { useEffect, useMemo, useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import './HomePage.css';

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
        <div className="brand">
          <span className="brand-mark">
          <span className="haze">Haze</span><span className="play">Play</span>
          </span>
          <span className="brand-sub">
            Experience <span style={{ color:"#00AEEF" }}>Safer Streaming</span>
          </span>
        </div>


        <nav className="hp-nav" aria-label="Primary">
          {NAV_ITEMS.map((label) => (
            <button key={label} className="nav-link" type="button">
              {label}
            </button>
          ))}
        </nav>

        <div className="right-ctls">
          <span className="fm-badge" role="note">
            <svg className="fm-icon" viewBox="0 0 24 24" aria-hidden="true">…</svg>
            Family Mode {familyMode ? 'On' : 'Available'}
          </span>

        </div>

      </header>

      {/* Hero */}
      {hero && (
        <section
          className="hero"
          style={{ backgroundImage: `url(${hero.backdrop || hero.thumbnail})` }}
        >
          <div className="hero-overlay">
            <h2 className="hero-title">{hero.title}</h2>
            {hero.tagline ? <p className="hero-tagline">{hero.tagline}</p> : null}
            <div className="hero-actions">
              <button className="btn btn-primary" onClick={() => onThumbActivate(hero.id)}>
                ▶ Play
              </button>
              <button className="btn btn-ghost" onClick={() => navigate('/about-smartskips')}>
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
          <button className="btn btn-outline" onClick={() => navigate('/demo-request')}>
            Get a live demo
          </button>
        </div>
      </footer>
    </div>
  );
};

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
