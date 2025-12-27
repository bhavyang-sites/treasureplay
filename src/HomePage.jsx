import React, { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import "./HomePage.css";
import { motion } from "framer-motion";

const SIDE_ITEMS = [
  { key: "my", label: "My TreasurePlay", icon: "👤", type: "scrollTop" },
  { key: "search", label: "Search", icon: "🔍", type: "route", to: "/search" },
  { key: "home", label: "Home", icon: "⌂", type: "scrollTop" },
  { key: "movies", label: "Movies", icon: "🎬", type: "noop" },
  { key: "shows", label: "Shows", icon: "📺", type: "route", to: "/about-smartskips" },
  { key: "free", label: "Free", icon: null, type: "noop" },
  { key: "lang", label: "Hindi", icon: "अ", type: "noop" },
];

const HomePage = () => {
  const [videoMetadata, setVideoMetadata] = useState([]);
  const [heroIndex, setHeroIndex] = useState(0);
  const navigate = useNavigate();
  const [showSmartSkipsInfo, setShowSmartSkipsInfo] = useState(false);

  // Load metadata
  useEffect(() => {
    fetch("/video_metadata.json")
      .then((res) => res.json())
      .then((data) => setVideoMetadata(Array.isArray(data) ? data : []))
      .catch((err) => console.error("Failed to load video metadata:", err));
  }, []);

  // 1️⃣ HERO LIST — all items marked as hero (or featured). fallback to first item.
  const heroItems = useMemo(() => {
    if (!videoMetadata.length) return [];

    const heroRail = videoMetadata.filter(
      (v) => v.rail === "hero" || v.featured === true
    );

    return heroRail.length ? heroRail : [videoMetadata[0]];
  }, [videoMetadata]);

  // Hero slideshow timer
  useEffect(() => {
    if (!heroItems.length) return;

    setHeroIndex(0); // reset when hero list changes

    const t = setInterval(() => {
      setHeroIndex((i) => (i + 1) % heroItems.length);
    }, 6000);

    return () => clearInterval(t);
  }, [heroItems]);

  const heroItem = heroItems.length ? heroItems[heroIndex] : null;

  // 2️⃣ TOP PICKS — vertical posters row
  const topPicks = useMemo(
    () => videoMetadata.filter((v) => v.rail === "top-picks"),
    [videoMetadata]
  );

  // 3️⃣ OTT Row (formerly "smartskips") — vertical posters row
  // NOTE: Make sure your metadata rail string matches EXACTLY (including curly apostrophe if you keep it).
  const safeChoice = useMemo(
    () => videoMetadata.filter((v) => v.rail === "safeChoice"),
    [videoMetadata]
  );

  // 4️⃣ GENRE SHELVES — square posters grouped by genre/category
  const genreRows = useMemo(() => {
    const genreItems = videoMetadata.filter((v) => v.rail === "genre");
    if (!genreItems.length) return [];

    const map = new Map();
    for (const v of genreItems) {
      const key = v.genre || v.category || "More Stories";
      if (!map.has(key)) map.set(key, []);
      map.get(key).push(v);
    }

    return Array.from(map.entries()).map(([title, items]) => ({
      title,
      items,
    }));
  }, [videoMetadata]);

  // 5️⃣ EXTRA ROW — leftover / bonus square posters
  const extraRow = useMemo(
    () => videoMetadata.filter((v) => v.rail === "extra"),
    [videoMetadata]
  );

  const onThumbActivate = (id) => navigate(`/video/${id}`);

  const handleSideClick = (item) => {
    if (item.type === "route" && item.to) {
      navigate(item.to);
    } else if (item.type === "scrollTop") {
      window.scrollTo({ top: 0, behavior: "smooth" });
    }
  };

  return (
    <div className="homepage-container">
      {/* SIDE RAIL WITH TREASUREPLAY LOGO */}
      <aside className="side-rail" aria-label="Main navigation">
        <div className="side-rail-inner">
          <button
            className="side-logo"
            type="button"
            onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })}
          >
            <div className="side-logo-top">
              <span className="side-logo-t">t</span>
              <span className="side-logo-reasure">reasure</span>
            </div>

            <div className="side-logo-play-pill">
              <span className="side-logo-play-text">play</span>
            </div>
          </button>

          {/* Nav icons + labels */}
          <nav className="side-nav">
            {SIDE_ITEMS.map((item) => (
              <button
                key={item.key}
                type="button"
                className={`side-nav-item side-nav-item-${item.key}`}
                onClick={() => handleSideClick(item)}
              >
                <div className="side-nav-icon-wrap">
                  {item.icon ? (
                    <span className="side-nav-icon">{item.icon}</span>
                  ) : (
                    <span className="side-nav-pill">Free</span>
                  )}
                </div>
                <span className="side-nav-label">{item.label}</span>
              </button>
            ))}
          </nav>
        </div>
      </aside>

      {/* MAIN CONTENT: HERO + RAILS + FOOTER */}
      <main className="hp-main">
        {heroItem && (
          <section
            className="hero"
            style={{
              backgroundImage: `url(${
                heroItem.backdrop || heroItem.heroImage || heroItem.thumbnail
              })`,
            }}
          >
            <div className="home-hero-overlay">
              <motion.h2
                className="hero-title"
                key={heroItem.id} // helps re-animate on slide
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.45 }}
              >
                {heroItem.title}
              </motion.h2>

              {heroItem.tagline ? (
                <p className="hero-tagline">{heroItem.tagline}</p>
              ) : null}

