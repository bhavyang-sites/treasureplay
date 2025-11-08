import { motion } from "framer-motion";

// Replace your PALETTE and HEIGHTS with these:

// Subtle, professional look
const USE_PRO_MONO = true;  // toggle this true to enable pro style

const PALETTE = USE_PRO_MONO
  ? ["#e6e6e6"] // single elegant color
  : ["#ff0057", "#ff9f1c", "#00bcd4", "#9c27b0", "#03a9f4", "#ff6f61", "#00e676", "#ffca28"];

const HEIGHTS = USE_PRO_MONO
  ? [1.08, 1.0, 1.06, 1.0, 1.07, 1.05, 1.02, 1.06, 1.0, 1.07, 1.03, 1.05] // subtle variation
  : [1.35, 1.1, 1.25, 1.0, 1.18, 1.28, 1.05, 1.22, 1.14, 1.3, 1.08, 1.2];


const container = {
  hidden: { opacity: 0, y: 10 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { staggerChildren: 0.05, duration: 0.4, ease: "easeOut" }
  }
};

const child = {
  hidden: { opacity: 0, y: 20, rotate: -4, scale: 0.95 },
  visible: { opacity: 1, y: 0, rotate: 0, scale: 1, transition: { duration: 0.45, ease: "easeOut" } }
};

export default function FunkyLogo({ text = "TreasurePlay", className = "" }) {
  return (
    <motion.div
      className={`funky-logo ${className}`}
      variants={container}
      initial="hidden"
      animate="visible"
    >
      {text.split("").map((ch, i) => {
        const color = PALETTE[i % PALETTE.length];
        const h = HEIGHTS[i % HEIGHTS.length];
        // Use font-size scaling per letter to create different heights
        const sizeRem = 2.6 * h; // base 2.6rem * height factor
        return (
          <motion.span
            key={`${ch}-${i}`}
            className="funky-letter"
            variants={child}
            style={{ color, fontSize: `${sizeRem}rem` }}
            aria-hidden="true"
          >
            {ch === " " ? "\u00A0" : ch}
          </motion.span>
        );
      })}
    </motion.div>
  );
}
