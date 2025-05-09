// js/search.js

// 1) Three.js core
import * as THREE from 'https://cdn.jsdelivr.net/npm/three@0.152.2/build/three.module.js';
// 2) OrbitControls via esm.sh
import { OrbitControls } from 'https://esm.sh/three@0.152.2/examples/jsm/controls/OrbitControls.js';
// 3) Fuse.js
import Fuse from 'https://cdn.jsdelivr.net/npm/fuse.js@7.1.0/dist/fuse.mjs';
// 4) Tween.js
import TWEEN from 'https://cdn.jsdelivr.net/npm/@tweenjs/tween.js@18.6.4/dist/tween.esm.js';
// 5) Shared scene setup
import {
  initScene,
  renderScene,
  scene,
  camera,
  renderer,
  points,
  paperData
} from './main.js';

let fuse;
let selectedIndex = null;
let trajLines = null;
let controls;
const raycaster = new THREE.Raycaster();
const mouse     = new THREE.Vector2();

async function main() {
  // Load scene & data
  await initScene();

  // Initialize OrbitControls (use imported class)
  controls = new OrbitControls(camera, renderer.domElement);
  controls.enableDamping = true;
  controls.dampingFactor = 0.05;
  controls.enableZoom = true;
  controls.enablePan = false;

  // Start render + tween loop
  requestAnimationFrame(tick);

  // Setup Fuse.js on loaded paperData
  fuse = new Fuse(paperData, { keys: ['title'], threshold: 0.3 });

  // Wire up UI
  document.getElementById('search-btn').onclick   = onSearch;
  document.getElementById('traj-toggle').onchange = updateTrajectory;
  window.addEventListener('click', onCanvasClick);
}

function tick(time) {
  requestAnimationFrame(tick);
  controls.update();              // update orbit controls
  TWEEN.update(time);
  renderScene();
}

function onSearch() {
  const q = document.getElementById('search-input').value.trim();
  if (!q) return;
  const results = fuse.search(q);
  if (!results.length) return;
  selectPaper(results[0].refIndex);
}

function onCanvasClick(event) {
  // Normalize mouse coords
  const rect = renderer.domElement.getBoundingClientRect();
  mouse.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
  mouse.y = -((event.clientY - rect.top)  / rect.height) * 2 + 1;

  raycaster.setFromCamera(mouse, camera);
  const hits = raycaster.intersectObject(points);
  if (hits.length) selectPaper(hits[0].index);
}

function selectPaper(idx) {
  selectedIndex = idx;
  const p = paperData[idx];

  // Tween camera to paper
  new TWEEN.Tween(camera.position)
    .to({ x: p.x * 100, y: p.y * 100, z: p.z * 100 + 20 }, 800)
    .easing(TWEEN.Easing.Cubic.Out)
    .start();

  showInfo(p);
  updateTrajectory();
}

function showInfo(p) {
  const panel = document.getElementById('info-panel');
  panel.innerHTML = `
    <h2>${p.title}</h2>
    <p>${(p.abstract||'').slice(0,200)}…</p>
    <h3>Related</h3>
    <ul>
      ${p.neighbors.map(i =>
        `<li data-idx="${i}">${paperData[i].title}</li>`
      ).join('')}
    </ul>
    <h3>Citations</h3>
    <button id="load-cites">Load citing</button>
    <ul id="cites-list"></ul>
  `;
  panel.querySelectorAll('li[data-idx]').forEach(li=>{
    li.onclick = () => selectPaper(+li.dataset.idx);
  });
  document.getElementById('load-cites').onclick = loadCitations;
}

async function loadCitations() {
  const p = paperData[selectedIndex];
  const list = document.getElementById('cites-list');
  list.innerHTML = 'Loading…';
  const url = `https://api.openalex.org/works/${encodeURIComponent(p.id)}/citing_works?per_page=5`;
  const res = await fetch(url).then(r=>r.json());
  list.innerHTML = res.results.map(w =>
    `<li>${w.title}</li>`
  ).join('');
}

function updateTrajectory() {
  if (trajLines) {
    scene.remove(trajLines);
    trajLines.geometry.dispose();
    trajLines.material.dispose();
    trajLines = null;
  }
  if (!document.getElementById('traj-toggle').checked || selectedIndex===null) return;

  const traj = paperData[selectedIndex].author_trajectory || [];
  const pts = traj.map(pt => new THREE.Vector3(pt.x*100, pt.y*100, pt.z*100));
  const geo = new THREE.BufferGeometry().setFromPoints(pts);
  const mat = new THREE.LineBasicMaterial({ linewidth: 2 });
  trajLines = new THREE.Line(geo, mat);
  scene.add(trajLines);
}

// top-level state
 let highlight = null;   // <—— new

function selectPaper(idx) {
+  // ── highlight the chosen star ─────────────────────────────
+  if (highlight) {                     // remove previous
+    scene.remove(highlight);
+    highlight.geometry.dispose();
+    highlight.material.dispose();
+  }
+  const p = paperData[idx];
+  const markerGeo = new THREE.SphereGeometry(2.5, 16, 16);   // small sphere
+  const markerMat = new THREE.MeshBasicMaterial({ color: 0xffcc00 });
+  highlight = new THREE.Mesh(markerGeo, markerMat);
+  highlight.position.set(p.x * 100, p.y * 100, p.z * 100);
+  scene.add(highlight);

   selectedIndex = idx;
-  const p = paperData[idx];
   /* … existing tween / info-panel code … */
}


main();