<div className="hero-cta-row">
  <button
    className="cta-pill cta-play"
    type="button"
    onClick={() => navigate(`/video/${heroItem.id}?autoplay=1`)}
  >
    <span className="cta-icon">▶</span>
    <span>Play</span>
  </button>

  <button
    className="cta-pill cta-family"
    type="button"
    onClick={() => navigate(`/video/${heroItem.id}?autoplay=1&family=1`)}
  >
    <span className="cta-icon">🛡️</span>
    <span>Family Mode</span>
  </button>
</div>



{showSmartSkipsInfo && (
  <motion.div
    id="smartskips-popover"
    className="smartskips-popover"
    initial={{ opacity: 0, y: 15, scale: 0.96 }}
    animate={{ opacity: 1, y: 0, scale: 1 }}
    exit={{ opacity: 0, y: 15, scale: 0.96 }}
    transition={{ type: "spring", stiffness: 300, damping: 25 }}
  >
    <div className="smartskips-popover-head">
      <div className="smartskips-header-content">
        <span className="smartskips-badge">NEW FEATURE</span>
        <h3 className="smartskips-popover-title">SmartSkips Family Mode</h3>
      </div>
      <button
        type="button"
        className="smartskips-popover-close"
        onClick={() => setShowSmartSkipsInfo(false)}
        aria-label="Close"
      >
        <span className="close-icon">✕</span>
      </button>
    </div>

    <div className="smartskips-body">
      <p className="smartskips-intro">
        Filter content in real-time without disrupting your pipeline.
      </p>
      
      <ul className="smartskips-feature-list">
        <li className="feature-item">
          <span className="feature-icon">🛡️</span>
          <div className="feature-text">
            <strong>Scene-Level Filtering</strong>
            <span>Seamlessly skips adult content using AI-generated skip maps.</span>
          </div>
        </li>
        <li className="feature-item">
          <span className="feature-icon">⚡</span>
          <div className="feature-text">
            <strong>Zero Latency</strong>
            <span>Plugs directly into your existing CDN & DRM workflow.</span>
          </div>
        </li>
        <li className="feature-item">
          <span className="feature-icon">🎛️</span>
          <div className="feature-text">
            <strong>Custom Profiles</strong>
            <span>Viewers choose between Mild, Strict, or Custom filtering.</span>
          </div>
        </li>
      </ul>
    </div>

    <div className="smartskips-popover-actions">
      <button
        className="btn btn-primary btn-wide"
        type="button"
        onClick={() => navigate(`/video/${heroItem.id}?autoplay=1`)}
      >
        <span>▶ Demo Experience</span>
      </button>
      
      <button
        className="btn btn-ghost"
        type="button"
        onClick={() => setShowSmartSkipsInfo(false)}
      >
        Maybe Later
      </button>
    </div>
  </motion.div>
)}

            </div>
          </section>
        )}

        <section className="rows">
          {/* 2️⃣ Top Picks — vertical */}
          {topPicks.length > 0 && (
            <ThumbRow
              title="Top Picks for You"
              items={topPicks}
              variant="vertical"
              onThumbActivate={onThumbActivate}
            />
          )}

          {/* 3️⃣ Editor’s Safe Choice — vertical */}
          {safeChoice.length > 0 && (
            <ThumbRow
              title="Editor’s Safe Choice"
              items={safeChoice}
              variant="vertical"
              onThumbActivate={onThumbActivate}
            />
          )}

          {/* 4️⃣ Genre shelves — square */}
          {genreRows.map((row) => (
            <ThumbRow
              key={row.title}
              title={row.title}
              items={row.items}
              variant="square"
              onThumbActivate={onThumbActivate}
            />
          ))}

          {/* 5️⃣ Extra row — square */}
          {extraRow.length > 0 && (
            <ThumbRow
              title="Recommended for You"
              items={extraRow}
              variant="square"
              onThumbActivate={onThumbActivate}
            />
          )}
        </section>

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
      </main>
    </div>
  );
};

function ThumbRow({ title, items, onThumbActivate, variant = "landscape" }) {
  if (!items || !items.length) return null;

  const rowClassName = `thumbnail-row thumbnail-row-${variant}`;
  const imageClassName = `thumbnail-image thumbnail-image-${variant}`;

  return (
    <section className="row">
      <div className="row-header">
        <h3 className="row-title">{title}</h3>
      </div>
      <div className={rowClassName}>
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
                className={imageClassName}
                loading="lazy"
              />
            </div>
            <p className="thumbnail-title">{video.title}</p>
          </article>
        ))}
      </div>
    </section>
  );
}

export default HomePage;
