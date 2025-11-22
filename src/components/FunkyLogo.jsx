import { motion } from "framer-motion";

// one-time stagger animation
const container = {
  hidden: { opacity: 0, y: 10 },
  visible: {
    opacity: 1, y: 0,
    transition: { staggerChildren: 0.05, duration: 0.4, ease: "easeOut" },
  },
};
const child = {
  hidden: { opacity: 0, y: 20, rotate: -3, scale: 0.95 },
  visible: {
    opacity: 1, y: 0, rotate: 0, scale: 1,
    transition: { duration: 0.45, ease: "easeOut" },
  },
};

// slight, natural height variation
const HEIGHTS = [1.08, 1.0, 1.06, 1.0, 1.07, 1.05, 1.02, 1.06, 1.0, 1.07, 1.03, 1.05];

// SOLID colors only (no textures)
// const TREASURE_SOLIDS = [
//   "#D4AF37", // gold
//   "#C0C0C0", // silver
//   "#F8F4E6", // pearl (warm off-white)
//   "#0F9D58", // emerald
//   "#0D47A1", // sapphire
//   "#C41E3A", // ruby
// ];

const TREASURE_GRADIENT = `
  linear-gradient(
    180deg,
  #F4D06F 0%,
  #E5B85B 50%,
  #C8943C 100%
  )
`;


const PLAY_CHROME = `
  linear-gradient(
    90deg,
    #B20710 0%,
    #9A0510 35%,
    #7A040A 70%,
    #B20710 100%
  )
`;



// deterministic shuffle so colors don't change on re-render
function seededShuffleIndices(n, seedStr = "TreasurePlay-v1") {
  let seed = 0;
  for (let i = 0; i < seedStr.length; i++) seed = (seed * 31 + seedStr.charCodeAt(i)) >>> 0;
  const arr = Array.from({ length: n }, (_, i) => i);
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

  const treasureCount = splitIndex === -1 ? letters.length : splitIndex;
  const shuffled = seededShuffleIndices(treasureCount);

  return (
    <motion.div className={`funky-logo ${className}`} variants={container} initial="hidden" animate="visible">
      {letters.map((ch, i) => {
        const h = HEIGHTS[i % HEIGHTS.length];
        const sizeRem = 2.3 * h;

        // Base text style (no background-clip here)
        const baseText = {
          fontSize: `${sizeRem}rem`,
          fontWeight: 900,
          lineHeight: 0.9,
        };
        // TREASURE (navy gradient)
if (splitIndex === -1 || i < splitIndex) {
  return (
    <motion.span
      key={`${ch}-${i}`}
      className="funky-letter treasure-letter"
      variants={child}
      style={{
  ...baseText,
  background: TREASURE_GRADIENT,
  WebkitBackgroundClip: "text",
  backgroundClip: "text",
  color: "transparent"
}}

    >
      {ch === " " ? "\u00A0" : ch}
    </motion.span>
  );
}


        // PLAY (shiny rose-gold gradient)
        return (
          <motion.span
            key={`${ch}-${i}`}
            className="funky-letter play-letter"
            variants={child}
            style={{
  ...baseText,
  background: PLAY_CHROME,
  WebkitBackgroundClip: "text",
  backgroundClip: "text",
  color: "transparent"
}}

          >
            {ch === " " ? "\u00A0" : ch}
          </motion.span>
        );
      })}
    </motion.div>
  );
}
