/* lab/glass-logo — a logo revealed through liquid glass, after the apple
   music rebrand. a drop lands, out of focus and magnifying a fragment of
   the logo; it squares off into a glass app icon whose shoulder pulls the
   logo toward its edges; the logo recedes to its own size; the glass clears
   and leaves the plain logo. the optional wordmark ending sends a second
   drop across the wordmark.

   technique studied from the ReactDrops "Liquid Glass Logo" component by
   Cristian Javier (reactdrops.dev) — what makes that one read as glass:
   refraction integrated over the spectrum rather than split into r/g/b,
   a sphere that morphs into a superellipse, a flat face rolling into a
   thick shoulder, a young drop that is out of focus, edges built from
   several thin nested reflections, off-white light, and bloom taken from
   the frame's own mip pyramid. this file is our own implementation of
   those ideas, written for this page.

   webgl2, two passes: the glass into a mipmapped texture, then a finish
   pass (bloom, grain, the ground). no imports, so a page or the capture
   route can use it.

   new GlassLogo(canvas, params) → { setArt(art), render(t), length() } */

export const THEMES = {
  dark: { logoColor: "#ffffff", textColor: "#e2e6ee", tileColor: "#060c18", background: "#000000" },
  light: { logoColor: "#09111b", textColor: "#09111b", tileColor: "#e4e6ea", background: "#e2e2e5" },
};

export const DEFAULTS = {
  theme: "dark",
  ...THEMES.dark,
  ending: "logo",       // logo | wordmark
  text: "music",        // the wordmark, when there is no wordmark image
  original: false,      // keep an uploaded logo's own colours
  tile: true,           // lay the logo on the icon plate
  logoSize: 256,        // the icon's edge in css px, before fitting the frame
  logoScale: 0.72,      // the logo inside the icon, fraction of its edge
  finalLogoScale: 1,    // the logo's resting size once the glass is gone
  logoRelief: 1,        // rounded shading on a recoloured logo
  depth: 1.2,           // optical depth, in icon edges
  dispersion: 1,        // spread between the wavelengths' indices
  relief: 1,            // the back wall and its second image
  caustics: 1,          // light focused onto the logo
  highlights: 1,        // reflections on the glass
  bloom: 0.55,          // light diffused around bright edges
  dropStrength: 1,      // curvature of the lens
  echoTint: 0.5,        // how much the line outside the rim takes the plate's hue
  innerWallFocus: 0,    // 0 the whole inner wall, 1 just its lit corners
  decay: 1.4,           // seconds for the wordmark drop's rings to fade
  speed: 1,
  loop: true,
  loopDelay: 1.6,
};

const LOGO_END = 1.8;
const WORD_END = 3.3;
export const lengthOf = (ending) => (ending === "wordmark" ? WORD_END : LOGO_END);

/* ---- timing ------------------------------------------------------------- */

const smooth = (a, b, x) => {
  const t = Math.min(1, Math.max(0, (x - a) / (b - a)));
  return t * t * (3 - 2 * t);
};
/* a smooth curve through [t, value] keys (cardinal spline) */
function curve(keys, t) {
  if (t <= keys[0][0]) return keys[0][1];
  const n = keys.length - 1;
  if (t >= keys[n][0]) return keys[n][1];
  let i = 0;
  while (t > keys[i + 1][0]) i++;
  const [t1, a] = keys[i], [t2, b] = keys[i + 1];
  const ma = i > 0 ? ((b - keys[i - 1][1]) / (t2 - keys[i - 1][0])) * (t2 - t1) : b - a;
  const mb = i + 2 <= n ? ((keys[i + 2][1] - a) / (keys[i + 2][0] - t1)) * (t2 - t1) : b - a;
  const x = (t - t1) / (t2 - t1), x2 = x * x, x3 = x2 * x;
  return (2 * x3 - 3 * x2 + 1) * a + (x3 - 2 * x2 + x) * ma + (-2 * x3 + 3 * x2) * b + (x3 - x2) * mb;
}
/* how large the logo is under the glass: magnified by the drop, receding as
   the icon settles, drawn down into the wordmark drop */
const ART = [[0.12, 1.4], [0.33, 1.45], [0.5, 1.42], [0.66, 1.32], [0.82, 1.24], [1.0, 1.18], [1.15, 1.1], [1.26, 1.0],
  [1.34, 0.87], [1.4, 0.78], [1.46, 0.42]];
/* the wordmark drop, in wordmark half-widths: radius and magnifying core */
const DROP_R = [[1.46, 0.3], [1.56, 0.36], [1.68, 0.48], [1.84, 0.56], [1.93, 0.7], [2.02, 0.88], [2.2, 0.96], [2.45, 1.06], [2.95, 1.3]];
const DROP_CORE = [[1.46, 1.5], [1.84, 1.5], [1.92, 0.56], [2.05, 0.64], [2.2, 0.79], [2.5, 0.9], [2.95, 0.97], [3.02, 1.03]];
const DROP_MAG = [[1.46, 1.5], [1.6, 1.5], [1.75, 2.1], [1.84, 1.4], [1.93, 1.2], [2.02, 1.05], [2.1, 1]];
const DROP_CENTER = [[1.46, -0.6], [1.6, -0.5], [1.75, -0.3], [1.8, 0.4], [1.84, 1]]; // negative: the young drop inverts
const DROP_STRETCH = [[1.46, 0.3], [1.84, 0.3], [2.0, 0.24], [2.2, 0.2], [2.45, 0.25], [2.75, 0.32], [2.9, 0.5], [2.98, 0.8], [3.04, 1]];

/* ---- shaders ------------------------------------------------------------ */

const VS = `#version 300 es
in vec2 aPos;
void main() { gl_Position = vec4(aPos, 0.0, 1.0); }
`;

/* the glass. all lengths in css px (p is from the frame's centre, y up);
   U is one icon edge */
