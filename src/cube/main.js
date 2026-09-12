/* /cube/ — a rubik's cube made of ice with a cat frozen inside. the cat is
   a voxel model split across the 27 cubies; every cubie is a rounded block
   of transmissive glass carrying its slice of the cat. turning layers
   scatters the cat, turning them back reassembles it. drag a face to turn
   the layer under it, drag the space around the cube to orbit. */

import "./cube.css";
import * as THREE from "three";
import { RoundedBoxGeometry } from "three/examples/jsm/geometries/RoundedBoxGeometry.js";
import { RoomEnvironment } from "three/examples/jsm/environments/RoomEnvironment.js";
import { mergeGeometries } from "three/examples/jsm/utils/BufferGeometryUtils.js";
import { buildCat, N } from "./cat.js";

const reduceMotion = matchMedia("(prefers-reduced-motion: reduce)").matches;
const darkMedia = matchMedia("(prefers-color-scheme: dark)");

const app = document.getElementById("cube");
app.innerHTML =
  '<canvas class="view"></canvas>' +
  '<header class="top">' +
  '<a class="back" href="/">← tohirr</a>' +
  '<span class="title"><b>ice cube</b> · a cat, frozen</span>' +
  "</header>" +
  '<p class="hint">drag a face to turn it · drag around the cube to orbit</p>' +
  '<footer class="bottom">' +
  '<button class="pill" type="button" data-a="scramble">scramble</button>' +
  '<span class="pill stat">0 moves</span>' +
  '<button class="pill" type="button" data-a="reset">reset</button>' +
  "</footer>";

const canvas = app.querySelector(".view");
const hint = app.querySelector(".hint");
const stat = app.querySelector(".stat");
const scrambleBtn = app.querySelector('[data-a="scramble"]');
const resetBtn = app.querySelector('[data-a="reset"]');

/* ---- renderer, scene, light ------------------------------------------------ */

let renderer;
try {
  renderer = new THREE.WebGLRenderer({ canvas, antialias: true, powerPreference: "high-performance" });
} catch {
  app.innerHTML = '<div class="state"><p>webgl is unavailable here — the ice needs it.</p></div>';
  throw new Error("no webgl");
}
renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.05;
renderer.outputColorSpace = THREE.SRGBColorSpace;

const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(28, 1, 0.1, 100);
camera.position.set(0, 0, 11.5);
camera.lookAt(0, 0, 0);

/* the studio: a room environment for the glass to reflect, and a soft
   vertical sweep behind it, which is also what the glass refracts */
const pmrem = new THREE.PMREMGenerator(renderer);
scene.environment = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;
pmrem.dispose();

const sweep = (dark) => {
  const c = document.createElement("canvas");
  c.width = 4;
  c.height = 256;
  const g = c.getContext("2d");
  const grad = g.createLinearGradient(0, 0, 0, 256);
  if (dark) {
    grad.addColorStop(0, "#1d2129");
    grad.addColorStop(1, "#2a2530");
  } else {
    grad.addColorStop(0, "#dfe8f6");
    grad.addColorStop(0.55, "#eeeef6");
    grad.addColorStop(1, "#f7e3ea");
  }
  g.fillStyle = grad;
  g.fillRect(0, 0, 4, 256);
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  return t;
};
const applyTheme = () => {
  scene.background?.dispose?.();
  scene.background = sweep(darkMedia.matches);
};
applyTheme();
darkMedia.addEventListener("change", applyTheme);

const key = new THREE.DirectionalLight(0xffffff, 1.6);
key.position.set(4, 7, 6);
scene.add(key);
const fill = new THREE.DirectionalLight(0xdfe8ff, 0.5);
fill.position.set(-5, -2, 4);
scene.add(fill);
scene.add(new THREE.HemisphereLight(0xffffff, 0x8890a0, 0.5));

/* ---- the cube --------------------------------------------------------------- */

const GAP = 1.045; // cubie pitch: a hair more than the block so seams show
const BLOCK = 0.98;
const VOX = (BLOCK * 0.92) / (N / 3); // voxel edge; the cat sits a little inside the ice

