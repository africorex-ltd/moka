/**
 * Generates all Moka-branded PNG assets for the app.
 * Run: node generate-assets.js
 * Requires: npm install -D sharp
 */
const sharp = require('sharp')
const path = require('path')
const fs = require('fs').promises

const OUT = path.join(__dirname, 'assets')

// ──────────────────────────────────────────────
// SVG pieces
// ──────────────────────────────────────────────

// Bold M letterform on 1024×1024 canvas
const M = `<path fill="white" d="
  M 185,850
  L 185,250 L 295,250
  L 512,575
  L 729,250 L 839,250
  L 839,850 L 729,850
  L 729,410
  L 555,688 L 469,688
  L 295,410
  L 295,850 Z
"/>`

// Leaf accent above the M centre (between the two top peaks)
const LEAF = `
  <ellipse cx="476" cy="130" rx="44" ry="88" fill="#8FBA78"
           transform="rotate(-22, 476, 130)"/>
  <ellipse cx="548" cy="130" rx="44" ry="88" fill="#8FBA78"
           transform="rotate(22, 548, 130)"/>
  <rect x="508" y="188" width="8" height="65" rx="4" fill="#6DAA4A"/>
`

// Rounded-square green background
const BG = `<rect width="1024" height="1024" fill="#2D5016" rx="180"/>`

// ──────────────────────────────────────────────
// Render helper
// ──────────────────────────────────────────────
async function render(filename, svg, size) {
  const buf = await sharp(Buffer.from(svg)).resize(size, size).png().toBuffer()
  await fs.writeFile(path.join(OUT, filename), buf)
  console.log(`  ✓  ${filename}  (${size}×${size})`)
}

async function main() {
  console.log('\nGenerating Moka branded assets…\n')

  // App icon — full branded square
  await render('icon.png', `
    <svg width="1024" height="1024" viewBox="0 0 1024 1024" xmlns="http://www.w3.org/2000/svg">
      ${BG}
      ${M}
      ${LEAF}
    </svg>`, 1024)

  // Adaptive icon foreground — transparent bg, white M + green leaf
  await render('android-icon-foreground.png', `
    <svg width="1024" height="1024" viewBox="0 0 1024 1024" xmlns="http://www.w3.org/2000/svg">
      ${M}
      ${LEAF}
    </svg>`, 1024)

  // Adaptive icon background — solid green fill
  await render('android-icon-background.png', `
    <svg width="1024" height="1024" viewBox="0 0 1024 1024" xmlns="http://www.w3.org/2000/svg">
      <rect width="1024" height="1024" fill="#2D5016"/>
    </svg>`, 1024)

  // Monochrome — all white, for notification badges
  await render('android-icon-monochrome.png', `
    <svg width="1024" height="1024" viewBox="0 0 1024 1024" xmlns="http://www.w3.org/2000/svg">
      ${M}
      <ellipse cx="476" cy="130" rx="44" ry="88" fill="white"
               transform="rotate(-22, 476, 130)"/>
      <ellipse cx="548" cy="130" rx="44" ry="88" fill="white"
               transform="rotate(22, 548, 130)"/>
      <rect x="508" y="188" width="8" height="65" rx="4" fill="white"/>
    </svg>`, 1024)

  // Splash icon — M + leaf on transparent (shown centred on green bg)
  await render('splash-icon.png', `
    <svg width="1024" height="1024" viewBox="0 0 1024 1024" xmlns="http://www.w3.org/2000/svg">
      ${M}
      ${LEAF}
    </svg>`, 1024)

  // Favicon — full branded, 64 px
  await render('favicon.png', `
    <svg width="1024" height="1024" viewBox="0 0 1024 1024" xmlns="http://www.w3.org/2000/svg">
      ${BG}
      ${M}
      ${LEAF}
    </svg>`, 64)

  console.log('\nAll assets generated successfully.\n')
}

main().catch((err) => {
  console.error('Error generating assets:', err.message)
  process.exit(1)
})