const GLASS = `#version 300 es
precision highp float;
uniform sampler2D uLogo;
uniform sampler2D uWord;
uniform vec2  uRes;
uniform float uDpr;
uniform float uU;
uniform vec2  uWordBox;
uniform float uT;
uniform float uSettle;
uniform float uArt;
uniform float uWordOn;
uniform vec3  uTile;
uniform float uTileOn;
uniform float uPageLight;
uniform float uDepth;
uniform float uDisp;
uniform float uRelief;
uniform float uCaus;
uniform float uHi;
uniform float uEcho;
uniform float uWallFocus;
uniform float uDrop;
uniform float uDecay;
uniform vec4  uDropA;   // radius, core, rim stretch, centre factor
uniform vec2  uDropB;   // core edge magnification, profile exponent
uniform vec4  uDropC;   // ripple amplitude, wavelength, phase, dispersion
out vec4 outColor;

const int BANDS = 24;
const float PI = 3.14159265;

float bell(float x, float w) { float k = x / max(w, 1e-3); return exp(-k * k); }
float ss(float a, float b, float x) { return smoothstep(a, b, x); }
float h1(float n) { return fract(sin(n * 91.37 + 17.13) * 47453.271); }
float vnoise(float x) { float i = floor(x), f = fract(x); f = f * f * (3.0 - 2.0 * f); return mix(h1(i), h1(i + 1.0), f); }

/* wavelength band s (0 violet .. 1 red) to rgb weights */
vec3 band(float s) {
  vec3 w = vec3(bell(s - 0.84, 0.2) + 0.3 * bell(s - 0.02, 0.08), bell(s - 0.52, 0.19), bell(s - 0.18, 0.17));
  return w * mix(0.35, 1.0, ss(0.0, 0.12, s));
}
/* cauchy dispersion: short wavelengths bend more */
float ior(float s, float spread) {
  float l = 0.4 + 0.3 * s;  // microns
  return 1.42 + spread * 0.012 * (1.0 / (l * l) - 3.3);
}

/* the logo texture is one icon edge square, centred on the frame */
vec4 logoAt(vec2 q, float scale, float blur) {
  vec2 box = vec2(uU * scale);
  vec2 uv = 0.5 + q / box;
  float texels = float(textureSize(uLogo, 0).x) / max(box.x * uDpr, 1.0);
  float lod = max(0.0, log2(texels)) + blur;
  vec4 c = textureLod(uLogo, uv, lod);
  return c * step(0.0, uv.x) * step(0.0, uv.y) * step(uv.x, 1.0) * step(uv.y, 1.0);
}
vec4 wordAt(vec2 q) {
  vec2 uv = 0.5 + q / uWordBox;
  vec4 c = textureLod(uWord, uv, max(0.0, log2(float(textureSize(uWord, 0).x) / max(uWordBox.x * uDpr, 1.0))));
  return c * step(0.0, uv.x) * step(0.0, uv.y) * step(uv.x, 1.0) * step(uv.y, 1.0);
}

float superR(vec2 q, float n) { vec2 a = max(abs(q), vec2(1e-5)); return pow(pow(a.x, n) + pow(a.y, n), 1.0 / n); }
vec2 superN(vec2 q, float n) { return normalize(sign(q) * pow(max(abs(q), vec2(1e-5)), vec2(n - 1.0)) + 1e-6); }

/* sparse dashes of light along an edge: u is arc length, d the distance
   across it */
float glints(float u, float d, float size, float seed, float t) {
  float pitch = size * 22.0;
  float cell = floor(u / pitch);
  float g = 0.0;
  for (int j = -1; j <= 1; j++) {
    float id = cell + float(j) + seed;
    float on = step(0.72, h1(id));
    float ph = 6.2832 * h1(id + 7.0);
    float c = (cell + float(j) + 0.2 + 0.6 * h1(id + 3.0)) * pitch;
    float across = (h1(id + 5.0) - 0.5) * size * 0.6 + sin(t * (2.5 + 3.0 * h1(id + 9.0)) + ph) * size * 1.4;
    g += on * bell(u - c, size * (2.5 + 4.0 * h1(id + 11.0))) * bell(d - across, size * 0.35);
  }
  return min(g, 1.0);
}

/* one refracted image of the logo through a surface with normal (n, 1).
   returns premultiplied colour; cov is per-channel coverage */
vec3 cov;
vec4 refracted(vec2 p, vec2 n, float lens, float sd, float young, float strength) {
  vec3 N = normalize(vec3(n, 1.0));
  float spread = uDisp * strength * mix(0.85, mix(2.1, 1.5, ss(0.3, 0.9, uT)), ss(0.25, 0.33, uT));
  vec3 mid = refract(vec3(0.0, 0.0, -1.0), N, 1.0 / ior(0.5, spread));
  vec2 midOff = mid.xy / max(-mid.z, 0.25) * uU * uDepth * 0.8 * lens;
  float rad = uU * lens * 0.5;
  float q = min(length(p) / max(rad, 1.0), 1.0);
  /* the young drop magnifies a fragment and folds its edge; this eases
     into plain refraction as the drop flattens */
  float fold = 1.0 - ss(0.19, 0.27, uT);
  float profile = mix(0.72 + 0.56 * q * q, 1.0 - 0.88 * q * q, fold);
  float blur = young * 2.3;
  vec3 col = vec3(0.0), wsum = vec3(0.0);
  float a = 0.0, lo = 1.0, hi = 0.0;
  cov = vec3(0.0);
  for (int i = 0; i < BANDS; i++) {
    float s = float(i) / float(BANDS - 1);
    vec3 r = refract(vec3(0.0, 0.0, -1.0), N, 1.0 / ior(s, spread));
    vec2 off = r.xy / max(-r.z, 0.25) * uU * uDepth * 0.8 * lens;
    vec2 youngSrc = p * profile + off * mix(0.35, 0.12, fold) + vec2(0.02, 0.1) * uU * fold + (off - midOff) * fold * 1.6;
    vec2 src = mix(p + off, youngSrc, young);
    vec4 ink = logoAt(src, uArt, blur);
    /* clear glass between the young fragment and the rim */
    ink *= mix(1.0, 1.0 - ss(0.72, 0.86, q), fold);
    /* the rim is an aperture too: each wavelength gets its own boundary */
    float shift = (s - 0.5) * uU * lens * 0.018 * uDisp * strength;
    ink *= 1.0 - smoothstep(-0.8 / uDpr, 0.8 / uDpr, sd - shift);
    lo = min(lo, ink.a);
    hi = max(hi, ink.a);
    vec3 w = band(s);
    col += ink.rgb * w;
    a += ink.a * (w.r + w.g + w.b);
    cov += ink.a * w;
    wsum += w;
  }
  col /= wsum;
  cov /= wsum;
  a /= wsum.r + wsum.g + wsum.b;
  /* split edges of the image go cool on the coated shoulder, and violet on
     the young curved face */
  float coat = ss(-uU * lens * 0.022, 0.0, sd);
  col.g *= 1.0 - 0.6 * coat * (hi - lo);
  float film = (hi - lo) * (1.0 - ss(0.19, 0.3, uT)) * (1.0 - ss(-uU * lens * 0.08, -uU * lens * 0.025, sd));
  col.r += col.b * film * 0.8;
  col.b += col.r * film * 0.6;
  col.g *= 1.0 - film * 0.55;
  /* off-white light: nothing under the glass reaches pure white */
  float diffuse = max(dot(N, normalize(vec3(-0.4, 0.6, 1.0))), 0.0);
  vec3 white = mix(mix(vec3(0.9, 0.93, 0.95), vec3(0.84, 0.86, 0.89), ss(0.21, 0.4, uT)), vec3(0.87, 0.88, 0.885), ss(0.75, 1.22, uT));
  col *= white * (0.9 + 0.1 * diffuse + uCaus * 0.04) * (0.975 + 0.025 * sin(p.y / uU * PI)) * (1.0 + 0.09 * ss(0.75, 1.22, uT));
  return vec4(col, a);
}

vec4 icon(vec2 p) {
  float t = uT;
  float settle = ss(0.0, 1.0, uSettle);
  vec4 plain = logoAt(p, uArt, 0.0);
  if (t > 1.58) return plain * settle;
  float enter = ss(0.025, 0.16, t);
  if (enter < 0.001) return vec4(0.0);

  /* sphere → superellipse; it keeps growing a little after it squares */
  float n = 2.0 + 3.0 * ss(0.29, 0.36, t);
  float grow = enter * (0.64 + 0.41 * (1.0 - exp(-max(t - 0.16, 0.0) * 5.8)));
  float collapse = 1.0 - ss(1.33, 1.52, t);
  float lens = max(0.001, mix(grow * mix(0.48, 1.0, collapse), 1.0, settle));
  float half_ = uU * 0.5 * lens;
  float r = superR(p / half_, n);
  float sd = (r - 1.0) * half_;
  float aa = max(fwidth(sd), 0.65);
  float mask = 1.0 - smoothstep(-aa, aa, sd);
  float glass = (1.0 - ss(1.05, 1.4, t)) * collapse * (1.0 - settle);
  float shown = ss(0.12, 0.165, t) * (1.0 - ss(1.39, 1.53, t));
  if (sd > uU * 0.1) return vec4(0.0);

  vec2 outward = superN(p / half_, n);
  vec2 radial = normalize(p + 0.001);
  float young = 1.0 - ss(0.225, 0.335, t);

  /* the surface: a flat face that rolls into a thick shoulder. the shoulder
     starts later along the diagonals as the icon settles */
  float diag = max(0.0, 2.0 * radial.x * radial.y);
  float start = 0.6 + 0.18 * ss(0.66, 1.15, t) * (1.0 - diag) + 0.16 * ss(1.0, 1.22, t) * diag;
  float sh = ss(start, 1.0, r);
  float slope = (0.04 * r + (0.85 + 0.2 * (1.0 - ss(0.28, 0.75, t))) * sh * sh) * glass * uDrop;
  slope += (1.0 - ss(0.18, 0.42, t)) * r * 0.32 * uDrop;  // the young drop is domed all over
  vec2 dir = normalize(mix(outward, radial, 0.95));
  vec2 nrm = dir * slope * (0.8 + 0.4 * radial.x * radial.y) * (1.0 - settle);

  vec4 ink = refracted(p, nrm, lens, sd, young, 1.0);
  vec3 inkCov = cov;

  /* the plate: a dark one deepens toward its rim */
  float plateL = ss(0.3, 0.8, dot(uTile, vec3(0.299, 0.587, 0.114)));
  vec3 body = uTile * (mix(0.55, 0.96, plateL) + mix(0.45, 0.04, plateL) * (1.0 - min(r, 1.0)));
  vec3 col = ink.rgb + body * (1.0 - inkCov) * glass * uTileOn;
  float plateFade = mix((1.0 - ss(1.08, 1.36, t)) * (1.0 - settle), glass, uPageLight);
  float alpha = max(ink.a, plateFade * uTileOn);

  /* a broad softbox on the young sphere's face, gone as it flattens */
  vec2 sp = p / half_;
  vec3 sN = normalize(vec3(sp, sqrt(max(0.001, 1.0 - dot(sp, sp)))));
  vec3 sR = reflect(vec3(0.0, 0.0, -1.0), sN);
  float box = bell(sR.x - mix(-0.12, 0.2, ss(0.13, 0.3, t)), 1.05) * bell(sR.y - 0.56, 0.52);
  float sphereLight = box * (1.0 - ss(0.245, 0.36, t)) * glass * uHi * 0.7;
  col += vec3(0.5, 0.61, 0.72) * sphereLight * (1.0 - ink.a * 0.85);
  alpha = max(alpha, sphereLight);

  /* ---- the edge: nested thin reflections, never one stroke ---- */
  float arc = atan(p.y, p.x) * uU * 0.5;
  float grain = uU * 0.03;
  float key = pow(0.5 + 0.5 * dot(outward, normalize(vec2(-0.5, 0.9))), 5.0);
  float developed = ss(0.23, 0.48, t);
  float warpAmt = lens * developed;
  float warp = uU * ((vnoise(arc / (uU * 0.037)) - 0.5) * 0.0017 + (vnoise(arc / (uU * 0.008) + 29.0) - 0.5) * 0.0008) * warpAmt;
  float rimSd = sd + warp;
  float innerSd = sd + warp * 0.7;
  float inner2Sd = sd + warp * 0.45;
  float thick = 0.75 + 0.5 * vnoise(arc / (uU * 0.013) + 13.0);
  float around = arc / (uU * 0.5);
  float bob = uU * 0.0025 * developed * (0.6 * sin(7.0 * around + 0.4) * sin(t * 6.3 + 1.0) + 0.4 * sin(3.0 * around + 2.0) * sin(t * 4.1));
  float shimmer = mix(vnoise(arc / grain), vnoise(arc / grain + 211.0), 0.5 + 0.5 * sin(t * 5.0 + 6.2832 * vnoise(arc / (grain * 3.0) + 7.0)));
  float rim = bell(rimSd + bob + uU * 0.002, uU * 0.0018 * thick + aa * 0.3) * (0.6 + 0.8 * shimmer);
  float clear = 1.0 - ss(0.62, 0.92, t);  // the inner lines clear first
  float inner = clear * bell(innerSd + uU * 0.012, uU * 0.0025 / thick + aa * 0.2) * (0.55 + 0.9 * vnoise(arc / grain + 41.0));
  float inner2 = clear * bell(inner2Sd + uU * 0.022, uU * 0.0018 * thick + aa * 0.1) * (0.5 + vnoise(arc / grain + 83.0));
  float rimVis = 1.0 - 0.55 * ss(0.75, 1.22, t);

  /* the back wall: an inset superellipse with its own refracted copy of the
     logo, seen in the channel at the lower right */
  float lowerRight = pow(0.5 + 0.5 * dot(outward, normalize(vec2(0.8, -0.6))), 5.0);
  lowerRight *= ss(-0.25, -0.05, p.x / uU) * (1.0 - ss(-0.22, -0.02, p.y / uU));
  vec2 ip = p - vec2(0.002, -0.002) * uU * lens;
  float gap = (0.055 - 0.023 * ss(0.18, 0.34, t)) + 0.05 * ss(0.14, 0.5, t) * (1.0 - 0.5 * ss(0.8, 1.22, t));
  float iHalf = half_ - gap * uU * lens;
  float iN = max(2.0, 2.0 + (n - 2.0) * ss(0.2, 0.55, t) - 0.45);
  float iR = superR(ip / iHalf, iN);
  float iSd = (iR - 1.0) * iHalf + warp * 0.4;
  float channel = ss(-uU * 0.008, uU * 0.025, iSd) * mask;
  float echoMask = channel * lowerRight * glass * (1.0 - settle);
  vec3 backFace = vec3(0.0);
  float logoLight = 0.0;
  if (echoMask * uRelief > 0.002) {
    vec2 bN = normalize(mix(superN(ip / iHalf, iN), radial, 0.6));
    float bSlope = ss(0.9, 1.1, iR) * 1.55 * glass * uDrop;
    /* the thick rim shows whatever ink lies nearest behind it: walk inward
       from where the wall sends the ray until it meets the logo */
    vec2 inward = -normalize(ip + 0.001);
    vec3 bR = refract(vec3(0.0, 0.0, -1.0), normalize(vec3(bN * bSlope, 1.0)), 1.0 / 1.38);
    vec2 land = ip + bR.xy / max(-bR.z, 0.25) * uU * uDepth * 0.8 * lens;
    float reach = 0.0;
    for (int i = 0; i < 20; i++) {
      reach = float(i) * uU * lens * 0.03;
      if (logoAt(land + inward * reach, uArt, 0.0).a > 0.2) break;
    }
    vec4 b = refracted(ip + inward * reach, bN * bSlope, lens, sd, 0.0, 1.6);
    backFace = b.rgb * vec3(0.03, 0.65, 1.0) * echoMask * 0.48 * uRelief * (1.0 - 0.7 * ss(0.75, 1.12, t));
    logoLight = ss(0.05, 0.6, b.a);
  }
  lowerRight *= logoLight;
  float wallRim = clear * bell(iSd, uU * 0.0028 + aa * 0.25);
  float wallShade = clear * bell(iSd + uU * 0.008, uU * 0.005);
  float ang = atan(p.y, p.x);
  float upper = 0.12 + 1.15 * bell(ang - 2.18, 0.32);
  float lower = 0.12 + 1.1 * bell(ang + 0.85, 0.3);
  float tl = ang - 0.75 * PI, br = ang + 0.25 * PI;
  float tlR = tl < 0.0 ? 0.65 : 0.42, brR = br < 0.0 ? 0.65 : 0.42;
  float corner = max(1.0 - ss(0.6 * tlR, tlR, abs(tl)), 1.0 - ss(0.6 * brR, brR, abs(br)));
  float wallLit = clamp(key * key * 0.8 * upper + lowerRight * lowerRight * 0.75 * lower, 0.0, 1.0);
  float wallGate = mix(1.0, max(ss(0.2, 0.7, wallLit), corner), uPageLight * uWallFocus);
  vec3 insetLight = vec3(0.6, 0.78, 0.91) * wallRim * (wallLit + 0.005 + 0.35 * corner * uWallFocus);

  /* the caustic in the lower-right channel: a blue-white core streaked by
     filaments that run along the edge */
  float drift = 0.7 + 0.6 * vnoise(arc / (uU * 0.09) + 7.0);
  float fil = (bell(innerSd + uU * 0.021, uU * 0.0035 * thick) * 0.9 + bell(inner2Sd + uU * 0.028, uU * 0.004 / thick) * 0.7) * clear
            + bell(rimSd + uU * 0.035, uU * 0.003 * thick) * 0.5;
  vec3 lowerGlow = (vec3(0.03, 0.32, 1.0) * bell(sd + uU * 0.038, uU * 0.022 + aa * 0.2) * 0.55
                  + vec3(0.22, 0.62, 1.0) * bell(sd + uU * 0.027, uU * 0.012 + aa * 0.1) * 0.7
                  + vec3(0.75, 0.97, 1.0) * fil * 1.35) * drift * lowerRight * glass * uHi * uRelief * (1.0 - 0.85 * ss(0.6, 1.0, t)) * (1.0 - settle);

  col *= 1.0 - wallShade * wallGate * uRelief * 0.12 * (1.0 - ink.a);
  col += backFace + lowerGlow + insetLight * wallGate * glass * uHi * uRelief * (1.0 - ink.a) * mix(rimVis, 0.9, key);
  alpha = max(alpha, max(lowerGlow.r, max(lowerGlow.g, lowerGlow.b)));

  float rimLight = rim * (0.07 + key * 0.55) + inner * (0.025 + key * 0.16) + inner2 * 0.025;
  float speck = max(uU * 0.0042, 0.8 / uDpr);
  float bubbles = glints(arc, rimSd + bob + uU * 0.002, speck, 0.0, t) * 0.9
                + glints(arc, innerSd + uU * 0.012, speck * 0.8, 97.0, 0.0) * 0.6 * clear
                + glints(arc, iSd, speck * 0.9, 191.0, 0.0) * 0.5 * clear;
  rimLight += bubbles * (0.04 + key * 0.5 + lowerRight * 0.45);

  /* the rim line itself split across the spectrum */
  vec3 spec = vec3(0.0), ws = vec3(0.0);
  for (int i = 0; i < BANDS; i++) {
    float s = float(i) / float(BANDS - 1);
    vec3 w = band(s);
    spec += w * bell(rimSd + (s - 0.5) * uU * 0.011 * uDisp + uU * 0.003, uU * 0.002 * thick);
    ws += w;
  }
  spec /= ws;
  vec3 refl = (vec3(0.6, 0.76, 0.9) * rimLight * 1.15 + spec * (0.02 + ink.a * 0.32)) * uHi * glass * mix(rimVis, 1.2, key);
  float sphereRim = (bell(sd + uU * lens * 0.008, uU * lens * 0.009) * 0.6 + bell(iSd, uU * lens * 0.008) * 0.4)
                  * (0.25 + 0.75 * abs(outward.y)) * (1.0 - ss(0.235, 0.34, t));
  refl += vec3(0.65, 0.8, 0.9) * sphereRim * 1.4 * uHi * glass;
  float cyan = pow(max(0.0, -outward.x), 8.0) * (1.0 - ss(0.235, 0.34, t));
  refl += vec3(0.015, 0.68, 1.0) * (bell(sd + uU * lens * 0.02, uU * lens * 0.009) + bell(iSd, uU * lens * 0.005) * 0.35) * cyan * glass * uHi * 0.85;
  /* a fresh drop is milky with scattered light */
  refl += vec3(0.78, 0.84, 0.9) * (1.0 - ss(0.25, 0.37, t)) * 0.07 * (0.5 + 0.5 * r) * (1.0 - ink.a) * glass;
  refl += mix(vec3(0.32, 0.0, 0.2), vec3(0.32, 0.08, 0.02), ss(0.75, 1.12, t)) * bell(sd + uU * 0.001, uU * 0.002) * ink.a * glass * uHi;
  col += refl;
  alpha = max(alpha, max(refl.r, max(refl.g, refl.b)));
  vec4 res = vec4(col * mask, alpha * mask);

  /* outside: a faint echo of the rim, and one wave leaving it */
  float outer = bell(rimSd - uU * 0.012, uU * 0.0028 * thick) * (0.04 + key * 0.2) * (0.5 + vnoise(arc / grain + 131.0));
  outer += glints(arc, rimSd - uU * 0.012, speck, 277.0, 0.0) * (0.03 + key * 0.3 + lowerRight * 0.25);
  float age = ss(0.36, 1.1, t);
  float wave = bell(sd - uU * (0.014 + 0.03 * age), uU * 0.004 + aa * 0.3) * 0.05 * ss(0.34, 0.42, t) * (1.0 - age);
  vec3 echoCol = mix(vec3(0.43, 0.62, 0.79), uTile + (1.0 - uTile) * 0.4, 0.5 * uEcho);
  float echoLvl = mix(1.0, mix(0.6, 1.0, uPageLight), uEcho);
  float sides = mix(1.0, 0.1, ss(0.25, 0.8, abs(outward.x)));
  vec3 ghost = (echoCol + ink.rgb * 0.6) * (outer + wave * sides) * glass * uHi * rimVis * echoLvl;
  float ext = max(ghost.r, max(ghost.g, ghost.b)) * 1.8;
  /* on a pale page the same ripples read as cool shadows */
  vec3 shade = mix(vec3(0.4, 0.46, 0.56), uTile * 0.86, uEcho);
  res.rgb += mix(ghost * 1.8, shade * ext, uPageLight);
  res.a = max(res.a, ext);
  return mix(res * shown, plain, settle);
}

/* the wordmark drop: a radial lens whose core magnifies (inverting while
   the drop is tall) and whose rim stretches a ring of the image outward;
   ripples crossing the rim repeat that ring */
vec4 wordLens(vec2 p) {
  float t = uT;
  if (uWordOn < 0.5 || t < 1.46) return vec4(0.0);
  if (t >= 3.3) return wordAt(p);
  float R = max(uDropA.x, 1.0);
  float r = length(p);
  if (r > R + uU * 0.6) return vec4(0.0);
  vec2 out_ = p / max(r, 0.001);
  float q = r / R;
  float aa = 1.0 / uDpr;
  float edge = R - r;
  float mask = ss(-aa, aa, edge);
  float young = 1.0 - ss(1.72, 2.02, t);
  float core = min(uDropA.y, R);
  float cq = r / max(core, 1.0);
  float edgeLand = core / max(uDropB.x, 0.01);
  float c = uDropA.w;
  float land = r < core ? edgeLand * cq * (c + (1.0 - c) * pow(cq, uDropB.y)) : edgeLand + (r - core) * uDropA.z;
  float rimZone = ss(core * 0.9, core, r);
  land += uDropC.x * sin(2.0 * PI / max(uDropC.y, 1.0) * r - uDropC.z) * ss(0.0, uDropC.y, r) * mix(1.0 - ss(1.85, 2.0, t), 1.0, rimZone);
  vec2 bend = out_ * (land - r);
  float spread = uDropC.w * uDisp * (0.15 + 0.85 * rimZone);
  vec3 col = vec3(0.0), ws = vec3(0.0);
  float a = 0.0;
  for (int i = 0; i < BANDS; i++) {
    float s = float(i) / float(BANDS - 1);
    vec4 ink = wordAt(p + bend * (1.0 + spread * (s - 0.5)));
    vec3 w = band(s);
    col += ink.rgb * w;
    a += ink.a * (w.r + w.g + w.b);
    ws += w;
  }
  col /= ws;
  a /= ws.r + ws.g + ws.b;
  col *= 1.0 + uCaus * bell(edge, uU * 0.06) * 0.15;
  col *= mask;
  a *= mask;
  float fresh = 1.0 - ss(1.62, 1.95, t);
  col = min(col * (1.0 + 0.6 * fresh), vec3(1.0));
  float milk = mask * fresh * 0.3 * (0.6 + 0.4 * q) * uCaus;
  col += vec3(0.75, 0.82, 0.9) * milk * (1.0 - a);
  float spill = exp(-max(r - R, 0.0) / (uU * 0.17)) * (1.0 - mask) * fresh * 0.12;
  spill += exp(-max(r - R, 0.0) / (uU * 0.4)) * (1.0 - fresh) * 0.035 * exp(-max(t - 1.95, 0.0) / 0.45) * (1.0 - ss(2.8, 3.1, t));
  col += vec3(0.32, 0.6, 1.0) * spill;
  a = max(a, max(milk, spill));
  vec3 sN = normalize(vec3(p / R, sqrt(max(0.005, 1.0 - q * q))));
  vec3 sR = reflect(vec3(0.0, 0.0, -1.0), sN);
  float surf = (bell(sR.x + 0.3, 0.2) * bell(sR.y - 0.55, 0.15) * 0.8 + bell(sR.x - 0.25, 0.14) * bell(sR.y - 0.65, 0.08) * 0.6
              + bell(sR.x + 0.35, 0.65) * bell(sR.y - 0.6, 0.45) * 0.22) * young * uHi * mask;
  col += vec3(0.85, 0.95, 1.0) * surf;
  a = max(a, surf);
  float key = pow(0.5 + 0.5 * dot(out_, normalize(vec2(-0.6, 0.8))), 7.0);
  float rings = 0.0;
  for (int i = 0; i < 4; i++) {
    float j = float(i);
    rings += bell(r - (R + (j - 1.0) * uU * 0.022 * (1.0 + 0.55 * ss(1.8, 3.1, t))), uU * (0.003 + j * 0.001)) * (0.11 / (1.0 + j));
  }
  float fade = exp(-max(0.0, t - 1.46) / max(uDecay, 0.1)) * (1.0 - ss(2.65, 3.3, t));
  float side = pow(abs(out_.x), 10.0) * mix(1.0, 0.72, step(0.0, p.x));
  vec3 refl = vec3(0.4, 0.62, 0.79) * rings * (0.3 + key * 2.0 + side * 1.8) * fade * uHi;
  col += refl;
  a = max(a, max(refl.r, max(refl.g, refl.b)));
  return vec4(col, a) * ss(1.46, 1.49, t);
}

void main() {
  vec2 p = (gl_FragCoord.xy - uRes * 0.5) / uDpr;
  vec4 w = wordLens(p);
  vec4 res = w + icon(p) * (1.0 - w.a);
  res.a = clamp(max(res.a, max(res.r, max(res.g, res.b))), 0.0, 1.0);
  float dither = (fract(sin(dot(gl_FragCoord.xy, vec2(12.9898, 78.233))) * 43758.5453) - 0.5) / 255.0;
  outColor = vec4(clamp(res.rgb + dither * res.a, vec3(0.0), vec3(res.a)), res.a);
}
`;

