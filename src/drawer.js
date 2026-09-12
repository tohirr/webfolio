/* the story card: a tile's story — a clip, a few lines, where it lives.
   the cell itself grows to fill the screen, the way an ipad app opens from
   its icon: the surface is clipped to the tile's rectangle and the clip
   eases out to the whole screen while a copy of the cell rides the box,
   scaling up and fading out as the content fades in. closing runs it
   backwards into wherever the tile is now. it is addressed by the hash (#bookmarx),
   so a tile is a plain link, the back button closes it, and the url is
   shareable */

const reduceMotion = matchMedia("(prefers-reduced-motion: reduce)").matches;

const GROW = { duration: 560, easing: "cubic-bezier(0.32, 0.72, 0, 1)", fill: "both" };
const SHRINK = { duration: 440, easing: "cubic-bezier(0.32, 0.72, 0, 1)", fill: "both" };
const TILE_R = 26; // the tile's corner radius

const CLOSE_ICON =
  '<svg viewBox="0 0 16 16" width="14" height="14" fill="none" stroke="currentColor" ' +
  'stroke-width="1.6" stroke-linecap="round" aria-hidden="true">' +
  '<path d="M3 3l10 10M13 3L3 13"/></svg>';

export function mountDrawer(details) {
  const root = document.createElement("div");
  root.className = "drawer";
  root.hidden = true;
  root.innerHTML =
    '<div class="drawer-back"></div>' +
    '<div class="drawer-panel">' +
    '<article class="drawer-card" role="dialog" aria-modal="true" aria-labelledby="drawer-title" tabindex="-1">' +
    `<button class="drawer-close" type="button" aria-label="close">${CLOSE_ICON}</button>` +
    '<div class="drawer-body"></div>' +
    "</article></div>";
  document.body.appendChild(root);

  const app = document.getElementById("app");
  const back = root.querySelector(".drawer-back");
  const panel = root.querySelector(".drawer-panel");
  const card = root.querySelector(".drawer-card");
  const body = root.querySelector(".drawer-body");
  const closeBtn = root.querySelector(".drawer-close");

  let current = null; // the open detail's name
  let opener = null; // the tile that opened it, to grow from and hand focus back
  let pushed = false; // did opening add a history entry we can pop
  let anim = null; // the running clip animation, if any
  let scene = null; // { el, mod, opener, cleanup } — the live field behind a scenic card

  /* a detail with `scene` (a lazy module whose mount(el, opts) draws a
     backdrop) gets the live piece behind its card, blurred by css, picked up
     at the tile's own camera; on close the camera goes back to the tile */
  const openScene = (d) => {
    if (!d.scene) return;
    const el = document.createElement("div");
    el.className = "drawer-scene";
    el.setAttribute("aria-hidden", "true");
    root.insertBefore(el, panel);
    const mine = (scene = { el, cleanup: null });
    d.scene().then((mod) => {
      if (scene !== mine) return; // closed before the module came
      mine.mod = mod;
      const from = mod.handles?.get(opener)?.cam;
      mine.cleanup = mod.mount(el, { scene: true, from });
    });
  };
  const closeScene = () => {
    if (!scene) return;
    const { el, mod, cleanup } = scene;
    const back = mod?.handles?.get(el)?.cam;
    const tile = mod?.handles?.get(opener);
    if (back && tile) tile.cam = back;
    cleanup?.();
    el.remove();
    scene = null;
  };

  /* the clip: muted, looping, inline, no controls. reduced motion (and the
     wait for the first frame) shows the poster instead */
  const media = (m) =>
    !m
      ? ""
      : reduceMotion && m.poster
        ? `<img class="drawer-media" src="${m.poster}" alt="${m.alt || ""}" />`
        : `<video class="drawer-media" autoplay muted loop playsinline preload="metadata"` +
          (m.poster ? ` poster="${m.poster}"` : "") +
          (m.alt ? ` aria-label="${m.alt}"` : "") +
          (m.ratio ? ` style="aspect-ratio:${m.ratio}"` : "") +
          `>${m.src.map((u) => `<source src="${u}" type="video/${u.split(".").pop()}">`).join("")}</video>`;

  const render = (d) =>
    media(d.media) +
    `<p class="drawer-head"><span class="ink" id="drawer-title">${d.title}</span>` +
    (d.sub ? `<br><span class="dim">${d.sub}</span>` : "") +
    "</p>" +
    d.body +
    (d.links?.length
      ? '<p class="drawer-links">' +
        d.links
          .map((l) => `<a href="${l.href}" target="_blank" rel="noreferrer">${l.label} ↗</a>`)
          .join("") +
        "</p>"
      : "");

  /* a rectangle as a clip on the full-viewport panel */
  const clipOf = (r, radius) =>
    `inset(${r.top}px ${innerWidth - r.right}px ${innerHeight - r.bottom}px ${r.left}px round ${radius})`;
  const tileClip = () => {
    let r = opener?.getBoundingClientRect();
    // no tile on screen (a deep link with the row scrolled away): grow from the middle
    if (!r || !r.width) {
      return clipOf({ top: innerHeight / 2, bottom: innerHeight / 2, left: innerWidth / 2, right: innerWidth / 2 }, "0px");
    }
    // while the page is pushed back the tile measures 4% small; undo that so
    // the card folds into where the tile will be once the page comes forward
    if (app.classList.contains("pushed")) {
      const a = app.getBoundingClientRect();
      const cx = a.left + a.width / 2, cy = a.top + a.height / 2, k = 1 / 0.96;
      r = { left: cx + (r.left - cx) * k, right: cx + (r.right - cx) * k, top: cy + (r.top - cy) * k, bottom: cy + (r.bottom - cy) * k };
    }
    return clipOf(r, `${TILE_R}px`);
  };
  const cardClip = () => clipOf(card.getBoundingClientRect(), getComputedStyle(card).borderRadius);

  /* the icon: a copy of the cell, laid over the box at the tile's rectangle.
     opening, it scales up toward the screen and fades out as the content
     fades in; closing, it comes back the other way. canvases are copied
     pixel for pixel so live pieces don't clone blank */
  let icon = null;
  const makeIcon = () => {
    icon?.remove();
    icon = null;
    if (!opener) return null;
    const r = opener.getBoundingClientRect();
    if (!r.width) return null;
    const el = opener.cloneNode(true);
    el.removeAttribute("data-mount");
    el.removeAttribute("href");
    el.removeAttribute("aria-label");
    el.setAttribute("aria-hidden", "true");
    el.querySelectorAll("[id]").forEach((n) => n.removeAttribute("id"));
    const src = opener.querySelectorAll("canvas"), dst = el.querySelectorAll("canvas");
    src.forEach((c, i) => {
      const d = dst[i];
      if (!d) return;
      d.width = c.width;
      d.height = c.height;
      try { d.getContext("2d").drawImage(c, 0, 0); } catch { /* tainted or lost — stays blank */ }
    });
    el.classList.add("drawer-icon");
    el.style.cssText = `position:absolute;left:${r.left}px;top:${r.top}px;width:${r.width}px;height:${r.height}px;margin:0`;
    panel.appendChild(el);
    icon = el;
    return el;
  };
  /* where the icon goes when the screen is open: centred, scaled to the width */
  const iconFar = (el) => {
    const r = el.getBoundingClientRect(), c = card.getBoundingClientRect();
    const k = Math.max(c.width / r.width, 1.6);
    const dx = c.left + c.width / 2 - (r.left + r.width / 2);
    const dy = c.top + c.height / 2 - (r.top + r.height / 2);
    return `translate(${dx}px, ${dy}px) scale(${k})`;
  };

  const open = (name) => {
    const d = details[name];
    if (!d || current === name) return;
    current = name;
    opener = document.querySelector(`[data-mount="${name}"]`);
    body.innerHTML = render(d);
    anim?.cancel();
    root.hidden = false;
    root.classList.remove("landed", "closing");
    root.classList.toggle("scenic", !!d.scene);
    closeScene();
    openScene(d);
    document.body.style.overflow = "hidden";
    card.scrollTop = 0;

    if (reduceMotion) {
      root.classList.add("open", "landed");
      closeBtn.focus({ preventScroll: true });
      return;
    }
    // start clipped to the tile, then let the frame land before growing
    panel.style.clipPath = tileClip();
    requestAnimationFrame(() =>
      requestAnimationFrame(() => {
        root.classList.add("open");
        app.classList.add("pushed");
        anim = panel.animate([{ clipPath: tileClip() }, { clipPath: cardClip() }], GROW);
        const ic = makeIcon();
        if (ic) {
          // the move takes the box's snappy curve; the fade is slow and
          // holds on before it lets go, so the cell is still there as the
          // screen takes over
          ic.animate([{ transform: "none" }, { transform: iconFar(ic) }], GROW);
          ic.animate([{ opacity: 1 }, { opacity: 1, offset: 0.2 }, { opacity: 0 }], {
            duration: GROW.duration + 160,
            easing: "ease-in-out",
            fill: "both",
          }).onfinish = () => ic.remove();
        }
        anim.onfinish = () => {
          root.classList.add("landed");
          panel.style.clipPath = "";
          closeBtn.focus({ preventScroll: true });
        };
      }),
    );
  };

  const close = () => {
    if (!current) return;
    current = null;
    root.querySelector("video")?.pause();
    document.body.style.overflow = "";
    const target = reduceMotion ? "" : tileClip(); // measured while still pushed
    app.classList.remove("pushed");
    const done = () => {
      root.hidden = true;
      root.classList.remove("open", "landed", "closing");
      panel.style.clipPath = "";
      closeScene();
      opener?.focus({ preventScroll: true });
      opener = null;
    };
    if (reduceMotion) return done();
    anim?.cancel();
    // content first, then the box folds back into the tile's slot
    root.classList.add("closing");
    root.classList.remove("open", "landed");
    anim = panel.animate([{ clipPath: cardClip() }, { clipPath: target }], {
      ...SHRINK,
      delay: 90,
    });
    const ic = makeIcon();
    if (ic) {
      ic.animate([{ transform: iconFar(ic) }, { transform: "none" }], { ...SHRINK, delay: 90 });
      ic.animate([{ opacity: 0 }, { opacity: 1, offset: 0.8 }, { opacity: 1 }], {
        ...SHRINK,
        easing: "ease-in-out",
        delay: 90,
      });
    }
    anim.onfinish = () => {
      icon?.remove();
      icon = null;
      done();
    };
  };

  /* the hash is the state */
  const route = () => {
    const name = decodeURIComponent(location.hash.slice(1));
    if (details[name]) open(name);
    else close();
  };
  addEventListener("hashchange", (e) => {
    pushed = !new URL(e.oldURL).hash && !!new URL(e.newURL).hash;
    route();
  });
  route();

  /* closing from the ui: pop the entry we added, else just clear the hash */
  const dismiss = () => {
    if (!current) return;
    if (pushed) history.back();
    else {
      history.replaceState(null, "", location.pathname + location.search);
      close();
    }
  };
  closeBtn.addEventListener("click", dismiss);
  back.addEventListener("click", dismiss);
  panel.addEventListener("click", (e) => {
    if (e.target === panel) dismiss(); // the panel's own margin is the backdrop too
  });
  addEventListener("keydown", (e) => {
    if (e.key === "Escape" && current) dismiss();
  });

  /* on a phone the card can be pulled down to close, once its scroll is at
     the top. it follows the finger, and lets go past a threshold */
  let y0 = -1, dy = 0;
  card.addEventListener("touchstart", (e) => {
    y0 = card.scrollTop <= 0 ? e.touches[0].clientY : -1;
    dy = 0;
  }, { passive: true });
  card.addEventListener("touchmove", (e) => {
    if (y0 < 0 || !root.classList.contains("landed")) return;
    dy = Math.max(0, e.touches[0].clientY - y0);
    if (dy > 0) {
      e.preventDefault();
      card.style.transform = `translateY(${dy}px)`;
      card.style.transition = "none";
    }
  }, { passive: false });
  const release = () => {
    if (y0 < 0) return;
    y0 = -1;
    card.style.transition = "";
    card.style.transform = "";
    if (dy > 110) dismiss();
    dy = 0;
  };
  card.addEventListener("touchend", release);
  card.addEventListener("touchcancel", release);
}
