// HomePage.jsx
import React, { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import "./HomePage.css";
import { motion } from "framer-motion";

const NAV_ITEMS = ["Home", "Series", "Movies", "Free", "SmartSkips"];

const HomePage = () => {
  const [videoMetadata, setVideoMetadata] = useState([]);
  const [familyMode, setFamilyMode] = useState(
    () => JSON.parse(localStorage.getItem("familyMode") || "false")
  );

  const navigate = useNavigate();

  // Load metadata
  useEffect(() => {
    fetch("/video_metadata.json")
      .then((res) => res.json())
      .then((data) => setVideoMetadata(Array.isArray(data) ? data : []))
      .catch((err) => console.error("Failed to load video metadata:", err));
  }, []);

  // Persist Family Mode
  useEffect(() => {
    localStorage.setItem("familyMode", JSON.stringify(familyMode));
  }, [familyMode]);

  // Hero selection – prefer "featured"
  const hero = useMemo(() => {
    if (!videoMetadata.length) return null;
    return videoMetadata.find((v) => v.featured) || videoMetadata[0];
  }, [videoMetadata]);

  // Build rows similar to categories on an OTT home
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

    // Order doesn’t matter much but feels nicer if sorted
    return Array.from(map.entries())
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([title, items]) => ({ title, items }));
  }, [videoMetadata]);

  const onThumbActivate = (id) => navigate(`/video/${id}`);

  return (
    <div className="homepage-container">
      {/* ============ TOP NAV BAR (Hoichoi-like) ============ */}
      <header className="hp-header">
        {/* Logo / brand – left */}
        <div className="hp-logo">
          <span className="hp-logo-main">treasure</span>
          <span className="hp-logo-sub">play</span>
        </div>

        {/* Center nav items */}
        <nav className="hp-nav" aria-label="Main">
          {NAV_ITEMS.map((label) => (
            <button
              key={label}
              className={`hp-nav-item ${
                label === "Home" ? "hp-nav-item-active" : ""
              }`}
              type="button"
              onClick={() => {
                if (label === "SmartSkips") {
                  navigate("/about-smartskips");
                } else {
                  window.scrollTo({ top: 0, behavior: "smooth" });
                }
              }}
            >
              {label}
            </button>
          ))}
        </nav>

        {/* Right section: search, profile, Family Mode */}
        <div className="hp-right">
          <button
            type="button"
            className="icon-btn"
            aria-label="Search"
            onClick={() => navigate("/search")}
          >
            <span>🔍</span>
          </button>
          <button
            type="button"
            className="hp-login"
            onClick={() => navigate("/demo-request")}
          >
            Log in
          </button>
          <button
            type="button"
            className="fm-toggle"
            onClick={() => setFamilyMode((prev) => !prev)}
          >
            <span className={`fm-dot ${familyMode ? "fm-dot-on" : ""}`} />
            <span className="fm-label">
              {familyMode ? "Family Mode: On" : "Family Mode: Off"}
            </span>
          </button>
        </div>
      </header>

      {/* ============ FLOATING LEFT RAIL (Hoichoi-style) ============ */}
      <aside className="hp-rail" aria-label="Quick actions">
        <button className="rail-icon rail-icon-primary" aria-label="Profile">
          <span>👤</span>
        </button>

        <button
          className="rail-icon"
          aria-label="Go to top"
          onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })}
        >
          <span>⌂</span>
        </button>

        <button
          className="rail-icon"
          aria-label="SmartSkips"
          onClick={() => navigate("/about-smartskips")}
        >
          <span>📺</span>
        </button>

        <div className="rail-pill">FREE</div>

        <button className="rail-icon rail-icon-lang" aria-label="Language">
          <span>অ</span>
        </button>
      </aside>

      {/* ============ MAIN CONTENT ============ */}
      <main className="hp-main">
        {/* HERO section – full-bleed banner like Hoichoi */}
        {hero && (
          <section
            className="hp-hero"
            style={{
              backgroundImage: `url(${hero.backdrop || hero.thumbnail})`,
            }}
          >
            <div className="hp-hero-overlay" />
            <div className="hp-hero-content">
              <motion.h1
                className="hp-hero-title"
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6 }}
              >
                {hero.title}
              </motion.h1>

              {hero.tagline && (
                <p className="hp-hero-tagline">{hero.tagline}</p>
              )}

              <div className="hp-hero-actions">
                <button
                  className="btn btn-primary"
                  onClick={() => onThumbActivate(hero.id)}
                  type="button"
                >
                  ▶ Watch Now
                </button>
                <button
                  className="btn btn-secondary"
                  type="button"
                  onClick={() => navigate("/about-smartskips")}
                >
                  What is SmartSkips?
                </button>
              </div>
            </div>
          </section>
        )}

        {/* ROWS – horizontal carousels */}
        <section className="hp-rows">
          {rows.map((row) => (
            <ThumbRow
              key={row.title}
              title={row.title}
              items={row.items}
              familyMode={familyMode}
              onThumbActivate={onThumbActivate}
            />
          ))}
        </section>

        {/* Simple footer CTA */}
        <footer className="hp-footer">
          <div className="hp-footer-strip">
            <span>Want this experience on your OTT platform?</span>
            <button
              className="btn btn-outline"
              type="button"
              onClick={() => navigate("/demo-request")}
            >
              Book a live demo
            </button>
          </div>
        </footer>
      </main>
    </div>
  );
};

function ThumbRow({ title, items, familyMode, onThumbActivate }) {
  if (!items || !items.length) return null;

  return (
    <section className="hp-row">
      <div className="hp-row-head">
        <h2 className="hp-row-title">{title}</h2>
      </div>
      <div className="hp-row-strip">
        {items.map((video) => (
          <article
            key={video.id}
            className="hp-card"
            tabIndex={0}
            onClick={() => onThumbActivate(video.id)}
            onKeyDown={(e) => {
              if (e.key === "Enter" || e.key === " ") {
                e.preventDefault();
                onThumbActivate(video.id);
              }
            }}
          >
            <div className="hp-card-thumb-wrap">
              <img
                src={video.thumbnail}
                alt={video.title}
                className="hp-card-thumb"
                loading="lazy"
              />
              {familyMode && <span className="hp-fm-chip">FM</span>}
            </div>
            <p className="hp-card-title">{video.title}</p>
          </article>
        ))}
      </div>
    </section>
  );
}

export default HomePage;