/* the finish: bloom from the glass pass's own mip pyramid, a whisper of
   grain on the lit parts, then everything over the ground */
const FINISH = `#version 300 es
precision highp float;
uniform sampler2D uScene;
uniform sampler2D uGround;
uniform float uGroundOn;
uniform vec2  uGroundScale;
uniform vec2  uRes;
uniform float uDpr;
uniform float uBloom;
uniform float uT;
uniform float uFinish;
uniform float uPageLight;
uniform vec3  uBg;
uniform float uClear;     // 1: leave the ground transparent, for a canvas laid over a page
out vec4 outColor;
void main() {
  vec2 uv = gl_FragCoord.xy / uRes;
  vec4 base = textureLod(uScene, uv, 0.0);
  float o = log2(max(uDpr, 0.5));
  vec3 soft = textureLod(uScene, uv, o + 2.5).rgb * 0.5 + textureLod(uScene, uv, o + 4.1).rgb * 0.32 + textureLod(uScene, uv, o + 5.4).rgb * 0.18;
  float light = max(base.r, max(base.g, base.b));
  float live = 1.0 - smoothstep(0.0, 1.0, uFinish);
  vec3 glow = soft * uBloom * 0.2 * (1.0 - min(1.0, light * 1.2)) * live * (1.0 - uPageLight);
  float n = fract(sin(dot(gl_FragCoord.xy + floor(uT * 24.0), vec2(12.9898, 78.233))) * 43758.5453) - 0.5;
  vec3 col = base.rgb + glow + n * 0.009 * base.a * clamp(light * 3.0 + 0.05, 0.05, 1.0) * live;
  float a = clamp(max(base.a, max(glow.r, max(glow.g, glow.b))), 0.0, 1.0);
  vec3 ground = uBg;
  if (uGroundOn > 0.5) ground = texture(uGround, (uv - 0.5) * uGroundScale + 0.5).rgb;
  if (uClear > 0.5) { outColor = vec4(min(col, vec3(a)), a); return; }
  outColor = vec4(ground * (1.0 - a) + min(col, vec3(a)), 1.0);
}
`;

