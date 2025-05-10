// js/main.js
import * as THREE from 'https://cdn.jsdelivr.net/npm/three@0.152.2/build/three.module.js';

export let scene, camera, renderer, points, paperData;
export let galaxyCenter = new THREE.Vector3();   // <- exported for fly page

/* ── Star “glow” sprite ──────────────────────────────────────────────── */
function createStarTexture() {
  const s = 64, cv = document.createElement('canvas');
  cv.width = cv.height = s;
  const ctx = cv.getContext('2d');
  const g = ctx.createRadialGradient(s/2, s/2, 0, s/2, s/2, s/2);
  g.addColorStop(0,'rgba(255,255,255,1)');
  g.addColorStop(1,'rgba(255,255,255,0)');
  ctx.fillStyle = g; ctx.fillRect(0,0,s,s);
  return new THREE.CanvasTexture(cv);
}

/* ── Scene init (shared by fly + search pages) ───────────────────────── */
export async function initScene() {
  scene  = new THREE.Scene();
  camera = new THREE.PerspectiveCamera(75, innerWidth/innerHeight, 0.1, 2000);

  renderer = new THREE.WebGLRenderer({ canvas: document.getElementById('canvas') });
  renderer.setSize(innerWidth, innerHeight);

  const resp = await fetch('data/papers.json');
  paperData = resp.ok ? await resp.json() : [];
  if (!paperData.length) console.warn('papers.json is empty');

  /* build point cloud */
  const geom = new THREE.BufferGeometry();
  const pos  = new Float32Array(paperData.length*3);
  paperData.forEach((p,i)=>{
    pos[3*i]   = p.x*100;
    pos[3*i+1] = p.y*100;
    pos[3*i+2] = p.z*100;
  });
  geom.setAttribute('position', new THREE.BufferAttribute(pos,3));
  points = new THREE.Points(geom,new THREE.PointsMaterial({
    size:1.5, map:createStarTexture(), transparent:true,
    blending:THREE.AdditiveBlending, depthWrite:false
  }));
  scene.add(points);

  /* auto-centre camera */
  const box  = new THREE.Box3().setFromObject(points);
  box.getCenter(galaxyCenter);                 // <- store globally
  const size = box.getSize(new THREE.Vector3()).length();
  camera.far = size*2; camera.updateProjectionMatrix();
  camera.position.copy(galaxyCenter).add(new THREE.Vector3(0,0,size*0.4));
  camera.lookAt(galaxyCenter);

  /* resize handler */
  window.addEventListener('resize',()=>{
    camera.aspect = innerWidth/innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(innerWidth, innerHeight);
  });
}

/* ── render helper ───────────────────────────────────────────────────── */
export function renderScene() { renderer.render(scene, camera); }
