/* lab/glass-layouts — the places a logo reveal actually lives, as small
   mock screens for the glass lab's layout rail: a landing hero, a phone's
   launch screen, a site header, a home screen, a video intro, a loading
   screen, a sign-up card, a social post. each one is plain html at a fixed
   design size with one empty .lx-slot where the reveal goes — the live
   canvas on the stage, a still frame in the rail's thumbnails.

   colours come from css variables the lab sets from the glass settings
   (--g-bg, --g-ink, --g-plate), so every mock sits on the same ground as
   the logo. */

const bar = (w) => `<i class="lx-bar" style="width:${w}"></i>`;
const lines = (...ws) => ws.map(bar).join("");

export const LAYOUTS = [
  {
    id: "result",
    label: "Result",
    w: 1280, h: 720,
    html: () => '<div class="lx lx-result"><div class="lx-slot"></div></div>',
  },
  {
    id: "hero",
    label: "Hero",
    w: 1280, h: 720,
    html: (name) => `<div class="lx lx-hero">
  <nav class="lx-nav"><b>${name}</b><span>Product</span><span>Pricing</span><span>Journal</span><em>Sign in</em></nav>
  <div class="lx-hero-copy">
    <small>NEW · 2026 IDENTITY</small>
    <h2>A new look,<br>poured in glass.</h2>
    <p>Our mark, rebuilt for every screen it lives on — from the dock to the splash.</p>
    <div class="lx-row"><span class="lx-btn">Get started</span><span class="lx-btn lx-ghost">Watch the film</span></div>
  </div>
  <div class="lx-hero-art"><div class="lx-slot"></div></div>
</div>`,
  },
  {
    id: "mobile",
    label: "Mobile",
    w: 1280, h: 720,
    html: (name) => `<div class="lx lx-desk">
  <div class="lx-phone"><div class="lx-screen">
    <div class="lx-status"><b>9:41</b><span class="lx-island"></span><i></i></div>
    <div class="lx-slot"></div>
    <div class="lx-splash-foot"><b>${name}</b><span>Loading your library</span></div>
  </div></div>
</div>`,
  },
  {
    id: "header",
    label: "Header",
    w: 1280, h: 720,
    html: () => `<div class="lx lx-desk">
  <div class="lx-browser">
    <div class="lx-chrome"><i></i><i></i><i></i><span>yourbrand.com</span></div>
    <header class="lx-head"><div class="lx-slot"></div><span>Work</span><span>Studio</span><span>Notes</span><em>Contact</em></header>
    <div class="lx-page">
      <div class="lx-col">${lines("70%", "92%", "84%", "40%")}<div class="lx-img"></div></div>
      <div class="lx-col">${lines("60%", "88%", "76%")}<div class="lx-img lx-tall"></div></div>
    </div>
  </div>
</div>`,
  },
  {
    id: "home",
    label: "Home screen",
    w: 1280, h: 720,
    html: () => `<div class="lx lx-desk">
  <div class="lx-phone"><div class="lx-screen lx-home">
    <div class="lx-status"><b>9:41</b><span class="lx-island"></span><i></i></div>
    <div class="lx-apps">${Array.from({ length: 20 }, (_, i) => (i === 9 ? '<div class="lx-app lx-me"><div class="lx-slot"></div></div>' : '<i class="lx-app"></i>')).join("")}</div>
    <div class="lx-dock">${'<i class="lx-app"></i>'.repeat(4)}</div>
  </div></div>
</div>`,
  },
  {
    id: "player",
    label: "Player",
    w: 1280, h: 720,
    html: (name) => `<div class="lx lx-desk">
  <div class="lx-video">
    <div class="lx-slot"></div>
    <div class="lx-controls"><span class="lx-play"></span><span class="lx-track"><i></i></span><em>0:03 / 0:12</em></div>
  </div>
  <div class="lx-caption"><b>${name} — brand film</b><span>Intro sequence · 12s</span></div>
</div>`,
  },
  {
    id: "loading",
    label: "Loading",
    w: 1280, h: 720,
    html: () => `<div class="lx lx-desk">
  <div class="lx-window">
    <div class="lx-chrome"><i></i><i></i><i></i><span></span></div>
    <div class="lx-load"><div class="lx-slot"></div><p>Setting up your workspace…</p><span class="lx-progress"><i></i></span></div>
  </div>
</div>`,
  },
  {
    id: "signup",
    label: "Sign up",
    w: 1280, h: 720,
    html: (name) => `<div class="lx lx-desk">
  <div class="lx-card">
    <div class="lx-slot"></div>
    <h3>Create your ${name} account</h3>
    <p>Free for 14 days. No card needed.</p>
    <span class="lx-input">Email address</span>
    <span class="lx-input">Password</span>
    <span class="lx-btn lx-wide">Continue</span>
  </div>
</div>`,
  },
  {
    id: "social",
    label: "Social post",
    w: 1280, h: 720,
    html: (name) => `<div class="lx lx-desk">
  <div class="lx-post">
    <div class="lx-who"><i class="lx-avatar"></i><div><b>${name}</b><span>@${name.toLowerCase().replace(/[^a-z0-9]/g, "")} · 2h</span></div></div>
    <p>Same mark. New material. 🫧</p>
    <div class="lx-media"><div class="lx-slot"></div></div>
    <div class="lx-acts"><span>♡ 2.4k</span><span>↻ 318</span><span>↗</span></div>
  </div>
</div>`,
  },
];
