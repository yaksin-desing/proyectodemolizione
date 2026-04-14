import * as THREE from "three";
import { GLTFLoader } from "three/addons/loaders/GLTFLoader.js";
import { OrbitControls } from "three/addons/controls/OrbitControls.js";
import Stats from "three/addons/libs/stats.module.js";
import { RectAreaLightUniformsLib } from "three/addons/lights/RectAreaLightUniformsLib.js";
import { RectAreaLightHelper } from "three/addons/helpers/RectAreaLightHelper.js";
import { EffectComposer } from "three/addons/postprocessing/EffectComposer.js";
import { RenderPass } from "three/addons/postprocessing/RenderPass.js";
import { UnrealBloomPass } from "three/addons/postprocessing/UnrealBloomPass.js";

import { loaderSetProgress, loaderDone } from './loader.js';

RectAreaLightUniformsLib.init();


// =====================================================
// DETECCIÓN DE DISPOSITIVO Y PERFIL DE CALIDAD
// =====================================================
const isMobile = /Android|iPhone|iPad|iPod|Mobile/i.test(navigator.userAgent)
  || window.innerWidth < 768;

const QUALITY = {
  pixelRatio:    isMobile ? 1.5   : Math.min(devicePixelRatio, 2),
  renderScale:   isMobile ? 0.77  : 1.0,
  shadows:       isMobile ? false : true,
  shadowMapSize: isMobile ? 512   : 1024,
  lightHelpers:  isMobile ? true : true,
  throttle30fps: isMobile ? true  : false,
};

console.log(`[Quality] Modo: ${isMobile ? 'MOVIL' : 'DESKTOP'}`, QUALITY);


// =====================================================
// CONTROL DE INICIO
// =====================================================
let ready = false;


// =====================================================
// CONFIG OBJ PARPADEO
// =====================================================
const colorConfigs = [
  { name: "llanta_derecha",  frameStart: 365, frameEnd: 430, colorAlt: new THREE.Color(0, 0.2, 1), mesh: null, originalColor: null },
  { name: "rin_derecho",     frameStart: 365, frameEnd: 430, colorAlt: new THREE.Color(0, 0.2, 1), mesh: null, originalColor: null },
  { name: "disco_derecho",   frameStart: 365, frameEnd: 430, colorAlt: new THREE.Color(0, 0.2, 1), mesh: null, originalColor: null },
  { name: "pastilla_derecha",frameStart: 365, frameEnd: 430, colorAlt: new THREE.Color(0, 0.2, 1), mesh: null, originalColor: null },
];


// ========= CONTENEDOR =========
const container = document.getElementById("canvas-container");
if (!container) throw new Error("Falta <div id='canvas-container'> en tu HTML");


// ========= ESCENA =========
const scene = new THREE.Scene();
scene.background = new THREE.Color(0x000000);


// ========= CAMARA =========
const camera = new THREE.PerspectiveCamera(40, window.innerWidth / window.innerHeight, 0.1, 500);
camera.position.set(0, 1, 10);


// ========= RENDERER =========
const renderer = new THREE.WebGLRenderer({
  antialias: !isMobile,
  alpha: true,
  powerPreference: 'high-performance',
});

renderer.setPixelRatio(QUALITY.pixelRatio);

const renderW = Math.floor(window.innerWidth  * QUALITY.renderScale);
const renderH = Math.floor(window.innerHeight * QUALITY.renderScale);
renderer.setSize(renderW, renderH, false);
renderer.domElement.style.width  = '100%';
renderer.domElement.style.height = '100%';

renderer.shadowMap.enabled = QUALITY.shadows;
renderer.shadowMap.type    = QUALITY.shadows ? THREE.PCFSoftShadowMap : THREE.BasicShadowMap;

container.appendChild(renderer.domElement);


// ========= POST-PROCESSING =========
const composer   = new EffectComposer(renderer);
const renderPass = new RenderPass(scene, camera);
composer.addPass(renderPass);

const bloomPass = new UnrealBloomPass(new THREE.Vector2(renderW, renderH), 0.2, 0.1, 0.3);
// composer.addPass(bloomPass);


