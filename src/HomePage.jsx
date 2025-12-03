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
  const navigate = useNavigate();

  useEffect(() => {
    fetch("/video_metadata.json")
      .then((res) => res.json())
      .then((data) => setVideoMetadata(Array.isArray(data) ? data : []))
      .catch((err) => console.error("Failed to load video metadata:", err));
  }, []);

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

  const handleSideClick = (item) => {
    if (item.type === "route" && item.to) {
      navigate(item.to);
    } else if (item.type === "scrollTop") {
      window.scrollTo({ top: 0, behavior: "smooth" });
    }
  };

  return (
    <div className="homepage-container">
      {/* HOICHOI-STYLE SIDE RAIL WITH TREASUREPLAY LOGO */}
      <aside className="side-rail" aria-label="Main navigation">
        <div className="side-rail-inner">
          {/* Stylized logo: tall "t" + reasure / play */}
          <button
            className="side-logo"
            type="button"
            onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })}
          >
            <span className="side-logo-t">t</span>
            <span className="side-logo-block">
              <span className="side-logo-reasure">reasure</span>
              <span className="side-logo-play">play</span>
            </span>
          </button>

          <button
            className="side-subscribe"
            type="button"
            onClick={() => navigate("/demo-request")}
          >
            Demo
          </button>

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

      {/* MAIN CONTENT: FULL-BLEED HERO + ROWS + FOOTER */}
      <main className="hp-main">
        {hero && (
          <section
            className="hero"
            style={{
              backgroundImage: `url(${hero.backdrop || hero.thumbnail})`,
            }}
          >
            {/* No dimming overlay – pure bright image */}
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

        <section className="rows">
          {rows.map((row) => (
            <ThumbRow
              key={row.title}
              title={row.title}
              items={row.items}
              onThumbActivate={onThumbActivate}
            />
          ))}
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

function ThumbRow({ title, items, onThumbActivate }) {
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
            </div>
            <p className="thumbnail-title">{video.title}</p>
          </article>
        ))}
      </div>
    </section>
  );
}

export default HomePage;
