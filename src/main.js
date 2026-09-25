import "./index.css";

/* ---- blocks ------------------------------------------------------------
   the work row: live pieces mounted right in their tile, plus placeholders
   for what's coming. each live module exports mount(el) → optional cleanup */

const FELDY_URL = "https://feldy.ai";
const FELDY_APP_STORE = "https://apps.apple.com/us/app/feldy-ai/id6780327228";
const FELDY_PLAY_STORE = "https://play.google.com/store/apps/details?id=com.feldy.app";

/* where "feldy" goes: the store on a phone, the site everywhere else.
   ipad safari calls itself a mac, so touch points break the tie */
const feldyHref = () => {
  const ua = navigator.userAgent;
  const ios = /iPhone|iPad|iPod/.test(ua) || (/Mac/.test(ua) && navigator.maxTouchPoints > 0);
  if (ios) return FELDY_APP_STORE;
  if (/Android/.test(ua)) return FELDY_PLAY_STORE;
  return FELDY_URL;
};

const GALLARIA_URL = "https://gallaria.tohirr.dev";

const BOOKMARX_URL = "https://bookmarx.space";

const blocks = [
  {
    name: "bookmarx",
    type: "site",
    blurb: "a library for saved posts",
    sub: "a library for saved posts that searches, and sorts itself",
    detail: true,
    kind: "more",
    load: () => import("./lab/bookmarx-mark.js"),
  },
  {
    name: "facet-card",
    type: "component",
    blurb: "pixel holo foil",
    sub: "pixel holo foil · webgl",
    detail: true,
    kind: "touch",
    load: () => import("./lab/facet-card.js"),
  },
  {
    name: "gallaria",
    type: "site",
    blurb: "a canvas of african art",
    sub: "an infinite canvas of art by african artists · webgl2",
    detail: true,
    kind: "more",
    load: () => import("./lab/gallaria.js"),
  },
  {
    name: "morph",
    type: "component",
    blurb: "dots that morph with music",
    sub: "dots that morph with music · bring your own tracks",
    detail: true,
    kind: "touch",
    load: () => import("./lab/morph.js"),
  },
  {
    name: "tape",
    type: "component",
    blurb: "heading tape over a dot globe",
    sub: "heading tape over a dot globe · detents, momentum, phone compass",
    detail: true,
    kind: "touch",
    load: () => import("./lab/tape.js"),
  },
  {
    name: "calendar",
    light: true,
    type: "design",
    blurb: "a live event, concept",
    sub: "a calendar widget that shows a live event running \u00b7 concept",
    ratio: "2000 / 1150",
    detail: true,
    kind: "more",
    load: () => import("./lab/calendar.js"),
  },
  {
    name: "keycaps",
    type: "component",
    blurb: "text set as keycaps",
    sub: "text set as keycaps · three.js",
    detail: true,
    kind: "touch",
    load: () => import("./lab/keycaps.js"),
  },
  {
    name: "feldy",
    type: "app",
    blurb: "the field app",
    hidden: true,
    sub: "the field app · react native, on the app store and google play",
    detail: true,
    kind: "more",
    load: () => import("./lab/feldy-screens.js"),
  },
  {
    name: "eyes",
    type: "component",
    blurb: "a face that notices you",
    hidden: true,
    sub: "a face that notices you, and gets bored · canvas",
    detail: true,
    kind: "touch",
    load: () => import("./lab/eyes.js"),
  },
  {
    name: "holo-button",
    type: "component",
    blurb: "a ripple of holo foil",
    hidden: true,
    sub: "a button whose ripple is holo foil · webgl",
    detail: true,
    kind: "touch",
    load: () => import("./lab/holo-button.js"),
  },
  { name: "coffee", coffee: true },
];

/* pieces parked for now keep their entry and their story — they just
   take no cell, and answer no deep link, until the flag comes off */
const shown = blocks.filter((b) => !b.hidden);
const parked = new Set(blocks.filter((b) => b.hidden).map((b) => b.name));

/* ---- details: what opens when a tile is tapped. a block with `detail: true`
   looks up its name here — { title, sub, body, links, media? } ---------- */