const root = new THREE.Group();
scene.add(root);
root.quaternion.setFromEuler(new THREE.Euler(0.42, -0.6, 0));

const iceGeo = new RoundedBoxGeometry(BLOCK, BLOCK, BLOCK, 5, 0.09);
const ice = new THREE.MeshPhysicalMaterial({
  color: 0xffffff,
  transmission: 1,
  thickness: 0.9,
  ior: 1.33,
  roughness: 0.14,
  metalness: 0,
  clearcoat: 1,
  clearcoatRoughness: 0.08,
  attenuationColor: new THREE.Color(0xcfe3f5),
  attenuationDistance: 2.2,
  envMapIntensity: 1.1,
  specularIntensity: 1,
});
if ("dispersion" in ice) ice.dispersion = 0.12;

/* ?bare — see the cat without the ice, for tuning the model */
const query = new URLSearchParams(location.search);
if (query.has("bare")) {
  ice.transmission = 0;
  ice.transparent = true;
  ice.opacity = 0.12;
  ice.depthWrite = false;
}

const voxMat = new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.85, metalness: 0 });

/* every voxel of the cat, bucketed by the cubie it falls in */
const cat = buildCat(); // Map "i,j,k" → hex colour
const buckets = new Map();
const unitBox = new THREE.BoxGeometry(VOX, VOX, VOX);
for (const [key, hex] of cat) {
  const [i, j, k] = key.split(",").map(Number);
  const c = [i, j, k].map((v) => Math.floor(v / (N / 3)) - 1);
  const id = c.join(",");
  if (!buckets.has(id)) buckets.set(id, []);
  const g = unitBox.clone();
  const local = [i, j, k].map((v) => (v % (N / 3) - (N / 3 - 1) / 2) * VOX);
  g.translate(local[0], local[1], local[2]);
  const col = new THREE.Color(hex);
  const arr = new Float32Array(g.attributes.position.count * 3);
  for (let n = 0; n < arr.length; n += 3) {
    arr[n] = col.r;
    arr[n + 1] = col.g;
    arr[n + 2] = col.b;
  }
  g.setAttribute("color", new THREE.BufferAttribute(arr, 3));
  buckets.get(id).push(g);
}

const cubies = [];
const shells = [];
for (let x = -1; x <= 1; x++)
  for (let y = -1; y <= 1; y++)
    for (let z = -1; z <= 1; z++) {
      const g = new THREE.Group();
      g.position.set(x * GAP, y * GAP, z * GAP);
      g.userData.home = new THREE.Vector3(x, y, z);
      const shell = new THREE.Mesh(iceGeo, ice);
      shell.userData.cubie = g;
      g.add(shell);
      shells.push(shell);
      const parts = buckets.get(`${x},${y},${z}`);
      if (parts?.length) {
        const merged = mergeGeometries(parts, false);
        g.add(new THREE.Mesh(merged, voxMat));
      }
      root.add(g);
      cubies.push(g);
    }

/* ---- turning ---------------------------------------------------------------- */

const AXES = [new THREE.Vector3(1, 0, 0), new THREE.Vector3(0, 1, 0), new THREE.Vector3(0, 0, 1)];
const pivot = new THREE.Group();
root.add(pivot);

let turning = null; // { axis, dir, t0, dur, members, done }
const queue = [];
let moves = 0;

const ease = (t) => 1 - Math.pow(1 - t, 3);

/* the cubie's grid cell — its position in root space, rounded */
const cell = (c) => c.position.clone().divideScalar(GAP).round();

const startTurn = (axis, layer, dir, dur) => {
  const members = cubies.filter((c) => cell(c)[["x", "y", "z"][axis]] === layer);
  pivot.rotation.set(0, 0, 0);
  pivot.updateMatrixWorld(true);
  for (const c of members) pivot.attach(c);
  turning = { axis, dir, layer, t0: performance.now(), dur, members };
};

