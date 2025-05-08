// js/search.js
import * as THREE from 'https://cdn.jsdelivr.net/npm/three@0.152.2/build/three.module.js';
import { initScene, renderScene, scene, camera, points, paperData } from './main.js';
import Fuse from 'https://cdn.jsdelivr.net/npm/fuse.js@6.6.2/dist/fuse.min.js';
import TWEEN from 'https://cdn.jsdelivr.net/npm/@tweenjs/tween.js@18.6.4/dist/tween.umd.js';

let fuse, selectedIndex=null, trajLines=null;
const raycaster = new THREE.Raycaster();
const mouse = new THREE.Vector2();

async function main() {
  await initScene();
  animate();

  fuse = new Fuse(paperData, { keys: ['title'], threshold: 0.3 });
  document.getElementById('search-btn').onclick = onSearch;
  document.getElementById('traj-toggle').onchange = updateTrajectory;
  window.addEventListener('click', onCanvasClick);
}

function animate() {
  requestAnimationFrame(animate);
  TWEEN.update();
  renderScene();
}

function onSearch() {
  const q = document.getElementById('search-input').value;
  const r = fuse.search(q).slice(0,1);
  if (!r.length) return;
  selectPaper(r[0].refIndex);
}

function onCanvasClick(event) {
  mouse.x = (event.clientX/innerWidth)*2 - 1;
  mouse.y = -(event.clientY/innerHeight)*2 + 1;
  raycaster.setFromCamera(mouse, camera);
  const hits = raycaster.intersectObject(points);
  if (hits.length) selectPaper(hits[0].index);
}

function selectPaper(idx) {
  selectedIndex = idx;
  const p = paperData[idx];
  new TWEEN.Tween(camera.position)
    .to({ x:p.x*100, y:p.y*100, z:p.z*100 + 20 }, 1000)
    .easing(TWEEN.Easing.Cubic.Out)
    .start();
  showInfo(p);
  updateTrajectory();
}

function showInfo(p) {
  const panel = document.getElementById('info-panel');
  panel.innerHTML = `
    <h2>${p.title}</h2>
    <p>${p.abstract?.slice(0,200) || ''}…</p>
    <h3>Related</h3>
    <ul>${p.neighbors.map(i => `<li data-idx="${i}">${paperData[i].title}</li>`).join('')}</ul>
    <h3>Citations</h3>
    <button id="load-cites">Load citing</button>
    <ul id="cites-list"></ul>
  `;
  panel.querySelectorAll('li[data-idx]').forEach(li=>{
    li.onclick = () => selectPaper(+li.dataset.idx);
  });
  panel.querySelector('#load-cites').onclick = loadCitations;
}

async function loadCitations() {
  const p = paperData[selectedIndex];
  const list = document.getElementById('cites-list');
  list.innerHTML = 'Loading…';
  const url = `https://api.openalex.org/works/${encodeURIComponent(p.id)}/citing_works?per_page=5`;
  const res = await fetch(url).then(r=>r.json());
  list.innerHTML = res.results.map(w => 
    `<li><a href="#" data-id="${w.id}">${w.title}</a></li>`
  ).join('');
}

function updateTrajectory() {
  if (trajLines) {
    scene.remove(trajLines);
    trajLines.geometry.dispose();
  }
  if (!document.getElementById('traj-toggle').checked || selectedIndex===null) return;

  const traj = paperData[selectedIndex].author_trajectory || [];
  const pts = traj.map(p=>new THREE.Vector3(p.x*100, p.y*100, p.z*100));
  const geo = new THREE.BufferGeometry().setFromPoints(pts);
  const mat = new THREE.LineBasicMaterial();
  trajLines = new THREE.Line(geo, mat);
  scene.add(trajLines);
}

main();