const details = {
  bookmarx: {
    title: "bookmarx",
    sub: "a library for saved posts that searches, and sorts itself",
    body:
      `<p>You remember fragments, not wording \u2014 <em>that thread about ` +
      `optimistic ui</em>, <em>the astronaut looking out the window</em>. ` +
      `bookmarx turns the fragment into the saved post, and every result ` +
      `says why it is there: a reason in a sentence, and under it the ` +
      `ranker's own numbers \u2014 which half of the search found it, at what ` +
      `rank, and the fused vote that placed it.</p>` +
      `<p>Nobody opens three thousand saves knowing what to ask, so the front ` +
      `page is rooms, not a feed. The next date in your saves leads it; old ` +
      `finds you have not been back to run across the top; collections are ` +
      `found by clustering the embeddings the search already has; reminders ` +
      `are read off the posts, and you tick them off. Every post opens onto ` +
      `its own page, with the saves nearest it in meaning. There is nothing ` +
      `to file.</p>` +
      `<p>Built alone, on free tiers, from X, Bluesky and Mastodon. No model ` +
      `runs while you search \u2014 keyword and vector scans over Postgres, ` +
      `merged by position. The models run once per post in background jobs, ` +
      `under a spend cap.</p>`,
    code:
      `// each half votes by position, never by score \u2014\n` +
      `// and a half that never found the post votes nothing\n` +
      `const RRF_K = 60;\n` +
      `function vote(rank, weight) {\n` +
      `  if (rank === undefined) return 0;\n` +
      `  return weight / (RRF_K + rank);\n` +
      `}`,
    links: [{ label: "bookmarx.space", href: BOOKMARX_URL }],
    /* the space stands beside the story \u2014 the cell is only the icon */
    stage: () => import("./lab/bookmarx-mark.js"),
  },

  gallaria: {
    title: "gallaria",
    sub: "an infinite canvas of art by african artists",
    body:
      `<p>A wrapping field of work I keep finding on the internet, with every ` +
      `piece linked back to its artist and the post it came from. Drag to pan, ` +
      `pinch to zoom, flick and it settles on a work.</p>` +
      `<p>One WebGL2 context, no framework. Works are placed by seeded blue-noise ` +
      `so the field is even and stable across visits, and every image climbs a ` +
      `resolution ladder as you get close — 16 px, 64 px, 512 px, 1600 px — each ` +
      `rung dissolving in through an 8×8 Bayer threshold, so the loading state ` +
      `<em>is</em> the pixelation. The cell here is that machine in miniature, ` +
      `on forty of the works.</p>`,
    links: [{ label: "gallaria.tohirr.dev", href: GALLARIA_URL }],
    /* the field carries on behind the card */
    scene: () => import("./lab/gallaria.js"),
  },

  feldy: {
    title: "feldy",
    sub: "the field app, on the app store and google play",
    body:
      `<p>The phone a roofing crew takes onto the job. Photos and videos ` +
      `that file themselves under the right project, a walkthrough you ` +
      `narrate while you shoot, a 3D model of the roof back from a scan, an ` +
      `estimate built from what happened on site, a proposal to hand the ` +
      `customer — and an AI receptionist that answers the office phone ` +
      `while everyone is up a ladder.</p>` +
      `<p>React Native and Expo, TypeScript end to end, one codebase for ` +
      `iOS and Android. I started it in December 2025 and have been its main ` +
      `engineer since: sign-in and onboarding, the photo editor, the maps, ` +
      `the estimate flow, the receptionist, push notifications and deep ` +
      `links, and every release — store builds and over-the-air updates. ` +
      `These are the screens from its store listing; the app itself is a ` +
      `download away.</p>`,
    code:
      `// the reset email links to the web app, since the same\n` +
      `// mail goes to web users — a universal link rewrites\n` +
      `// it onto the native screen instead of falling through\n` +
      `const WEB_RESET = /^\\/auth\\/jwt\\/reset_password\\/([A-Za-z0-9]+)\\/?$/;\n` +
      `export function redirectSystemPath({ path }) {\n` +
      `  const m = WEB_RESET.exec(path);\n` +
      `  return m ? "/reset-password/" + m[1] : path;\n` +
      `}`,
    links: [
      { label: "app store", href: FELDY_APP_STORE },
      { label: "google play", href: FELDY_PLAY_STORE },
      { label: "feldy.ai", href: FELDY_URL },
    ],
    /* the screens stand beside the story, arrows out */
    stage: () => import("./lab/feldy-screens.js"),
  },

  eyes: {
    title: "eyes",
    sub: "a face that notices you, and gets bored",
    body:
      `<p>Two eyes and two brows on a grid, and nothing else. Move the ` +
      `pointer anywhere on the page and they follow it — after a beat, ` +
      `because reacting the instant you arrive is the tell that nothing is ` +
      `home. Stop moving and they lose interest and start glancing about on ` +
      `their own. Leave them alone long enough and they doze off.</p>` +
      `<p>None of what makes it read as alive is in the drawing. It is the ` +
      `delay before it notices, the spring that snaps on a long look and ` +
      `drifts on a short one, the blink that fires on a hard turn as well as ` +
      `on its own clock, the breath built from two sines that never line up, ` +
      `and the attention that decays. Underneath, every value is continuous; ` +
      `at draw, every one is snapped to a cell — so it moves in steps and ` +
      `never jitters.</p>`,
    code:
      `// noticing takes a beat, and interest decays\n` +
      `const active = ptr && t - lastMove < BORED;\n` +
      `if (ptr && !noticed && t - firstSeen > NOTICE) noticed = true;\n` +
      `if (noticed && !active) { noticed = false; glance(); }\n` +
      `\n` +
      `// a long look lands like a saccade, a short one drifts\n` +
      `const far = Math.abs(s.t - s.v) > 1.1;\n` +
      `s.k = far ? 420 : 150;`,
    stage: () => import("./lab/eyes.js"),
  },

  "facet-card": {
    title: "facet-card",
    sub: "a trading card with a pixel holo foil",
    body:
      `<p>Tilt it with the pointer — on a phone, with the phone — and the foil ` +
      `catches the light. Click and the card flips to a random one off the ` +
      `Pok\u00e9mon TCG image CDN, the swap radiating out from where you clicked, ` +
      `one facet at a time.</p>` +
      `<p>The shine recipe is real trading-card CSS ` +
      `(simeydotme's trainer-gallery-holo): rainbow gradient, contrast crush, ` +
      `hard-light and overlay glare. Here it is rebuilt in a WebGL fragment ` +
      `shader and lit <em>per facet</em> instead of per pixel — the surface is ` +
      `quantised to a grid of cells first and each cell handed its own tilted ` +
      `normal from a hash, so the foil reads as a field of tiny pixels rather ` +
      `than a smear. Springs use svelte-motion's constants.</p>`,
    code:
      `// lit per facet, not per pixel — quantise first\n` +
      `vec2 id = floor(gl_FragCoord.xy / uCellPx);\n` +
      `float h1 = hash(id + .13), h2 = hash(id + 7.31);\n` +
      `vec3 n = vec3(h1 - .5, h2 - .5, 0.) * .55;\n` +
      `vec3 N = rotY(rotX(normalize(vec3(n.xy, 1.)),\n` +
      `              uTilt.x), uTilt.y);`,
    /* the card itself stands beside the story */
    stage: () => import("./lab/facet-card.js"),
  },

  keycaps: {
    title: "keycaps",
    sub: "text set as keycaps",
    body:
      `<p>Type a line and every word becomes a cap — or every letter, in ` +
      `letters mode — up to eight, in rows, shot straight from above so the ` +
      `caps face you. Click a cap to pick it and it lifts; give it a colour, ` +
      `a finish — matte, gloss, clear resin, metal — and a font: mono, sans, ` +
      `serif, or pixel. Press a cap and it travels on a stiff spring with a ` +
      `click and a thock under it. Download renders the caps to a square ` +
      `PNG.</p>` +
      `<p>Every cap is one rounded box, tapered toward the top, which from ` +
      `above is what shows its sides on every edge. A word's legend shrinks ` +
      `until it spans the cap. The resin caps carry their colour in the ` +
      `attenuation rather than the surface, so light goes in white and comes ` +
      `out tinted, and the pixel font is the legend rasterised nine cells ` +
      `tall and blown up with smoothing off, so every stroke lands on a ` +
      `coarse grid in the plastic.</p>`,
    links: [{ label: "open the configurator", href: "/keycaps/" }],
    code:
      `// a word a cap, or a letter a cap — eight at most\n` +
      `const tokenize = (line, mode) =>\n` +
      `  (mode === "letters"\n` +
      `    ? [...line].map((ch) => ch.trim())\n` +
      `    : line.split(/\\s+/).filter(Boolean)\n` +
      `  ).slice(0, MAX);`,
    stage: () => import("./lab/keycaps.js"),
  },

  "holo-button": {
    title: "holo-button",
    sub: "a button whose press ripple is holographic foil",
    body:
      `<p>Material's ripple: it starts where you press, grows to cover the ` +
      `button, holds while you hold, and cools when you let go. Here the wave ` +
      `is foil instead of a translucent disc. Hold it and the whole button ` +
      `charges; move the pointer and the light rolls across the facets.</p>` +
      `<p>The foil is the facet-card recipe on a canvas under the label: the ` +
      `surface is quantised to a grid of cells, each cell hashed its own tilted ` +
      `normal, and the light hangs off the pointer. The ripple is a hard, ` +
      `cell-stepped disc with a jittered rainbow ring riding its edge, so the ` +
      `wavefront is ragged by exactly one pixel. Screen-blended on dark, ` +
      `multiplied on light. A spring squashes the press.</p>`,
    code:
      `// the wave: a facet-stepped disc, ragged by one\n` +
      `// cell, with a rainbow ring riding the edge\n` +
      `float d = distance(cp, R.xy * asp) + jit;\n` +
      `mask  += (1. - step(R.z, d)) * R.w;   // charge\n` +
      `front += 1. - smoothstep(0., .14, abs(d - R.z));`,
    stage: () => import("./lab/holo-button.js"),
  },

  morph: {
    title: "morph",
    sub: "a cloud of dots that morphs with music",
    body:
      `<p>Fourteen hundred dots on a golden-ratio lattice, each with a seat on ` +
      `four shapes — sphere, record, sheet, helix. Tap the cloud ` +
      `and every dot leaves for its next seat in turn, so the change sweeps ` +
      `through rather than snapping; a hard drop in the music turns the page ` +
      `on its own. Each frame is drawn over a faded, slightly zoomed copy of ` +
      `the last, the way the old media-player visualizers did it, so the ` +
      `louder the passage the longer the trails.</p>` +
      `<p>The dots never read the spectrum directly. Under them is a damped ` +
      `wave field: sound pokes it, viscosity drags each poke's neighbourhood ` +
      `along, and every dot samples the membrane along its surface normal — ` +
      `so the skin moves as <em>one object</em> on whichever shape it is ` +
      `wearing. A generative loop plays whenever the cloud is on screen; ` +
      `add your own tracks and they play right here, in ` +
      `the browser, never uploaded — or hand it the microphone and let the ` +
      `room move it.</p>`,
    code:
      `// the analyser sits before the master, so the\n` +
      `// track drives the surface whether or not the\n` +
      `// master is letting it through\n` +
      `mix.connect(analyser);\n` +
      `analyser.connect(master); // 0 off screen, or muted\n` +
      `master.connect(ac.destination);`,
    stage: () => import("./lab/morph.js"),
  },

  tape: {
    title: "tape",
    sub: "a heading tape over a dot globe",
    body:
      `<p>The strip out of a glass cockpit's display: ticks sliding under a fixed ` +
      `centre indicator, one degree a tick, every tick a detent you can feel. ` +
      `Drag it; flick it and it coasts and settles onto a tick; roll the wheel ` +
      `over it; step it with the arrow keys. Every tick crossed is a click — a ` +
      `filtered noise burst pitched by direction — and a short buzz where the ` +
      `browser has a motor. Land on N, E, S or W and the readout goes green, ` +
      `the way a level app goes green at zero.</p>` +
      `<p>Underneath is the earth from straight above Lagos, drawn as a dot ` +
      `display: a fixed 34-cell grid samples an orthographic hemisphere, land is ` +
      `a lit dot shaded toward the limb, sea a faint one, and the tape turns the ` +
      `globe so your heading is up. The coastline is Natural Earth's 110 m line ` +
      `rasterised to 2\u00b0 cells and packed into a base64 string — about ` +
      `2.7\u202fkB, so nothing is fetched. Canvas 2D. On a phone, a tap on the ` +
      `globe hands the dial to the compass.</p>`,
    code:
      `// a flick coasts on friction, then the nearest\n` +
      `// tick pulls it in — the detent is the feel\n` +
      `vel *= Math.exp(-FRICTION * dt);\n` +
      `if (Math.abs(vel) < 1.2) {\n` +
      `  const k = 1 - Math.exp(-dt * 14); // fps-free\n` +
      `  pos += (Math.round(pos) - pos) * k;\n` +
      `}`,
    stage: () => import("./lab/tape.js"),
  },

  calendar: {
    title: "calendar",
    sub: "a concept, drawn in figma",
    body:
      `<p>A mockup, not a build \u2014 no Xcode was opened for it. On the left, ` +
      `the widget as it ships today. It is glanced at, not read, and the glance ` +
      `mid-meeting asks one question \u2014 how much longer \u2014 which two ` +
      `timestamps answer only once you have done the subtraction yourself. On ` +
      `the right, the concept: a running event's block drains and says the ` +
      `number, <em>30 min left</em>.</p>` +
      `<p>An earlier pass, not pictured, ran the fill behind the text, which is ` +
      `the mistake: over ninety minutes the edge sweeps straight across the ` +
      `title, so the contrast under a word changes as time passes and you ` +
      `cannot flip the text colour to fix it \u2014 the edge cuts through ` +
      `mid-glyph. This one moves the fill into a solid carrying its own text, ` +
      `with the pale remainder as the track behind it. The title still runs ` +
      `past that block's edge, which is the next pass's problem.</p>` +
      `<p>Nothing here is built, though it would not be costly to. A widget gets ` +
      `a few dozen refreshes a day and animating a fill by hand would spend ` +
      `all of them \u2014 except that WidgetKit will drive a progress view off ` +
      `a date range on its own, which makes this one of the rare things a ` +
      `widget can move for free. Roughly what would carry it:</p>`,
    code:
      `// the system redraws this one \u2014 no timeline entry\n` +
      `// per minute, no refresh budget spent on it\n` +
      `ProgressView(timerInterval: event.start...event.end,\n` +
      `             countsDown: false) {\n` +
      `  Text(event.title)\n` +
      `}\n` +
      `.progressViewStyle(.linear)`,
    /* the concept stands next to the shipping widget \u2014 the comparison is
       the piece, so the stage shows the whole frame */
    stage: () => import("./lab/calendar.js"),
  },
};

