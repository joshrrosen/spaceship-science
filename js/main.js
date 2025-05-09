// js/main.js
import * as THREE from 'https://cdn.jsdelivr.net/npm/three@0.152.2/build/three.module.js';

export let scene, camera, renderer, points, paperData;

/* ------------------------------------------------------------------ */
/*  Star “glow” sprite                                                */
/* ------------------------------------------------------------------ */
function createStarTexture() {
  const size = 64;
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d');

  const grad = ctx.createRadialGradient(
    size / 2, size / 2, 0,
    size / 2, size / 2, size / 2
  );
  grad.addColorStop(0, 'rgba(255,255,255,1)');
  grad.addColorStop(1, 'rgba(255,255,255,0)');
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, size, size);

  return new THREE.CanvasTexture(canvas);
}

/* ------------------------------------------------------------------ */
/*  Scene init (shared by fly + search pages)                         */
/* ------------------------------------------------------------------ */
export async function initScene() {
  /* -- scene & camera --------------------------------------------- */
  scene  = new THREE.Scene();
  camera = new THREE.PerspectiveCamera(75, innerWidth / innerHeight, 0.1, 2000);
  camera.position.set(0, 0, 100);

  /* -- renderer ---------------------------------------------------- */
  renderer = new THREE.WebGLRenderer({ canvas: document.getElementById('canvas') });
  renderer.setSize(innerWidth, innerHeight);

  /* -- load star data --------------------------------------------- */
  const resp = await fetch('data/papers.json');
  if (!resp.ok) {
    console.error('❌  Failed to load data/papers.json – HTTP', resp.status);
    paperData = [];
    return;
  }
  paperData = await resp.json();

  if (!paperData.length) {
    console.warn('⚠️  papers.json is empty – starfield will be blank.');
  }

  /* -- geometry ---------------------------------------------------- */
  const geom = new THREE.BufferGeometry();
  const pos  = new Float32Array(paperData.length * 3);
  paperData.forEach((p, i) => {
    pos[3 * i]     = p.x * 100;
    pos[3 * i + 1] = p.y * 100;
    pos[3 * i + 2] = p.z * 100;
  });
  geom.setAttribute('position', new THREE.BufferAttribute(pos, 3));

  /* -- material ---------------------------------------------------- */
  const mat = new THREE.PointsMaterial({
    size: 1.5,
    map: createStarTexture(),
    transparent: true,
    blending: THREE.AdditiveBlending,
    depthWrite: false,
  });

  points = new THREE.Points(geom, mat);
  scene.add(points);

// ── auto-centre camera ─────────────────────────────────────────────
const box   = new THREE.Box3().setFromObject(points);
const ctr   = new THREE.Vector3();
box.getCenter(ctr);                 // galaxy centre
const size  = box.getSize(new THREE.Vector3()).length();
camera.far  = size * 2;             // extend far-plane
camera.updateProjectionMatrix();
camera.position.copy(ctr).add(new THREE.Vector3(0, 0, size * 0.4));
camera.lookAt(ctr);


  /* -- handle resize ---------------------------------------------- */
  window.addEventListener('resize', () => {
    camera.aspect = innerWidth / innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(innerWidth, innerHeight);
  });
}

/* ------------------------------------------------------------------ */
export function renderScene() {
  renderer.render(scene, camera);
}
