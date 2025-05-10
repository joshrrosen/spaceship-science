// js/search.js
import * as THREE from 'https://cdn.jsdelivr.net/npm/three@0.152.2/build/three.module.js';
import { OrbitControls } from 'https://esm.sh/three@0.152.2/examples/jsm/controls/OrbitControls.js';
import Fuse from 'https://cdn.jsdelivr.net/npm/fuse.js@7.1.0/dist/fuse.mjs';
import TWEEN from 'https://cdn.jsdelivr.net/npm/@tweenjs/tween.js@18.6.4/dist/tween.esm.js';

import {
  initScene, renderScene,
  scene, camera, renderer, points, paperData
} from './main.js';

let fuse;
let selectedIndex = null;
let trajGroup = null;
let highlight  = null;                 // yellow marker sphere
let controls;
const raycaster = new THREE.Raycaster();
const mouse     = new THREE.Vector2();

async function main() {
  await initScene();

  controls = new OrbitControls(camera, renderer.domElement);
  controls.enableDamping = true;

  fuse = new Fuse(paperData, { keys: ['title'], threshold: 0.3 });

  document.getElementById('search-btn').onclick   = onSearch;
  document.getElementById('traj-toggle').onchange = updateTrajectory;
  window.addEventListener('click', onCanvasClick);

  requestAnimationFrame(tick);
}

function tick(t) {
  requestAnimationFrame(tick);
  controls.update();
  TWEEN.update(t);
  renderScene();
}

function onSearch() {
  const q = document.getElementById('search-input').value.trim();
  if (!q) return;
  const hit = fuse.search(q)[0];
  if (hit) selectPaper(hit.refIndex);
}

function onCanvasClick(e) {
  const rect = renderer.domElement.getBoundingClientRect();
  mouse.x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
  mouse.y = -((e.clientY - rect.top)  / rect.height) * 2 + 1;
  raycaster.setFromCamera(mouse, camera);
  const hit = raycaster.intersectObject(points)[0];
  if (hit) selectPaper(hit.index);
}

/* ── central function: fly, highlight, info, trajectory ──────────────── */
function selectPaper(idx) {
  selectedIndex = idx;
  const p = paperData[idx];

  /* highlight star */
  if (highlight) scene.remove(highlight);
  highlight = new THREE.Mesh(
    new THREE.SphereGeometry(2.5, 16, 16),
    new THREE.MeshBasicMaterial({ color: 0xffcc00 })
  );
  highlight.position.set(p.x*100, p.y*100, p.z*100);
  scene.add(highlight);

  /* fly camera */
  new TWEEN.Tween(camera.position)
    .to({ x:p.x*100, y:p.y*100, z:p.z*100+20 }, 800)
    .easing(TWEEN.Easing.Cubic.Out)
    .start();

  showInfo(p);
  updateTrajectory();
}

/* side-panel info */
function showInfo(p) {
  const panel = document.getElementById('info-panel');
  panel.innerHTML = `
    <h2>${p.title}</h2>
    <p>${(p.abstract||'').slice(0,200)}…</p>
    <h3>Related</h3>
    <ul>${p.neighbors.map(i=>`<li data-idx="${i}">${paperData[i].title}</li>`).join('')}</ul>`;
  panel.querySelectorAll('li[data-idx]').forEach(li=>{
    li.onclick = ()=>selectPaper(+li.dataset.idx);
  });
}

/* draw / clear author trajectories */
function updateTrajectory() {
  if (trajGroup) { scene.remove(trajGroup); trajGroup=null; }
  if (!document.getElementById('traj-toggle').checked || selectedIndex===null) return;

  const trajDict = paperData[selectedIndex].author_traj || {};
  const group = new THREE.Group();
  Object.values(trajDict).forEach(arr=>{
    if (arr.length<2) return;
    const pts = arr.map(o=>new THREE.Vector3(o.x*100,o.y*100,o.z*100));
    group.add(new THREE.Line(
      new THREE.BufferGeometry().setFromPoints(pts),
      new THREE.LineBasicMaterial()
    ));
  });
  trajGroup = group;
  scene.add(group);
}

main();