const EMAIL = "tohirr.dev@gmail.com";

const SPONSOR_URL = "https://github.com/sponsors/tohirr";

/* google calendar appointment-schedule booking page */
const CAL_URL = "https://calendar.app.google/6M3QwajrfAX85EaC8";

/* the social buttons up top: glass squircles like the cells, frosted over
   whatever scrolls under them, with the rim of light the cells have and the
   mark in the page's ink. the box, the frost and the rim are all css
   (.icon-btn); these are only the marks, all on a 24 grid — the official
   github and x ones (github.com/logos, x.com/brand), and gmail's m from
   simple icons */
const GH_MARK =
  "M12 .297c-6.63 0-12 5.373-12 12 0 5.303 3.438 9.8 8.205 11.385.6.113.82-.258.82-.577 " +
  "0-.285-.01-1.04-.015-2.04-3.338.724-4.042-1.61-4.042-1.61C4.422 18.07 3.633 17.7 3.633 " +
  "17.7c-1.087-.744.084-.729.084-.729 1.205.084 1.838 1.236 1.838 1.236 1.07 1.835 2.809 " +
  "1.305 3.495.998.108-.776.417-1.305.76-1.605-2.665-.3-5.466-1.332-5.466-5.93 " +
  "0-1.31.465-2.38 1.235-3.22-.135-.303-.54-1.523.105-3.176 0 0 1.005-.322 3.3 1.23.96-.267 " +
  "1.98-.399 3-.405 1.02.006 2.04.138 3 .405 2.28-1.552 3.285-1.23 3.285-1.23.645 1.653.24 " +
  "2.873.12 3.176.765.84 1.23 1.91 1.23 3.22 0 4.61-2.805 5.625-5.475 5.92.42.36.81 1.096.81 " +
  "2.22 0 1.606-.015 2.896-.015 3.286 0 .315.21.69.825.57C20.565 22.092 24 17.592 24 " +
  "12.297c0-6.627-5.373-12-12-12";