/* ---- art ------------------------------------------------------------------ */

const SANS = 'system-ui, -apple-system, "Helvetica Neue", Arial, sans-serif';
const pow2 = (v) => 2 ** Math.ceil(Math.log2(Math.max(2, v)));
const hex = (h) => {
  const n = parseInt(String(h).replace("#", ""), 16);
  return [(n >> 16) / 255, ((n >> 8) & 255) / 255, (n & 255) / 255];
};

/* the default logo: a pair of beamed quavers, drawn as a path so it scales
   cleanly. viewBox 100 */
export const NOTE_SVG =
  '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><path fill="#fff" d="' +
  "M36 22.5c0-2.3 1.5-4.3 3.7-4.9l42-11.3c3-.8 5.8 1.4 5.8 4.5V66c0 9-7.3 16.5-16.6 18.3-8.6 1.6-14.9-2.7-14.9-9.8 " +
  "0-7.6 6.8-13.6 15.4-14.6 2.5-.3 4.7-.1 6.6.5V27.6L46.5 37.4v36.7c0 9-7.3 16.5-16.6 18.3C21.3 94 15 89.7 15 82.6 " +
  "c0-7.6 6.8-13.6 15.4-14.6 2.4-.3 4.6-.1 5.6.3z" +
  '"/></svg>';