const finishTurn = () => {
  const { axis, dir, members } = turning;
  pivot.rotation.set(0, 0, 0);
  pivot.rotateOnAxis(AXES[axis], (dir * Math.PI) / 2);
  pivot.updateMatrixWorld(true);
  for (const c of members) {
    root.attach(c);
    c.position.divideScalar(GAP).round().multiplyScalar(GAP);
    // snap to the nearest right-angle orientation
    const m = new THREE.Matrix4().makeRotationFromQuaternion(c.quaternion);
    for (let i = 0; i < 16; i++) m.elements[i] = Math.round(m.elements[i]);
    c.quaternion.setFromRotationMatrix(m);
  }
  turning = null;
  if (queue.length) {
    const q = queue.shift();
    startTurn(q.axis, q.layer, q.dir, q.dur);
  } else {
    scrambleBtn.disabled = resetBtn.disabled = false;
    updateStat();
  }
};

const enqueue = (axis, layer, dir, dur) => {
  if (turning) queue.push({ axis, layer, dir, dur });
  else startTurn(axis, layer, dir, dur);
};

const isSolved = () =>
  cubies.every((c) => {
    if (!cell(c).equals(c.userData.home)) return false;
    const m = new THREE.Matrix4().makeRotationFromQuaternion(c.quaternion);
    const e = m.elements;
    return Math.abs(e[0] - 1) < 1e-3 && Math.abs(e[5] - 1) < 1e-3 && Math.abs(e[10] - 1) < 1e-3;
  });

const updateStat = () => {
  const solved = isSolved() && moves > 0;
  stat.classList.toggle("solved", solved);
  stat.textContent = solved ? `solved · ${moves}` : `${moves} move${moves === 1 ? "" : "s"}`;
};

const scramble = () => {
  moves = 0;
  scrambleBtn.disabled = resetBtn.disabled = true;
  let last = -1;
  for (let n = 0; n < 18; n++) {
    let axis;
    do axis = (Math.random() * 3) | 0;
    while (axis === last);
    last = axis;
    enqueue(axis, ((Math.random() * 3) | 0) - 1, Math.random() < 0.5 ? 1 : -1, reduceMotion ? 0 : 95);
  }
  updateStat();
};

const reset = () => {
  queue.length = 0;
  if (turning) finishTurn();
  for (const c of cubies) {
    c.position.copy(c.userData.home).multiplyScalar(GAP);
    c.quaternion.identity();
  }
  moves = 0;
  updateStat();
};

/* dev hook: turn synchronously and ask if it is solved, for tests */
if (import.meta.env.DEV)
  window.__cube = {
    turn: (axis, layer, dir) => {
      startTurn(axis, layer, dir, 0);
      finishTurn();
      moves++;
      updateStat();
    },
    solved: isSolved,
    cells: () => cubies.map((c) => cell(c).toArray().join(",")),
    busy: () => !!turning || queue.length > 0,
  };

scrambleBtn.addEventListener("click", scramble);
resetBtn.addEventListener("click", reset);

/* ---- pointer: turn a face, or orbit the whole thing -------------------------- */

const ray = new THREE.Raycaster();
const ndc = new THREE.Vector2();
let drag = null; // { kind: "face"|"orbit", ... }
let idle = true; // spinning slowly until touched
let spin = { x: 0, y: 0 }; // orbit velocity, for a little momentum

const toNDC = (e) => {
  const r = canvas.getBoundingClientRect();
  ndc.set(((e.clientX - r.left) / r.width) * 2 - 1, -((e.clientY - r.top) / r.height) * 2 + 1);
  return ndc;
};

/* snap a vector to its dominant axis, as a signed unit vector */
const dominant = (v) => {
  const a = [Math.abs(v.x), Math.abs(v.y), Math.abs(v.z)];
  const i = a.indexOf(Math.max(...a));
  const out = new THREE.Vector3();
  out.setComponent(i, Math.sign(v.getComponent(i)) || 1);
  return { axis: i, v: out };
};