const X_MARK =
  "M14.234 10.162 22.977 0h-2.072l-7.591 8.824L7.251 0H.258l9.168 13.343L.258 24H2.33l8.016-9.318" +
  "L16.749 24h6.993zm-2.837 3.299-.929-1.329L3.076 1.56h3.182l5.965 8.532.929 1.329 7.754 11.09h-3.182z";

const GMAIL_MARK =
  "M24 5.457v13.909c0 .904-.732 1.636-1.636 1.636h-3.819V11.73L12 16.64l-6.545-4.91v9.273H1.636" +
  "A1.636 1.636 0 0 1 0 19.366V5.457c0-2.023 2.309-3.178 3.927-1.964L5.455 4.64 12 9.548l6.545-4.91" +
  " 1.528-1.145C21.69 2.28 24 3.434 24 5.457z";

const mark = (box, d, size, rule = "") =>
  `<svg viewBox="${box}" width="${size}" height="${size}" aria-hidden="true">` +
  `<path d="${d}" fill="currentColor"${rule}/></svg>`;

const GH_ICON = mark("0 0 24 24", GH_MARK, 22);
const X_ICON = mark("0 0 24 24", X_MARK, 18);
const MAIL_ICON = mark("0 0 24 24", GMAIL_MARK, 22);

const nav = [
  { label: "GitHub", href: "https://github.com/tohirr", icon: GH_ICON },
  { label: "X (Twitter)", href: "https://x.com/_tohirr", icon: X_ICON },
  { label: "Email", href: `mailto:${EMAIL}`, icon: MAIL_ICON },
];