function tinted(img, w, h, color) {
  const c = document.createElement("canvas");
  c.width = Math.max(1, Math.ceil(w));
  c.height = Math.max(1, Math.ceil(h));
  const x = c.getContext("2d");
  x.drawImage(img, 0, 0, c.width, c.height);
  if (color !== "original") {
    x.globalCompositeOperation = "source-in";
    x.fillStyle = color;
    x.fillRect(0, 0, c.width, c.height);
  }
  return c;
}

/* a rounded relief on the logo's own silhouette: blur the alpha into a
   height, light it from the upper left */
function relief(canvas, strength) {
  if (strength <= 0) return;
  const { width: W, height: H } = canvas;
  const hgt = document.createElement("canvas");
  hgt.width = W;
  hgt.height = H;
  const hx = hgt.getContext("2d");
  hx.filter = `blur(${Math.max(1, W * 0.012)}px)`;
  hx.drawImage(canvas, 0, 0);
  const a = hx.getImageData(0, 0, W, H).data;
  const ctx = canvas.getContext("2d");
  const img = ctx.getImageData(0, 0, W, H);
  const px = img.data;
  const at = (x, y) => a[(y * W + x) * 4 + 3] / 255;
  for (let y = 1; y < H - 1; y++) {
    for (let x = 1; x < W - 1; x++) {
      const i = (y * W + x) * 4;
      if (!px[i + 3]) continue;
      const nx = (at(x - 1, y) - at(x + 1, y)) * 6, ny = (at(x, y - 1) - at(x, y + 1)) * 6;
      const d = Math.max(0, (-nx * 0.45 - ny * 0.6 + 0.8) / Math.hypot(nx, ny, 1));
      const k = 1 + ((0.74 + d * 0.26) / (0.74 + 0.8 * 0.26) - 1) * strength;
      px[i] *= k; px[i + 1] *= k; px[i + 2] *= k;
    }
  }
  ctx.putImageData(img, 0, 0);
}