// ========= ORBIT CONTROLS =========
const controls = new OrbitControls(camera, renderer.domElement);
controls.enableDamping = true;
controls.dampingFactor = 0.03;
controls.target.set(0, 1, 0);
controls.update();


// ========= LUCES RECT AREA =========
function makeRectLight(w, h, px, py, pz, rx, ry, rz) {
  const light  = new THREE.RectAreaLight(0xffffff, 10, w, h);
  const holder = new THREE.Object3D();
  holder.add(light);
  holder.position.set(px, py, pz);
  holder.rotation.set(rx, ry, rz);
  scene.add(holder);
  if (QUALITY.lightHelpers) {
    light.add(new RectAreaLightHelper(light));
  }
  return light;
}

makeRectLight(17, 3,  0, 4, -5,  Math.PI / -2, 0, Math.PI);
makeRectLight(17, 3,  0, 4,  0,  Math.PI / -2, 0, Math.PI);
makeRectLight(17, 3,  0, 4,  5,  Math.PI / -2, 0, Math.PI);


// ========= PISO =========
const floorGeo = new THREE.PlaneGeometry(50, 50);
const textureLoader = new THREE.TextureLoader();
let ceramicMaterial;

if (isMobile) {
  ceramicMaterial = new THREE.MeshStandardMaterial({
    color: 0x181818,
    roughness: 0.9,
    metalness: 0.7,
    transparent: true,
    opacity: 0.7,
  });
} else {
  const displacementMap = textureLoader.load("marmol_disp.png");
  displacementMap.wrapS = displacementMap.wrapT = THREE.RepeatWrapping;
  displacementMap.repeat.set(5, 5);

  const normalMap = textureLoader.load("marmol_normal.jpg");
  normalMap.wrapS = normalMap.wrapT = THREE.RepeatWrapping;
  normalMap.repeat.set(5, 5);

  const roughnessMap = textureLoader.load("marmol_rough.jpg");
  roughnessMap.wrapS = roughnessMap.wrapT = THREE.RepeatWrapping;
  roughnessMap.repeat.set(5, 5);

  ceramicMaterial = new THREE.MeshPhysicalMaterial({
    color: 0x181818,
    roughness: 0.9,
    metalness: 0.7,
    roughnessMap,
    displacementMap,
    displacementScale: 0.02,
    transparent: true,
    opacity: 0.7,
    clearcoat: 0,
    clearcoatRoughness: 1,
    envMapIntensity: 0,
  });
}

const ceramicLayer = new THREE.Mesh(floorGeo, ceramicMaterial);
ceramicLayer.rotation.x = -Math.PI / 2;
ceramicLayer.position.y = -0.1;
ceramicLayer.receiveShadow = false;
scene.add(ceramicLayer);


// ========= CARGA MODELO =========
const gltfLoader = new GLTFLoader();
let mixer     = null;
let cameraGLB = null;
const clock   = new THREE.Clock();