/* the mark in a cell's corner says what the piece is: a site that lives
   on the web, an app for a phone, a component you can drop into an
   interface, or a design that is still a picture. a cell without a type
   gets none. (how the cell behaves under a tap is `kind`, not this) */
const SVG =
  '<svg viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.5" ' +
  'stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">';
const TYPE = {
  // a globe
  site:
    SVG +
    '<circle cx="8" cy="8" r="6.25"/><path d="M1.75 8h12.5"/>' +
    '<path d="M8 1.75c1.8 1.7 2.6 3.8 2.6 6.25S9.8 12.55 8 14.25C6.2 12.55 5.4 10.45 5.4 8S6.2 3.45 8 1.75Z"/></svg>',
  // a phone, with its home bar
  app: SVG + '<rect x="4.5" y="1.75" width="7" height="12.5" rx="2"/><path d="M7 11.75h2"/></svg>',
  // four diamonds, the way a design tool marks a component
  component:
    SVG +
    '<path d="M8 1.75 10.25 4 8 6.25 5.75 4ZM12 5.75 14.25 8 12 10.25 9.75 8ZM8 9.75 10.25 12 8 14.25 5.75 12ZM4 5.75 6.25 8 4 10.25 1.75 8Z"/></svg>',
  // a pen nib
  design:
    SVG +
    '<path d="M8 1.75 12.5 7.5 10 14.25H6L3.5 7.5Z"/><path d="M8 1.75v5"/>' +
    '<circle cx="8" cy="8.5" r="1.1"/></svg>',
};

