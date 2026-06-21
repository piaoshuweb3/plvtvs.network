/**
 * Lo-fi Pixel Avatar Generator
 * Generates a deterministic 64x64 cyber-punk pixel avatar from any seed string.
 * 5% chance: Hologram Visor
 * 15% chance: Cyber Mask
 * Default: Code Halo
 */
export type AvatarAccessory = 'VISOR' | 'MASK' | 'HALO';

export interface PixelAvatarData {
  grid: boolean[][]; // 64x64, true = lit
  accessory: AvatarAccessory;
  seed: string;
  hashShort: string; // 0x7A...9F style
}

// Simple deterministic PRNG (mulberry32)
function mulberry32(seed: number) {
  return function () {
    let t = (seed += 0x6d2b79f5);
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function hashStringToInt(s: string): number {
  let h = 0;
  for (let i = 0; i < s.length; i++) {
    h = (Math.imul(31, h) + s.charCodeAt(i)) | 0;
  }
  return Math.abs(h) || 1;
}

export function generatePixelAvatar(seed: string): PixelAvatarData {
  const seedInt = hashStringToInt(seed);
  const rng = mulberry32(seedInt);
  const SIZE = 64;
  const grid: boolean[][] = Array.from({ length: SIZE }, () =>
    new Array(SIZE).fill(false)
  );

  // Build a humanoid silhouette using symmetry (left half = mirror of right)
  const half = SIZE / 2;
  const cx = half;

  // Head: rows 8-26
  for (let y = 8; y <= 26; y++) {
    for (let x = 0; x < half; x++) {
      const dx = cx - x - 0.5;
      const dy = y - 17;
      const dist = Math.sqrt(dx * dx + dy * dy * 0.85);
      // head outline + interior noise
      if (dist < 9) {
        const noise = rng() > 0.18;
        if (noise) {
          grid[y][x] = true;
          grid[y][SIZE - 1 - x] = true;
        }
      }
    }
  }

  // Eyes (only on the head area)
  const eyeY = 18;
  // left eye
  for (let y = eyeY; y < eyeY + 2; y++) {
    for (let x = cx - 5; x < cx - 2; x++) {
      grid[y][x] = false;
      grid[y][SIZE - 1 - x] = false;
    }
  }
  // Mouth
  for (let x = cx - 3; x < cx + 3; x++) {
    grid[23][x] = false;
  }

  // Neck (small connector)
  for (let y = 27; y < 30; y++) {
    for (let x = cx - 3; x < cx + 3; x++) {
      if (rng() > 0.1) grid[y][x] = true;
    }
  }

  // Shoulders + torso (trapezoidal)
  for (let y = 30; y < 56; y++) {
    const progress = (y - 30) / 26;
    const width = Math.floor(18 - progress * 4);
    for (let x = cx - width; x < cx + width; x++) {
      if (x < 0 || x >= SIZE) continue;
      if (rng() > 0.15) grid[y][x] = true;
    }
  }

  // Accessory roll
  const roll = rng();
  let accessory: AvatarAccessory;
  if (roll < 0.05) accessory = 'VISOR';
  else if (roll < 0.20) accessory = 'MASK';
  else accessory = 'HALO';

  // Apply accessory
  if (accessory === 'VISOR') {
    // Holographic visor across eyes
    for (let x = cx - 7; x < cx + 7; x++) {
      if (x < 0 || x >= SIZE) continue;
      for (let y = eyeY - 1; y < eyeY + 3; y++) {
        grid[y][x] = true;
      }
    }
  } else if (accessory === 'MASK') {
    // Cyber mask below eyes
    for (let y = eyeY + 3; y < 25; y++) {
      for (let x = cx - 6; x < cx + 6; x++) {
        if (x < 0 || x >= SIZE) continue;
        grid[y][x] = true;
      }
    }
    // mask filter lines
    for (let y = eyeY + 4; y < 24; y += 2) {
      for (let x = cx - 5; x < cx + 5; x++) {
        if (x >= 0 && x < SIZE) grid[y][x] = false;
      }
    }
  }
  // HALO: render in component as surrounding ring, no grid change

  // Hash short string
  const hashFull = seedInt.toString(16).toUpperCase().padStart(8, '0');
  const hashShort = `0x${hashFull.slice(0, 2)}...${hashFull.slice(-2)}`;

  return { grid, accessory, seed, hashShort };
}

/**
 * Render the avatar as an SVG data URL (downloadable)
 */
export function pixelAvatarToSvg(data: PixelAvatarData, size = 256): string {
  const cell = size / 64;
  let rects = '';
  for (let y = 0; y < 64; y++) {
    for (let x = 0; x < 64; x++) {
      if (data.grid[y][x]) {
        rects += `<rect x="${x * cell}" y="${y * cell}" width="${cell}" height="${cell}" fill="#00FF66"/>`;
      }
    }
  }
  // Halo ring
  if (data.accessory === 'HALO') {
    rects += `<circle cx="${size / 2}" cy="${size * 0.18}" r="${size * 0.12}" fill="none" stroke="#00FFCC" stroke-width="2" opacity="0.7"/>`;
  }
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 ${size} ${size}" style="background:#000000">${rects}</svg>`;
}