gltfLoader.load(
  "./escenaparaproyectofrancesco2.glb",

  (gltf) => {
    const root = gltf.scene;
    scene.add(root);

    colorConfigs.forEach(cfg => {
      const obj = root.getObjectByName(cfg.name);
      if (obj) { cfg.mesh = obj; cfg.originalColor = obj.material.color.clone(); }
    });

    root.traverse((obj) => {
      if (obj.isCamera) {
        cameraGLB = obj;
        controls.enabled = false;
        cameraGLB.fov    = 75;
        cameraGLB.aspect = window.innerWidth / window.innerHeight;
        cameraGLB.near   = 0.1;
        cameraGLB.far    = 500;
        cameraGLB.updateProjectionMatrix();
      }

      if (obj.isMesh) {
        obj.castShadow    = QUALITY.shadows;
        obj.receiveShadow = QUALITY.shadows;

        if (isMobile && obj.material) {
          const isBlinkMesh = colorConfigs.some(c => c.name === obj.name);
          if (!isBlinkMesh && obj.material.isMeshPhysicalMaterial) {
            const old = obj.material;
            obj.material = new THREE.MeshStandardMaterial({
              color:     old.color,
              roughness: old.roughness,
              metalness: old.metalness,
              map:       old.map       || null,
              normalMap: old.normalMap || null,
            });
          }
        }
      }
    });

    if (gltf.animations.length > 0) {
      mixer = new THREE.AnimationMixer(root);
      let cameraAction = null;
      let modelActions = [];
      let cameraClip   = null;
      let modelClips   = [];

      gltf.animations.forEach((clip) => {
        const isCameraAnim = clip.tracks.some(t => t.name.toLowerCase().includes("camera"));
        if (isCameraAnim) cameraClip = clip;
        else modelClips.push(clip);
      });

      if (cameraClip) {
        cameraAction = mixer.clipAction(cameraClip);
        cameraAction.setLoop(THREE.LoopRepeat);
        cameraAction.clampWhenFinished = false;
        cameraAction.play();
      }

      modelClips.forEach((clip) => {
        const action = mixer.clipAction(clip);
        action.setLoop(THREE.LoopOnce);
        action.clampWhenFinished = false;
        action.play();
        modelActions.push(action);
      });

      mixer.addEventListener("loop", (e) => {
        if (e.action === cameraAction) {
          modelActions.forEach(a => { a.reset(); a.play(); });
        }
      });
    }

    renderPass.camera = cameraGLB || camera;

    setTimeout(() => {
      clock.getDelta();
      ready = true;
      clock.start();
      loaderDone();
    }, 0);
  },

  (xhr) => {
    if (xhr.lengthComputable) loaderSetProgress((xhr.loaded / xhr.total) * 100);
  },

  (err) => {
    console.error('Error cargando el modelo:', err);
  }
);


// ========= STATS =========
const stats = new Stats();
stats.showPanel(0);
document.body.appendChild(stats.dom);


// =====================================================
// PARPADEO AZUL
// =====================================================
function smoothBlink(cfg, frame) {
  const durationFrames = cfg.frameEnd - cfg.frameStart;
  const totalBlinks    = 3;
  const blinkDuration  = durationFrames / totalBlinks;
  const localFrame     = frame - cfg.frameStart;
  const blinkIndex     = Math.floor(localFrame / blinkDuration);

  if (blinkIndex >= totalBlinks) {
    cfg.mesh.material.color.copy(cfg.originalColor);
    return;
  }
  const phase     = (localFrame % blinkDuration) / blinkDuration;
  const intensity = Math.sin(phase * Math.PI);
  cfg.mesh.material.color.copy(cfg.originalColor).lerp(cfg.colorAlt, intensity);
}


// =====================================================
// THROTTLE 30 FPS (solo movil)
// =====================================================
let lastFrameTime = 0;
const FRAME_MIN_MS = QUALITY.throttle30fps ? 1000 / 30 : 0;


// ========= LOOP =========
function animate(timestamp) {
  requestAnimationFrame(animate);

  if (QUALITY.throttle30fps && (timestamp - lastFrameTime < FRAME_MIN_MS)) return;
  lastFrameTime = timestamp;

  stats.begin();

  const delta = clock.getDelta();

  if (ready && mixer) {
    mixer.update(delta);
    const fps   = 24;
    const frame = Math.floor(mixer.time * fps);

    colorConfigs.forEach(cfg => {
      if (!cfg.mesh || !cfg.mesh.material) return;
      if (frame >= cfg.frameStart && frame <= cfg.frameEnd) {
        smoothBlink(cfg, frame);
      } else {
        cfg.mesh.material.color.copy(cfg.originalColor);
      }
    });
  }

  if (!cameraGLB) controls.update();
  composer.render();
  stats.end();
}

requestAnimationFrame(animate);


// ========= RESIZE =========
window.addEventListener("resize", () => {
  const w = window.innerWidth;
  const h = window.innerHeight;

  camera.aspect = w / h;
  camera.updateProjectionMatrix();

  if (cameraGLB) {
    cameraGLB.aspect = w / h;
    cameraGLB.updateProjectionMatrix();
  }

  const rw = Math.floor(w * QUALITY.renderScale);
  const rh = Math.floor(h * QUALITY.renderScale);
  renderer.setSize(rw, rh, false);
  composer.setSize(rw, rh);
  bloomPass.setSize(rw, rh);
});