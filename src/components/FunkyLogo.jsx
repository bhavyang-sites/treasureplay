import { motion } from "framer-motion";

// Animation variants
const container = {
  hidden: { opacity: 0, y: 10 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { staggerChildren: 0.05, duration: 0.4, ease: "easeOut" },
  },
};

const child = {
  hidden: { opacity: 0, y: 20, rotate: -3, scale: 0.95 },
  visible: {
    opacity: 1,
    y: 0,
    rotate: 0,
    scale: 1,
    transition: { duration: 0.45, ease: "easeOut" },
  },
};

// Slight natural height variation (keeps it organic)
const HEIGHTS = [1.08, 1.0, 1.06, 1.0, 1.07, 1.05, 1.02, 1.06, 1.0, 1.07, 1.03, 1.05];

export default function FunkyLogo({ text = "TreasurePlay", className = "" }) {
  const splitIndex = text.indexOf("Play");
  const letters = text.split("");

  return (
    <motion.div
      className={`funky-logo ${className}`}
      variants={container}
      initial="hidden"
      animate="visible"
    >
      {letters.map((ch, i) => {
        const isAccent = splitIndex !== -1 && i >= splitIndex; // marks "Play"
        const h = HEIGHTS[i % HEIGHTS.length];
        const sizeRem = 2.6 * h;

        const baseStyle = {
          fontSize: `${sizeRem}rem`,
          fontWeight: 900,
          lineHeight: 0.9,
        };

        // --- 🎨 TREASURE (Gold/Silver/Pearl gradient) ---
        const treasureGradient =
          "linear-gradient(90deg, #ffd700 0%, #e0e0e0 45%, #f5f5dc 90%)"; 
          // gold → silver → pearl

        // --- 🎬 PLAY (Maroon) ---
        const playColor = "#800000";

        const style = isAccent
          ? { ...baseStyle, color: playColor }
          : {
              ...baseStyle,
              background: treasureGradient,
              backgroundClip: "text",
              WebkitBackgroundClip: "text",
              color: "transparent",
              WebkitTextFillColor: "transparent",
            };

        return (
          <motion.span key={`${ch}-${i}`} className="funky-letter" variants={child} style={style}>
            {ch === " " ? "\u00A0" : ch}
          </motion.span>
        );
      })}
    </motion.div>
  );
}
