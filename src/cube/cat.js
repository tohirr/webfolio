/* the cat: a voxel model on an N³ grid that spans the whole cube, N/3
   voxels per cubie. drawn from primitives (an ellipsoid body, a round
   head, pyramid ears, a curled tail) with a grey-tabby paint job, so it
   can be tuned by hand or swapped for a .vox file later. y is up, the cat
   faces +z. returns Map "i,j,k" → hex colour */

export const N = 15;

const GREY = 0x7f868f;
const DARK = 0x3a3f46;
const WHITE = 0xf4f3ef;
const PINK = 0xe4a2ab;
const NOSE = 0xd9737d;
const EYE = 0xbfe04a;
const PUPIL = 0x1d2024;

export function buildCat() {
  const vox = new Map();
  const put = (i, j, k, c) => {
    if (i < 0 || j < 0 || k < 0 || i >= N || j >= N || k >= N) return;
    vox.set(`${i},${j},${k}`, c);
  };
  const inEll = (i, j, k, cx, cy, cz, rx, ry, rz) =>
    ((i - cx) / rx) ** 2 + ((j - cy) / ry) ** 2 + ((k - cz) / rz) ** 2 <= 1;

  /* shape: whether a grid cell is solid, and which part it belongs to */
  const part = (i, j, k) => {
    // sitting body, haunches at the back
    if (inEll(i, j, k, 7, 4.6, 6.6, 5.1, 4.9, 6.2)) return "body";
    // head, pushed forward and up
    if (inEll(i, j, k, 7, 10.4, 9.2, 4.3, 4.1, 4.0)) return "head";
    // ears: two pyramids on the head
    for (const ex of [3.5, 10.5]) {
      const w = 14.6 - j; // narrower toward the tip
      if (j >= 12 && j <= 14 && Math.abs(i - ex) <= w * 0.9 && Math.abs(k - 8.5) <= w * 0.8) return "ear";
    }
    // front legs, standing in front of the belly
    if (j <= 5 && k >= 11 && k <= 13 && (Math.abs(i - 4.5) <= 1 || Math.abs(i - 9.5) <= 1)) return "leg";
    return null;
  };

  for (let i = 0; i < N; i++)
    for (let j = 0; j < N; j++)
      for (let k = 0; k < N; k++) {
        const p = part(i, j, k);
        if (!p) continue;
        let c = GREY;
        if (p === "leg") c = j <= 1 ? WHITE : GREY;
        if (p === "ear") c = Math.abs(k - 8.5) < 0.6 && j < 14 ? PINK : DARK;
        if (p === "body") {
          const front = k >= 9.5 && Math.abs(i - 7) <= 2.2 && j <= 8.5; // white chest
          const stripe = j >= 5.5 && k <= 10 && Math.abs(i - 7) <= 4.6 && Math.floor(k / 2) % 2 === 0;
          const side = Math.abs(i - 7) >= 4.4 && j >= 3 && j <= 7 && Math.floor(j / 2) % 2 === 1;
          c = front ? WHITE : stripe || side ? DARK : GREY;
        }
        if (p === "head") {
          const muzzle = k >= 11.5 && j <= 10.2 && Math.abs(i - 7) <= 2.6; // white muzzle
          const brow = j >= 12 && k <= 11 && ((i + Math.floor(k / 2)) % 3 === 0); // forehead marks
          c = muzzle ? WHITE : brow ? DARK : GREY;
        }
        put(i, j, k, c);
      }

  /* face: eyes, pupils, nose, mouth — on the front of the head */
  const FZ = 12; // the front-most head layer at eye height
  for (const ex of [4, 9]) {
    put(ex, 11, FZ, EYE);
    put(ex + 1, 11, FZ, EYE);
    put(ex + (ex < 7 ? 1 : 0), 11, FZ + 1, PUPIL);
  }
  put(7, 9, 13, NOSE);
  put(6, 8, 13, DARK);
  put(8, 8, 13, DARK);

  /* tail: curls from the haunch around the right flank to the front paws */
  const path = [
    [11, 1, 2], [12, 1, 3], [13, 1, 4], [13, 1, 6], [13, 1, 8], [13, 1, 10], [13, 1, 12],
    [12, 1, 13], [11, 1, 14], [10, 1, 14],
  ];
  path.forEach(([x, y, z], n) => {
    const tip = n >= path.length - 2;
    for (let di = -1; di <= 1; di++)
      for (let dj = 0; dj <= 1; dj++)
        for (let dk = -1; dk <= 1; dk++) {
          if (Math.abs(di) + Math.abs(dk) > 1) continue;
          put(x + di, y + dj, z + dk, tip ? DARK : n % 3 === 0 ? DARK : GREY);
        }
  });

  return vox;
}
