import { useEffect, useRef } from "react";
import * as THREE from "three";

/**
 * A small self-contained Three.js scene: a wireframe cube arena with an
 * autonomous snake threading through the volume toward a gem — a nod to
 * colubrid (colubrid.tohirr.xyz). Pure three.js so it matches the game's own
 * stack. Cleans up its GL context on unmount, pauses when the tab/section is
 * hidden, and renders a single static frame when the user prefers reduced motion.
 */
function SnakeHero() {
  const mountRef = useRef(null);

  useEffect(() => {
    const mount = mountRef.current;
    if (!mount) return;

    // Bail gracefully if WebGL isn't available — the section just stays empty.
    let renderer;
    try {
      renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    } catch {
      return;
    }

    const reduceMotion = window.matchMedia(
      "(prefers-reduced-motion: reduce)"
    ).matches;

    const N = 7; // grid cells per axis
    const CELL = 1; // world units per cell
    const HALF = (N * CELL) / 2;

    const scene = new THREE.Scene();

    const camera = new THREE.PerspectiveCamera(38, 1, 0.1, 100);
    const camRadius = 13;

    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.setSize(mount.clientWidth, mount.clientHeight, false);
    mount.appendChild(renderer.domElement);
    renderer.domElement.style.width = "100%";
    renderer.domElement.style.height = "100%";
    renderer.domElement.style.display = "block";

    // --- Arena: wireframe cube -------------------------------------------
    const arena = new THREE.LineSegments(
      new THREE.EdgesGeometry(new THREE.BoxGeometry(N, N, N)),
      new THREE.LineBasicMaterial({ color: 0x1e293b, transparent: true, opacity: 0.55 })
    );
    scene.add(arena);

    // --- Lights ----------------------------------------------------------
    scene.add(new THREE.AmbientLight(0xffffff, 0.7));
    const key = new THREE.DirectionalLight(0xffffff, 1.1);
    key.position.set(6, 9, 7);
    scene.add(key);

    // --- Helpers ---------------------------------------------------------
    const toWorld = (c) => c * CELL - HALF + CELL / 2;
    const randCell = () => Math.floor(Math.random() * N);
    const randPos = () => ({ x: randCell(), y: randCell(), z: randCell() });

    // --- Food gem --------------------------------------------------------
    const gem = new THREE.Mesh(
      new THREE.OctahedronGeometry(0.42),
      new THREE.MeshStandardMaterial({
        color: 0xf59e0b,
        emissive: 0xb45309,
        emissiveIntensity: 0.6,
        roughness: 0.3,
        metalness: 0.1,
      })
    );
    scene.add(gem);

    // --- Snake -----------------------------------------------------------
    const segMat = new THREE.MeshStandardMaterial({
      color: 0x10b981,
      roughness: 0.4,
      metalness: 0.05,
    });
    const headMat = new THREE.MeshStandardMaterial({
      color: 0x34d399,
      emissive: 0x059669,
      emissiveIntensity: 0.35,
      roughness: 0.35,
    });
    const segGeo = new THREE.BoxGeometry(0.78, 0.78, 0.78);

    let snake = [{ x: 3, y: 3, z: 3 }];
    let dir = { x: 1, y: 0, z: 0 };
    let food = randPos();
    const meshes = [];

    const ensureMeshes = () => {
      while (meshes.length < snake.length) {
        const m = new THREE.Mesh(segGeo, segMat);
        scene.add(m);
        meshes.push(m);
      }
      while (meshes.length > snake.length) {
        const m = meshes.pop();
        scene.remove(m);
      }
      meshes.forEach((m, i) => (m.material = i === 0 ? headMat : segMat));
    };
    ensureMeshes();

    const placeGem = () => {
      gem.position.set(toWorld(food.x), toWorld(food.y), toWorld(food.z));
    };
    placeGem();

    // Greedy, self-avoiding-ish step toward the food, staying in bounds.
    const step = () => {
      const head = snake[0];
      const occupied = new Set(snake.map((s) => `${s.x},${s.y},${s.z}`));
      const axes = ["x", "y", "z"];

      const candidates = [];
      for (const axis of axes) {
        for (const s of [1, -1]) {
          const d = { x: 0, y: 0, z: 0 };
          d[axis] = s;
          const nx = head.x + d.x;
          const ny = head.y + d.y;
          const nz = head.z + d.z;
          if (nx < 0 || nx >= N || ny < 0 || ny >= N || nz < 0 || nz >= N)
            continue;
          // Avoid instant 180° reversals.
          if (d.x === -dir.x && d.y === -dir.y && d.z === -dir.z) continue;
          const key = `${nx},${ny},${nz}`;
          const dist =
            Math.abs(food.x - nx) +
            Math.abs(food.y - ny) +
            Math.abs(food.z - nz);
          candidates.push({ d, nx, ny, nz, key, dist, hits: occupied.has(key) });
        }
      }

      let choices = candidates.filter((c) => !c.hits);
      if (choices.length === 0) choices = candidates; // trapped: allow anything valid
      if (choices.length === 0) {
        // Fully boxed in — reset to a fresh short snake.
        snake = [{ x: 3, y: 3, z: 3 }];
        dir = { x: 1, y: 0, z: 0 };
        return;
      }
      // Mostly beeline to food, occasionally wander so it feels alive.
      choices.sort((a, b) => a.dist - b.dist);
      const pick =
        Math.random() < 0.8 || choices.length === 1
          ? choices[0]
          : choices[Math.floor(Math.random() * choices.length)];

      dir = pick.d;
      const nextHead = { x: pick.nx, y: pick.ny, z: pick.nz };
      snake.unshift(nextHead);

      if (nextHead.x === food.x && nextHead.y === food.y && nextHead.z === food.z) {
        // eat + grow, respawn food off the body
        do {
          food = randPos();
        } while (snake.some((s) => s.x === food.x && s.y === food.y && s.z === food.z));
        placeGem();
        if (snake.length > 18) snake.pop(); // cap length so it stays readable
      } else {
        snake.pop();
      }
      ensureMeshes();
    };

    // Segment interpolation state (world-space lerp between ticks).
    let prev = snake.map((s) => new THREE.Vector3(toWorld(s.x), toWorld(s.y), toWorld(s.z)));
    const syncTargets = () => {
      // grow prev to match
      while (prev.length < snake.length) prev.push(prev[prev.length - 1].clone());
      while (prev.length > snake.length) prev.pop();
    };

    const TICK = 190; // ms per grid move
    let last = performance.now();
    let acc = 0;
    let running = true;
    let raf = 0;

    const renderStatic = () => {
      camera.position.set(camRadius * 0.75, camRadius * 0.55, camRadius * 0.75);
      camera.lookAt(0, 0, 0);
      meshes.forEach((m, i) =>
        m.position.set(toWorld(snake[i].x), toWorld(snake[i].y), toWorld(snake[i].z))
      );
      renderer.render(scene, camera);
    };

    const animate = (now) => {
      raf = requestAnimationFrame(animate);
      if (!running) return;

      const dt = now - last;
      last = now;
      acc += dt;

      // advance the sim in fixed ticks
      while (acc >= TICK) {
        acc -= TICK;
        prev = snake.map(
          (s) => new THREE.Vector3(toWorld(s.x), toWorld(s.y), toWorld(s.z))
        );
        step();
        syncTargets();
      }

      const t = Math.min(acc / TICK, 1);
      meshes.forEach((m, i) => {
        const target = new THREE.Vector3(
          toWorld(snake[i].x),
          toWorld(snake[i].y),
          toWorld(snake[i].z)
        );
        const from = prev[i] || target;
        m.position.lerpVectors(from, target, t);
      });

      // gem gentle spin + bob
      gem.rotation.y = now * 0.0018;
      gem.rotation.x = now * 0.0011;
      gem.scale.setScalar(1 + Math.sin(now * 0.004) * 0.08);

      // slow camera orbit
      const a = now * 0.00012;
      camera.position.set(
        Math.cos(a) * camRadius,
        camRadius * 0.5 + Math.sin(now * 0.0003) * 1.5,
        Math.sin(a) * camRadius
      );
      camera.lookAt(0, 0, 0);
      arena.rotation.y = -a * 0.15;

      renderer.render(scene, camera);
    };

    const resize = () => {
      const w = mount.clientWidth;
      const h = mount.clientHeight;
      if (!w || !h) return;
      renderer.setSize(w, h, false);
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
    };
    resize();
    const ro = new ResizeObserver(resize);
    ro.observe(mount);

    // Pause when the section scrolls out of view or the tab is hidden.
    const io = new IntersectionObserver(
      ([entry]) => {
        running = entry.isIntersecting && !document.hidden;
        last = performance.now();
      },
      { threshold: 0.05 }
    );
    io.observe(mount);
    const onVis = () => {
      running = !document.hidden;
      last = performance.now();
    };
    document.addEventListener("visibilitychange", onVis);

    // Always paint one frame so the scene shows immediately (no blank flash
    // if the tab loads backgrounded or the section starts off-screen).
    renderStatic();
    if (!reduceMotion) {
      raf = requestAnimationFrame(animate);
    }

    return () => {
      cancelAnimationFrame(raf);
      ro.disconnect();
      io.disconnect();
      document.removeEventListener("visibilitychange", onVis);
      renderer.dispose();
      segGeo.dispose();
      gem.geometry.dispose();
      gem.material.dispose();
      segMat.dispose();
      headMat.dispose();
      arena.geometry.dispose();
      arena.material.dispose();
      if (renderer.domElement.parentNode === mount)
        mount.removeChild(renderer.domElement);
    };
  }, []);

  return (
    <div
      ref={mountRef}
      aria-hidden="true"
      className="w-full h-full"
      style={{ minHeight: "100%" }}
    />
  );
}

export default SnakeHero;
