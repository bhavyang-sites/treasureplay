import { motion } from "framer-motion";

// --- one-time stagger animation ---
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

const HEIGHTS = [1.08, 1.0, 1.06, 1.0, 1.07, 1.05, 1.02, 1.06, 1.0, 1.07, 1.03, 1.05];

// --- metallic/stone “materials” as gradient text styles ---
const MATERIALS = [
  // Gold (shiny)
  () => ({
    background: "linear-gradient(90deg,#b8860b 0%,#ffd700 25%,#fff1a8 50%,#e6c200 75%,#b8860b 100%)",
    textShadow: "0 0 6px rgba(255,215,0,0.25)",
  }),
  // Silver (chrome)
  () => ({
    background: "linear-gradient(90deg,#7f8c8d 0%,#dfe6e9 35%,#ffffff 50%,#c0c0c0 70%,#7f8c8d 100%)",
  }),
  // Pearl
  () => ({
    background: "linear-gradient(90deg,#f8f8ff 0%,#fffaf0 40%,#f5f5dc 60%,#ffffff 100%)",
  }),
  // Emerald
  () => ({
    background: "linear-gradient(90deg,#0f9d58 0%,#32cd32 40%,#98fb98 70%,#0f9d58 100%)",
  }),
  // Sapphire
  () => ({
    background: "linear-gradient(90deg,#0d47a1 0%,#2196f3 40%,#bbdefb 70%,#0d47a1 100%)",
  }),
  // Ruby
  () => ({
    background: "linear-gradient(90deg,#8b0000 0%,#ff1744 40%,#ffcdd2 70%,#8b0000 100%)",
  }),
];

// Rose-gold gradient for “Play”
const ROSE_GOLD = "linear-gradient(90deg,#b76e79 0%,#e6b7c8 35%,#f7d3d9 55%,#e0a3ad 75%,#b76e79 100%)";

// deterministic “random” so letters don’t reshuffle on re-render
function seededShuffleIndices(n, seedStr = "treasure-seed") {
  // simple LCG from string hash
  let seed = 0;
  for (let i = 0; i < seedStr.length; i++) seed = (seed * 31 + seedStr.charCodeAt(i)) >>> 0;
  let arr = Array.from({ length: n }, (_, i) => i);
  for (let i = n - 1; i > 0; i--) {
    seed = (1103515245 * seed + 12345) >>> 0;
    const j = seed % (i + 1);
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

export default function FunkyLogo({ text = "TreasurePlay", className = "" }) {
  const splitIndex = text.indexOf("Play");
  const letters = text.split("");

  // figure the count of "Treasure" letters for shuffling
  const treasureCount = splitIndex === -1 ? letters.length : splitIndex;
  const shuffled = seededShuffleIndices(treasureCount, "TreasurePlay-v1");

  return (
    <motion.div className={`funky-logo ${className}`} variants={container} initial="hidden" animate="visible">
      {letters.map((ch, i) => {
        const h = HEIGHTS[i % HEIGHTS.length];
        const sizeRem = 2.6 * h;

        const base = {
          fontSize: `${sizeRem}rem`,
          fontWeight: 900,
          lineHeight: 0.9,
          backgroundClip: "text",
          WebkitBackgroundClip: "text",
          color: "transparent",
          WebkitTextFillColor: "transparent",
        };

        // If we're in "Treasure" segment, assign a material by shuffled index
        if (splitIndex === -1 || i < splitIndex) {
          const matIndex = shuffled[i % treasureCount] % MATERIALS.length;
          const mat = MATERIALS[matIndex]();
          return (
            <motion.span key={`${ch}-${i}`} className="funky-letter" variants={child} style={{ ...base, ...mat }}>
              {ch === " " ? "\u00A0" : ch}
            </motion.span>
          );
        }

        // Else "Play" segment → shiny rose-gold
        return (
          <motion.span
            key={`${ch}-${i}`}
            className="funky-letter"
            variants={child}
            style={{ ...base, background: ROSE_GOLD }}
          >
            {ch === " " ? "\u00A0" : ch}
          </motion.span>
        );
      })}
    </motion.div>
  );
}