canvas.addEventListener("pointerdown", (e) => {
  if (e.button !== 0 && e.pointerType === "mouse") return;
  canvas.setPointerCapture(e.pointerId);
  canvas.classList.add("grabbing");
  idle = false;
  spin = { x: 0, y: 0 };
  ray.setFromCamera(toNDC(e), camera);
  const hit = turning ? null : ray.intersectObjects(shells, false)[0];
  if (hit) {
    const nWorld = hit.face.normal.clone().transformDirection(hit.object.matrixWorld);
    const nLocal = nWorld.clone().applyQuaternion(root.quaternion.clone().invert());
    const n = dominant(nLocal);
    drag = {
      kind: "face",
      cubie: hit.object.userData.cubie,
      plane: new THREE.Plane().setFromNormalAndCoplanarPoint(nWorld, hit.point),
      p0: hit.point.clone(),
      n: n.v,
      nAxis: n.axis,
      sx: e.clientX,
      sy: e.clientY,
    };
  } else {
    drag = { kind: "orbit", x: e.clientX, y: e.clientY, t: performance.now() };
  }
});

canvas.addEventListener("pointermove", (e) => {
  if (!drag) return;
  if (drag.kind === "orbit") {
    const dx = e.clientX - drag.x;
    const dy = e.clientY - drag.y;
    orbit(dx * 0.008, dy * 0.008);
    spin = { x: dy * 0.008, y: dx * 0.008 };
    drag.x = e.clientX;
    drag.y = e.clientY;
    return;
  }
  if (Math.hypot(e.clientX - drag.sx, e.clientY - drag.sy) < 10) return;
  ray.setFromCamera(toNDC(e), camera);
  const p = new THREE.Vector3();
  if (!ray.ray.intersectPlane(drag.plane, p)) return;
  const dWorld = p.sub(drag.p0);
  const dLocal = dWorld.applyQuaternion(root.quaternion.clone().invert());
  dLocal.setComponent(drag.nAxis, 0); // never along the normal
  if (dLocal.length() < 0.05) return;
  const d = dominant(dLocal).v;
  const axisV = new THREE.Vector3().crossVectors(drag.n, d);
  const { axis, v } = dominant(axisV);
  const layer = cell(drag.cubie).getComponent(axis);
  enqueue(axis, layer, v.getComponent(axis), reduceMotion ? 0 : 240);
  moves++;
  hint.classList.add("gone");
  updateStat();
  drag = null;
});

const release = () => {
  drag = null;
  canvas.classList.remove("grabbing");
};
canvas.addEventListener("pointerup", release);
canvas.addEventListener("pointercancel", release);

/* rotate the cube in world space: yaw about world y, pitch about world x */
const qy = new THREE.Quaternion();
const qx = new THREE.Quaternion();
const orbit = (yaw, pitch) => {
  qy.setFromAxisAngle(AXES[1], yaw);
  qx.setFromAxisAngle(AXES[0], pitch);
  root.quaternion.premultiply(qy).premultiply(qx);
};

/* ---- frame ------------------------------------------------------------------ */

const resize = () => {
  const w = app.clientWidth, h = app.clientHeight;
  renderer.setSize(w, h, false);
  camera.aspect = w / h;
  camera.updateProjectionMatrix();
  // keep the whole cube in frame on a narrow screen
  camera.position.z = w < h ? 11.5 * Math.min(1.6, h / w) : 11.5;
};
addEventListener("resize", resize);
resize();

let last = performance.now();
const frame = (now) => {
  const dt = Math.min(0.05, (now - last) / 1000);
  last = now;

  if (turning) {
    const t = turning.dur ? Math.min(1, (now - turning.t0) / turning.dur) : 1;
    pivot.rotation.set(0, 0, 0);
    pivot.rotateOnAxis(AXES[turning.axis], (turning.dir * Math.PI * ease(t)) / 2);
    if (t >= 1) finishTurn();
  }

  if (idle && !reduceMotion) orbit(0.18 * dt, Math.sin(now / 2600) * 0.04 * dt);
  else if (!drag && (Math.abs(spin.x) > 1e-4 || Math.abs(spin.y) > 1e-4)) {
    orbit(spin.y, spin.x);
    spin.x *= 0.9;
    spin.y *= 0.9;
  }

  renderer.render(scene, camera);
  requestAnimationFrame(frame);
};
requestAnimationFrame(frame);