/* a live cell you can touch can't be one big link — a tap on it is a tap on
   the piece. so the cell opens its story on a tap the piece didn't want: one
   that missed the piece's own controls (anything marked [data-act]) and that
   the piece didn't claim by stopping the pointer event on its way up. a drag
   is never a tap, so the row still scrolls under the finger */
const tapOpens = (b) => b.detail && b.kind === "touch";

const openOnTap = (el, name) => {
  let x0 = 0, y0 = 0, mine = false;
  const act = (e) => e.target.closest?.("[data-act]");
  el.addEventListener("pointerdown", (e) => {
    mine = !act(e);
    x0 = e.clientX;
    y0 = e.clientY;
  });
  el.addEventListener("pointerup", (e) => {
    const go = mine && !act(e) && Math.abs(e.clientX - x0) + Math.abs(e.clientY - y0) <= 6;
    mine = false;
    if (go) location.hash = name;
  });
  el.addEventListener("pointercancel", () => { mine = false; });
  el.addEventListener("keydown", (e) => {
    if (e.target !== el) return; // the piece's own controls keep their keys
    if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      location.hash = name;
    }
  });
};

/* on a phone nobody clicks — the intro says what the hand actually does */
const VERB = matchMedia("(pointer: coarse)").matches ? "touch" : "click";

/* ---- page -------------------------------------------------------------- */

const ext = 'target="_blank" rel="noreferrer"';

/* a landscape piece sets its own ratio on the cell \u2014 everything else
   takes the row's portrait shape from the stylesheet */
const shape = (b) => (b.ratio ? ` style="--ratio: ${b.ratio}"` : "");

const tile = (b) =>
  `<figure class="block${b.light ? " on-light" : ""}" aria-label="${b.name}">` +
  (b.coffee
    ? `<a class="tile coffee" href="${SPONSOR_URL}" ${ext}>` +
      `<span class="c-line">interfaces run on caffeine</span>` +
      `<span class="c-cta">sponsor me →</span></a>`
    : b.detail && !tapOpens(b)
      ? `<a class="tile mark"${shape(b)} href="#${b.name}" aria-label="${b.name}" data-mount="${b.name}"></a>`
      : b.href
        ? `<a class="tile mark"${shape(b)} href="${b.href}" ${ext} aria-label="${b.name}" data-mount="${b.name}"></a>`
      : tapOpens(b)
        ? `<div class="tile tappable"${shape(b)} role="link" tabindex="0" aria-label="${b.name}" data-mount="${b.name}"></div>`
      : `<div class="tile"${shape(b)} data-mount="${b.name}"></div>`) +
  (b.coffee
    ? ""
    : `<figcaption class="cap"><span class="cap-head">` +
      (TYPE[b.type] ? `<span class="kind" title="${b.type}">${TYPE[b.type]}</span>` : "") +
      `<span class="cap-title">${b.title ?? b.name}</span></span>` +
      (b.blurb ? `<span class="cap-blurb">${b.blurb}</span>` : "") +
      `</figcaption>`) +
  `</figure>`;