/* ---- the renderer --------------------------------------------------------- */

export class GlassLogo {
  /* clear: draw no ground, so the canvas can sit over a page (its alpha
     is premultiplied); exports and recordings leave it off */
  constructor(canvas, params = { ...DEFAULTS }, { clear = false } = {}) {
    this.canvas = canvas;
    this.clear = clear;
    this.params = params;
    this.art = { logo: null, mark: null, wordImg: null, ground: null };
    this.dirty = true;
    this.key = "";
    const gl = canvas.getContext("webgl2", { antialias: false, alpha: clear, premultipliedAlpha: true, preserveDrawingBuffer: true });
    this.gl = gl;
    if (!gl) return;
    const compile = (fs) => {
      const p = gl.createProgram();
      for (const [type, src] of [[gl.VERTEX_SHADER, VS], [gl.FRAGMENT_SHADER, fs]]) {
        const s = gl.createShader(type);
        gl.shaderSource(s, src);
        gl.compileShader(s);
        if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) console.error(gl.getShaderInfoLog(s));
        gl.attachShader(p, s);
      }
      gl.bindAttribLocation(p, 0, "aPos");
      gl.linkProgram(p);
      const U = {};
      const n = gl.getProgramParameter(p, gl.ACTIVE_UNIFORMS);
      for (let i = 0; i < n; i++) {
        const name = gl.getActiveUniform(p, i).name;
        U[name] = gl.getUniformLocation(p, name);
      }
      return { p, U };
    };
    this.glass = compile(GLASS);
    this.finish = compile(FINISH);
    const vao = gl.createVertexArray();
    gl.bindVertexArray(vao);
    gl.bindBuffer(gl.ARRAY_BUFFER, gl.createBuffer());
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 3, -1, -1, 3]), gl.STATIC_DRAW);
    gl.enableVertexAttribArray(0);
    gl.vertexAttribPointer(0, 2, gl.FLOAT, false, 0, 0);
    const tex = () => {
      const t = gl.createTexture();
      gl.bindTexture(gl.TEXTURE_2D, t);
      gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, 1, 1, 0, gl.RGBA, gl.UNSIGNED_BYTE, new Uint8Array(4));
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR_MIPMAP_LINEAR);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
      return t;
    };
    this.tLogo = tex();
    this.tWord = tex();
    this.tGround = tex();
    this.tScene = tex();
    this.fbo = gl.createFramebuffer();
    this.sceneSize = [0, 0];
    this.wordBox = [1, 1];
    this.wordW = 0;
  }

  /* { logo, mark, wordImg, ground }: images. logo is the icon's glyph (the
     default note when null); mark sits before the wordmark (the logo when
     null); wordImg replaces the text; ground is a background image */
  setArt(art) { Object.assign(this.art, art); this.dirty = true; }
  touch() { this.dirty = true; }
  length() { return lengthOf(this.params.ending); }

  upload(t, source) {
    const gl = this.gl;
    gl.bindTexture(gl.TEXTURE_2D, t);
    gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, true);
    gl.pixelStorei(gl.UNPACK_PREMULTIPLY_ALPHA_WEBGL, true);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, source);
    gl.generateMipmap(gl.TEXTURE_2D);
  }

  /* rasterise the logo and the wordmark at the size they will be seen */
  paint(dpr) {
    const p = this.params;
    const logo = this.art.logo || this.noteImg;
    if (!logo || !logo.naturalWidth) return;
    const color = p.original && this.art.logo ? "original" : p.logoColor;

    /* the logo fills a square one icon edge wide, at logoScale */
    const size = Math.min(2048, pow2(p.logoSize * dpr * 2));
    const lc = document.createElement("canvas");
    lc.width = lc.height = size;
    const w0 = logo.naturalWidth, h0 = logo.naturalHeight;
    const k = (size * p.logoScale) / Math.max(w0, h0);
    lc.getContext("2d").drawImage(tinted(logo, w0 * k, h0 * k, color), (size - w0 * k) / 2, (size - h0 * k) / 2);
    if (color !== "original") relief(lc, p.logoRelief);
    this.upload(this.tLogo, lc);

    /* the wordmark: mark + text (or a wordmark image), set at 64 css px and
       padded so the lens can pull transparent texels past its ends */
    const fs = 64;
    const font = `850 ${fs}px ${SANS}`;
    const probe = document.createElement("canvas").getContext("2d");
    probe.font = font;
    const wi = this.art.wordImg;
    const capH = fs * 0.72;
    const textW = wi && wi.naturalWidth ? (wi.naturalWidth / wi.naturalHeight) * capH : p.text ? probe.measureText(p.text).width : 0;
    const mark = this.art.mark || logo;
    const markH = capH * 1.15;
    const markW = (mark.naturalWidth / mark.naturalHeight || 1) * markH;
    const gap = textW ? fs * 0.18 : 0;
    const pad = fs * 0.5;
    const box = [markW + gap + textW + pad * 2, fs * 2];
    const scale = Math.min(dpr * 2, 4096 / box[0]);
    const wc = document.createElement("canvas");
    wc.width = Math.min(4096, pow2(box[0] * scale));
    wc.height = Math.min(4096, pow2(box[1] * scale));
    const wx = wc.getContext("2d");
    wx.scale(wc.width / box[0], wc.height / box[1]);
    const mid = box[1] / 2;
    const tcol = color === "original" ? "original" : p.textColor;
    wx.drawImage(tinted(mark, markW * 4, markH * 4, tcol), pad, mid - markH / 2, markW, markH);
    if (wi && wi.naturalWidth) {
      wx.drawImage(tinted(wi, textW * 4, capH * 4, tcol), pad + markW + gap, mid - capH / 2, textW, capH);
    } else if (p.text) {
      wx.font = font;
      wx.fillStyle = p.textColor;
      wx.textBaseline = "alphabetic";
      wx.fillText(p.text, pad + markW + gap, mid + capH / 2);
    }
    this.upload(this.tWord, wc);
    this.wordBox = box;
    this.wordW = markW + gap + textW;
    if (this.art.ground) this.upload(this.tGround, this.art.ground);
    this.dirty = false;
  }

  /* draw t seconds into the sequence, at the canvas's own backing size;
     cssW is the width it is shown at (for the device pixel ratio) */
  render(t, cssW = this.canvas.clientWidth || this.canvas.width) {
    const gl = this.gl;
    if (!gl) return;
    if (!this.noteImg) {
      this.noteImg = new Image();
      this.noteImg.onload = () => { this.dirty = true; };
      this.noteImg.src = `data:image/svg+xml;utf8,${encodeURIComponent(NOTE_SVG)}`;
    }
    const W = this.canvas.width, H = this.canvas.height;
    if (!W || !H) return;
    const p = this.params;
    const dpr = W / cssW;
    const key = dpr.toFixed(2);
    if (this.dirty || key !== this.key) { this.key = key; this.paint(dpr); }
    if (this.dirty) return; // the note is still decoding

    const cw = W / dpr, ch = H / dpr;
    const ending = p.ending === "wordmark" ? "wordmark" : "logo";
    const end = lengthOf(ending);
    const seq = Math.min(t, end);
    /* fit the icon (and the wordmark, with room for its side reflections) */
    const fit = Math.min(1, cw / Math.max(p.logoSize * 1.9, ending === "wordmark" ? this.wordW * 1.22 : 0), ch / (p.logoSize * 1.5));
    const U = p.logoSize * fit;

    /* the scene texture follows the canvas */
    if (this.sceneSize[0] !== W || this.sceneSize[1] !== H) {
      this.sceneSize = [W, H];
      gl.bindTexture(gl.TEXTURE_2D, this.tScene);
      gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA8, W, H, 0, gl.RGBA, gl.UNSIGNED_BYTE, null);
      gl.bindFramebuffer(gl.FRAMEBUFFER, this.fbo);
      gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, this.tScene, 0);
    }

    /* pass 1: the glass */
    const { p: gp, U: u } = this.glass;
    gl.bindFramebuffer(gl.FRAMEBUFFER, this.fbo);
    gl.viewport(0, 0, W, H);
    gl.useProgram(gp);
    gl.activeTexture(gl.TEXTURE0);
    gl.bindTexture(gl.TEXTURE_2D, this.tLogo);
    gl.activeTexture(gl.TEXTURE1);
    gl.bindTexture(gl.TEXTURE_2D, this.tWord);
    gl.uniform1i(u.uLogo, 0);
    gl.uniform1i(u.uWord, 1);
    gl.uniform2f(u.uRes, W, H);
    gl.uniform1f(u.uDpr, dpr);
    gl.uniform1f(u.uU, U);
    gl.uniform2f(u.uWordBox, this.wordBox[0] * fit, this.wordBox[1] * fit);
    gl.uniform1f(u.uT, seq);
    gl.uniform1f(u.uWordOn, ending === "wordmark" ? 1 : 0);
    /* the logo reaches its resting size first, then holds while the glass
       clears */
    const settle = ending === "logo" ? smooth(1.16, 1.4, t) : 0;
    const artSettle = smooth(1.13, 1.28, t);
    const art = ending === "logo" && t > 1.13 ? curve(ART, 1.13) * (1 - artSettle) + p.finalLogoScale * artSettle : curve(ART, seq);
    gl.uniform1f(u.uArt, art);
    gl.uniform1f(u.uSettle, settle);
    gl.uniform3fv(u.uTile, hex(p.tileColor));
    const bg = hex(p.background);
    const pageL = Math.min(1, Math.max(0, (0.299 * bg[0] + 0.587 * bg[1] + 0.114 * bg[2] - 0.35) / 0.4));
    gl.uniform1f(u.uPageLight, pageL);
    gl.uniform1f(u.uTileOn, p.tile ? 1 : 0);
    gl.uniform1f(u.uDepth, p.depth);
    gl.uniform1f(u.uDisp, p.dispersion);
    gl.uniform1f(u.uRelief, p.relief);
    gl.uniform1f(u.uCaus, p.caustics);
    gl.uniform1f(u.uHi, p.highlights);
    gl.uniform1f(u.uEcho, p.echoTint);
    gl.uniform1f(u.uWallFocus, p.innerWallFocus);
    gl.uniform1f(u.uDrop, p.dropStrength);
    gl.uniform1f(u.uDecay, p.decay);
    /* the wordmark drop scales with the wordmark, so any text gets the same
       optics */
    const reach = Math.max((this.wordW * fit) / 2, U * 0.3);
    const calm = 1 - smooth(2.85, 3.02, seq);
    gl.uniform4f(u.uDropA, reach * curve(DROP_R, seq), reach * curve(DROP_CORE, seq),
      Math.max(0.02, Math.min(1, curve(DROP_STRETCH, seq))), 1 + (curve(DROP_CENTER, seq) - 1) * p.dropStrength);
    gl.uniform2f(u.uDropB, 1 + (curve(DROP_MAG, seq) - 1) * p.dropStrength, 2 + 4 * smooth(1.74, 1.84, seq));
    gl.uniform4f(u.uDropC,
      U * (0.009 * Math.exp(-Math.max(seq - 1.46, 0) / 0.5) * (1 - smooth(1.85, 1.95, seq)) + 0.012 * smooth(2.2, 2.4, seq)) * calm,
      U * (0.07 - 0.04 * smooth(1.9, 2.4, seq)),
      (seq - 1.45) * 42,
      2 * (0.12 + 1.6 * smooth(1.86, 2.0, seq) - 0.9 * smooth(2.25, 2.5, seq)) * calm);
    gl.drawArrays(gl.TRIANGLES, 0, 3);

    /* pass 2: the finish */
    const { p: fp, U: f } = this.finish;
    gl.bindFramebuffer(gl.FRAMEBUFFER, null);
    gl.viewport(0, 0, W, H);
    gl.useProgram(fp);
    gl.activeTexture(gl.TEXTURE0);
    gl.bindTexture(gl.TEXTURE_2D, this.tScene);
    gl.generateMipmap(gl.TEXTURE_2D);
    gl.activeTexture(gl.TEXTURE1);
    gl.bindTexture(gl.TEXTURE_2D, this.tGround);
    gl.uniform1i(f.uScene, 0);
    gl.uniform1i(f.uGround, 1);
    const g = this.art.ground;
    gl.uniform1f(f.uGroundOn, g ? 1 : 0);
    if (g) {
      /* cover-crop the image into the frame */
      const ia = g.naturalWidth / g.naturalHeight, fa = W / H;
      gl.uniform2f(f.uGroundScale, ia > fa ? fa / ia : 1, ia > fa ? 1 : ia / fa);
    }
    gl.uniform2f(f.uRes, W, H);
    gl.uniform1f(f.uDpr, dpr);
    gl.uniform1f(f.uBloom, p.bloom);
    gl.uniform1f(f.uT, seq);
    gl.uniform1f(f.uFinish, ending === "logo" ? smooth(1.05, LOGO_END, t) : smooth(2.8, WORD_END, t));
    gl.uniform1f(f.uPageLight, pageL);
    gl.uniform3fv(f.uBg, bg);
    gl.uniform1f(f.uClear, this.clear ? 1 : 0);
    gl.drawArrays(gl.TRIANGLES, 0, 3);
  }
}
