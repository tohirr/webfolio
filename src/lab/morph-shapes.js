/* lab/morph-shapes — the morph piece's targets. every dot has one (u, v) pair on a
   golden-ratio lattice: u wraps like longitude, v runs 0→1 like latitude.
   each shape turns a pair into a position and a surface normal, so the
   same dot has a seat on every shape and a morph is just a lerp between
   two seats. the membrane displaces along the normal, which is why each
   shape carries one. */

const TAU = Math.PI * 2;

/* tilt about x so flat things are seen at an angle */
const tiltX = (out, o, a) => {
  const c = Math.cos(a), s = Math.sin(a);
  const y = out[o + 1], z = out[o + 2];
  out[o + 1] = y * c - z * s;
  out[o + 2] = y * s + z * c;
  const ny = out[o + 4], nz = out[o + 5];
  out[o + 4] = ny * c - nz * s;
  out[o + 5] = ny * s + nz * c;
};

/* each writes [x, y, z, nx, ny, nz] at out[o..o+5] */
export const SHAPES = [
  {
    name: "sphere",
    at(u, v, out, o) {
      const y = 1 - 2 * v;
      const r = Math.sqrt(Math.max(0, 1 - y * y));
      const t = u * TAU;
      out[o] = Math.cos(t) * r;
      out[o + 1] = y;
      out[o + 2] = Math.sin(t) * r;
      out[o + 3] = out[o];
      out[o + 4] = y;
      out[o + 5] = out[o + 2];
    },
  },
  {
    name: "record",
    at(u, v, out, o) {
      // a disc with a hole: the lattice makes it look pressed
      const r = 0.28 + 0.86 * v;
      const a = u * TAU;
      out[o] = Math.cos(a) * r;
      out[o + 1] = 0;
      out[o + 2] = Math.sin(a) * r;
      out[o + 3] = 0;
      out[o + 4] = 1;
      out[o + 5] = 0;
      tiltX(out, o, 1.05);
    },
  },
  {
    name: "sheet",
    at(u, v, out, o) {
      out[o] = (u - 0.5) * 2.5;
      out[o + 1] = 0;
      out[o + 2] = (v - 0.5) * 2.5;
      out[o + 3] = 0;
      out[o + 4] = 1;
      out[o + 5] = 0;
      tiltX(out, o, 1.1);
    },
  },
  {
    name: "helix",
    at(u, v, out, o) {
      // a tube wound three times around the y axis
      const turns = 3;
      const y = (v - 0.5) * 2.2;
      const a = v * TAU * turns;
      const rx = Math.cos(a), rz = Math.sin(a); // radial
      const cx = rx * 0.6, cz = rz * 0.6;
      const b = u * TAU;
      const nx = Math.cos(b) * rx, ny = Math.sin(b), nz = Math.cos(b) * rz;
      const tube = 0.17;
      out[o] = cx + nx * tube;
      out[o + 1] = y + ny * tube;
      out[o + 2] = cz + nz * tube;
      out[o + 3] = nx;
      out[o + 4] = ny;
      out[o + 5] = nz;
    },
  },
];

/* fill a Float32Array(n*6) with a shape's seats for n lattice dots */
export function seats(shape, n, U, V, out) {
  for (let i = 0; i < n; i++) shape.at(U[i], V[i], out, i * 6);
  return out;
}