document.getElementById("app").innerHTML =
  `<nav class="topnav" aria-label="social">` +
  nav
    .map(
      (n) =>
        `<a class="icon-btn" href="${n.href}" ${ext} aria-label="${n.label}">${n.icon}</a>`,
    )
    .join("") +
  `</nav>` +
  `<section class="intro">` +
  // the avatar swaps its <img> for a canvas once it loads; the wrapper is
  // what fades in, so the swap can't restart the fade
  `<div><img class="avatar" src="/favicon.svg" alt="pixel portrait of tohir" width="52" height="52" /></div>` +
  `<p class="ink">Hi there,</p>` +
  `<p>I’m Tohir, a design engineer building interfaces you ${VERB} ` +
  `just to feel them. Currently @ <a class="feldy" href="${feldyHref()}" ${ext}>` +
  `<img class="app-icon" src="/media/feldy-app-icon.png" alt="F" width="16" height="16" />eldy</a>.</p>` +
  `<p>Open to design engineer roles — <a href="${CAL_URL}" ${ext}>let’s talk</a>.</p>` +
  `</section>` +
  `<div class="bars" aria-hidden="true">` +
  shown.map(() => `<i></i>`).join("") +
  `</div>` +
  `<section class="blocks" aria-label="work">` +
  shown.map(tile).join("") +
  `</section>`;

/* ---- entrance: the page fades in a layer at a time, top to bottom ------
   the nav, then each line of the intro, the indicator, and the cells in
   the order they sit. the stylesheet staggers them by --i */

[
  document.querySelector(".topnav"),
  ...document.querySelector(".intro").children,
  document.querySelector(".bars"),
  ...document.querySelectorAll(".block"),
].forEach((el, i) => {
  el.classList.add("enter");
  el.style.setProperty("--i", i);
  // once in, the layer lets the animation go: one left filling its opacity
  // keeps a stacking context that would trap the docked avatar under the cells
  el.addEventListener("animationend", function done(e) {
    if (e.target !== el) return;
    el.classList.remove("enter");
    el.removeEventListener("animationend", done);
  });
});

/* ---- the drawer ---------------------------------------------------------- */

import("./drawer.js").then((mod) =>
  mod.mountDrawer(
    Object.fromEntries(Object.entries(details).filter(([name]) => !parked.has(name))),
  ),
);

/* ---- avatar: pixel-scatter hover ---------------------------------------- */

import("./avatar.js")
  .then((mod) => mod.mount(document.querySelector(".avatar")))
  .catch(() => {});

/* ---- live tiles -------------------------------------------------------- */

for (const b of shown) {
  if (!b.load) continue;
  const el = document.querySelector(`[data-mount="${b.name}"]`);
  if (tapOpens(b)) openOnTap(el, b.name);
  b.load()
    .then((mod) => mod.mount(el))
    .catch(() => {
      el.innerHTML = '<span class="tile-err">failed to load</span>';
    });
}

/* a caption whose blurb won't fit on one line at this width drops the blurb
   and keeps just the title — checked again whenever the cell changes size */
const fit = new ResizeObserver((entries) => {
  for (const { target: cap } of entries) {
    const blurb = cap.querySelector(".cap-blurb");
    if (!blurb) continue;
    cap.classList.remove("bare");
    cap.classList.toggle("bare", blurb.scrollWidth > blurb.clientWidth);
  }
});
document.querySelectorAll(".cap").forEach((cap) => fit.observe(cap));

/* theme follows the system for now — no toggle */

/* ---- indicator: one bar per stage, thick while its stage is in view ----- */

const barEls = [...document.querySelector(".bars").children];
const blockEls = [...document.querySelectorAll(".block")];
const scroller = document.querySelector(".blocks");

const io = new IntersectionObserver(
  (entries) => {
    for (const e of entries) {
      const bar = barEls[blockEls.indexOf(e.target)];
      if (bar) bar.classList.toggle("on", e.intersectionRatio >= 0.6);
    }
  },
  { root: scroller, threshold: [0.6] },
);
blockEls.forEach((el) => io.observe(el));

/* ---- rim light: the source stays put while the cells move under it ------
   each cell's highlight turns to face one fixed point on the screen. on a
   wide screen it hangs over the start of the row, just above the cells: a
   cell resting there is lit from the top, the ones queued to its right from
   the left, and one sliding in swings round through the whole range as it
   arrives. on a phone the column runs straight up, so the light sits off to
   the left instead and the rims turn as the cells climb. reads first, then
   writes, once a frame at most */

const tileEls = [...document.querySelectorAll(".tile")];
const phone = matchMedia("(max-width: 640px)");
let lighting = 0;
const light = () => {
  lighting = 0;
  const lx = phone.matches ? -0.3 * innerWidth : parseFloat(getComputedStyle(scroller).paddingLeft);
  const ly = phone.matches ? 0.4 * innerHeight : 0.45 * innerHeight;
  const angles = tileEls.map((t) => {
    const r = t.getBoundingClientRect();
    if (r.right < 0 || r.left > innerWidth || r.bottom < 0 || r.top > innerHeight) return null;
    // css angles run clockwise from "to top"; the gradient points away from the light
    const dx = r.left + r.width / 2 - lx, dy = r.top + r.height / 2 - ly;
    return (Math.atan2(dx, -dy) * 180) / Math.PI;
  });
  angles.forEach((a, i) => {
    if (a !== null) tileEls[i].style.setProperty("--rim-angle", `${a.toFixed(1)}deg`);
  });
};
const relight = () => {
  if (!lighting) lighting = requestAnimationFrame(light);
};
light();
scroller.addEventListener("scroll", relight, { passive: true });
addEventListener("scroll", relight, { passive: true });
addEventListener("resize", relight);

/* ---- phone: the avatar docks beside the social icons --------------------
   scrolling up, the avatar rides with the intro until it meets the nav's
   line, then stays there beside the icons at their size, and the icons
   step aside so the four sit centred as one group. scrolling back lets it
   go into its place. its slot keeps its height so nothing below moves, and
   both moves are measured before and after and eased between */

const lead = document.querySelector(".intro").firstElementChild; // the avatar's slot
const navEl = document.querySelector(".topnav");
const NAV_TOP = 16;
const still = matchMedia("(prefers-reduced-motion: reduce)").matches;
const GLIDE = { duration: still ? 0 : 340, easing: "cubic-bezier(0.32, 0.72, 0, 1)" };
let docked = false;

const dock = (on) => {
  if (on === docked) return;
  docked = on;
  const av = lead.firstElementChild; // the <img>, or the canvas wrap once it swaps in
  const icon = navEl.querySelector(".icon-btn");
  const a0 = av.getBoundingClientRect();
  const i0 = icon.getBoundingClientRect().left;
  if (on) {
    const next = lead.nextElementSibling.getBoundingClientRect().top;
    lead.style.height = `${next - lead.getBoundingClientRect().top}px`;
  }
  navEl.classList.toggle("docked", on);
  av.classList.toggle("docked", on);
  av.style.left = on ? `${navEl.getBoundingClientRect().left}px` : "";
  if (!on) lead.style.height = "";
  const a1 = av.getBoundingClientRect();
  const i1 = icon.getBoundingClientRect().left;
  // the avatar scales from its top left corner, so where it was is a shift
  // and the size it was
  const from = a0.width / av.offsetWidth;
  const to = a1.width / av.offsetWidth;
  av.animate(
    [
      { transform: `translate(${a0.left - a1.left}px, ${a0.top - a1.top}px) scale(${from})` },
      { transform: `scale(${to})` },
    ],
    GLIDE,
  );
  navEl.animate(
    [{ transform: `translate(-50%, 0) translateX(${i0 - i1}px)` }, { transform: "translate(-50%, 0)" }],
    GLIDE,
  );
};

let docking = 0;
const checkDock = () => {
  docking = 0;
  dock(phone.matches && lead.getBoundingClientRect().top <= NAV_TOP);
};
const redock = () => {
  if (!docking) docking = requestAnimationFrame(checkDock);
};
checkDock();
addEventListener("scroll", redock, { passive: true });
addEventListener("resize", redock);
phone.addEventListener("change", redock);
