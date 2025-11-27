// ======== IMPORTS (r129) ========
import * as THREE from "https://cdn.skypack.dev/three@0.129.0/build/three.module.js";
import { GLTFLoader } from "https://cdn.skypack.dev/three@0.129.0/examples/jsm/loaders/GLTFLoader.js";
import { RGBELoader } from "https://cdn.skypack.dev/three@0.129.0/examples/jsm/loaders/RGBELoader.js";
import { OrbitControls } from "https://cdn.skypack.dev/three@0.129.0/examples/jsm/controls/OrbitControls.js";
import { Sky } from "https://cdn.skypack.dev/three@0.129.0/examples/jsm/objects/Sky.js";
import Stats from "https://cdn.skypack.dev/three@0.129.0/examples/jsm/libs/stats.module.js";

import { RectAreaLightUniformsLib } from "https://cdn.skypack.dev/three@0.129.0/examples/jsm/lights/RectAreaLightUniformsLib.js";
import { RectAreaLightHelper } from "https://cdn.skypack.dev/three@0.129.0/examples/jsm/helpers/RectAreaLightHelper.js";

// *** REFLECTOR ***
import { Reflector } from "https://cdn.skypack.dev/three@0.129.0/examples/jsm/objects/Reflector.js";

RectAreaLightUniformsLib.init();

// === POST-PROCESSING ===
import { EffectComposer } from "https://cdn.skypack.dev/three@0.129.0/examples/jsm/postprocessing/EffectComposer.js";
import { RenderPass } from "https://cdn.skypack.dev/three@0.129.0/examples/jsm/postprocessing/RenderPass.js";
import { UnrealBloomPass } from "https://cdn.skypack.dev/three@0.129.0/examples/jsm/postprocessing/UnrealBloomPass.js";


// ==========================================================
// === CONFIGURACIÓN DE OBJETOS QUE PARPADEAN ===============
// ==========================================================
const colorConfigs = [
  {
    name: "llanta_derecha",
    frameStart: 365,
    frameEnd: 430,
    colorAlt: new THREE.Color(0, 0.2, 1),
    mesh: null,
    originalColor: null
  },
  {
    name: "rin_derecho",
    frameStart: 365,
    frameEnd: 430,
    colorAlt: new THREE.Color(0, 0.2, 1),
    mesh: null,
    originalColor: null
  },
  {
    name: "disco_derecho",
    frameStart: 365,
    frameEnd: 430,
    colorAlt: new THREE.Color(0, 0.2, 1),
    mesh: null,
    originalColor: null
  },
  {
    name: "pastilla_derecha",
    frameStart: 365,
    frameEnd: 430,
    colorAlt: new THREE.Color(0, 0.2, 1),
    mesh: null,
    originalColor: null
  }
];


// ========= CONTENEDOR =========
const container = document.getElementById("canvas-container");
if (!container) throw new Error("Falta <div id='canvas-container'> en tu HTML");


// ========= ESCENA =========
const scene = new THREE.Scene();
scene.background = new THREE.Color(0x242424);


// ========= CÁMARA =========
const camera = new THREE.PerspectiveCamera(
  75,
  window.innerWidth / window.innerHeight,
  0.1,
  500
);
camera.position.set(0, 1, 7);


// ========= RENDERER =========
const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setPixelRatio(Math.min(devicePixelRatio, 4));
renderer.setSize(window.innerWidth, window.innerHeight);

renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;

container.appendChild(renderer.domElement);


// =====================================================
// === POST-PROCESSING =================================
// =====================================================
const composer = new EffectComposer(renderer);
const renderPass = new RenderPass(scene, camera);
composer.addPass(renderPass);

const bloomPass = new UnrealBloomPass(
  new THREE.Vector2(window.innerWidth, window.innerHeight),
  0.2,
  0.4,
  0.0
);
composer.addPass(bloomPass);


// ========= ORBIT CONTROLS =========
const controls = new OrbitControls(camera, renderer.domElement);
controls.enableDamping = true;
controls.dampingFactor = 0.03;
controls.target.set(0, 1, 0);
controls.update();


// ========= HDRI =========
const pmremGenerator = new THREE.PMREMGenerator(renderer);
pmremGenerator.compileEquirectangularShader();

new RGBELoader().load("hdr.hdr", (hdrMap) => {
  const envMap = pmremGenerator.fromEquirectangular(hdrMap).texture;
  scene.environment = envMap;

  hdrMap.dispose();
  pmremGenerator.dispose();
});


// ========= CIELO =========
const sky = new Sky();
sky.scale.setScalar(450000);

const skyUniforms = sky.material.uniforms;
skyUniforms["turbidity"].value = 20;
skyUniforms["rayleigh"].value = 1;
skyUniforms["mieCoefficient"].value = 0.005;
skyUniforms["mieDirectionalG"].value = 0.9;

const sun = new THREE.Vector3();
const elevation = 50;
const azimuth = -90;

const phi = THREE.MathUtils.degToRad(90 - elevation);
const theta = THREE.MathUtils.degToRad(azimuth);

sun.setFromSphericalCoords(1, phi, theta);
skyUniforms["sunPosition"].value.copy(sun);

// =====================================================
// ========== ELIMINAR LUZ DIRECCIONAL =================
// =====================================================
// ❌ Ya no usamos DirectionalLight para sombras
// ❌ Se elimina todo el bloque anterior
//     dirLight.castShadow = true
//     scene.add(dirLight);
// =====================================================


// =====================================================
// ========= TUBO LED (MATERIAL EMISIVO) ===============
// =====================================================
const tuboGeo = new THREE.BoxGeometry(0.1, 0.1, 2.5);
const tuboMat = new THREE.MeshPhysicalMaterial({
  color: new THREE.Color(1, 1, 1),
  emissive: new THREE.Color(1, 1, 1),
  emissiveIntensity: 12,
  roughness: 0.1,
  metalness: 0.0
});

const tuboLED = new THREE.Mesh(tuboGeo, tuboMat);
tuboLED.castShadow = true;       // 🔥 El tubo proyecta sombras al tener luz interna
tuboLED.receiveShadow = false;


// =====================================================
// ===== CONTENEDOR PARA ROTAR TUBO + LUZ ===============
// =====================================================
const tuboHolder = new THREE.Object3D();
tuboHolder.position.set(0, 2.5, 0);
scene.add(tuboHolder);

tuboHolder.add(tuboLED);


// =====================================================
// === RECTANGULAR LIGHT (solo efecto visual) ==========
// =====================================================
// ❗ RecAreaLight no genera sombras en THREE.JS
// ❗ La mantenemos porque ilumina muy bien la escena
const rectLight = new THREE.RectAreaLight(0xffffff, 25, 0.15, 2.5);
rectLight.position.set(0, 0, 0);
rectLight.lookAt(0, -1, 0);
tuboHolder.add(rectLight);


// =====================================================
// ===== LUZ REAL INTERNA QUE SÍ GENERA SOMBRAS =========
// =====================================================
// ✔ Esta luz es la que realmente proyecta las sombras
// ✔ Muy suave para simular luminosidad del LED real
const pointLED = new THREE.PointLight(0xffffff, 1.8, 6);
pointLED.castShadow = true;
pointLED.shadow.mapSize.width = 2048;
pointLED.shadow.mapSize.height = 2048;
pointLED.shadow.bias = -0.0005;

// Colocarla exactamente dentro del tubo
pointLED.position.set(0, 0, 0);

tuboHolder.add(pointLED);


// =====================================================
// ===== ROTACIÓN DEL TUBO (OPCIONAL) ===================
// =====================================================
tuboHolder.rotation.y = Math.PI / 2;



// ========= PISO =========
const floorGeo = new THREE.PlaneGeometry(80, 70);
const textureLoader = new THREE.TextureLoader();

const displacementMap = textureLoader.load("marmol_disp.png");
displacementMap.wrapS = displacementMap.wrapT = THREE.RepeatWrapping;
displacementMap.repeat.set(5, 5);

const normalMap = textureLoader.load("marmol_normal.jpg");
normalMap.wrapS = normalMap.wrapT = THREE.RepeatWrapping;
normalMap.repeat.set(5, 5);

const roughnessMap = textureLoader.load("marmol_rough.jpg");
roughnessMap.wrapS = roughnessMap.wrapT = THREE.RepeatWrapping;
roughnessMap.repeat.set(5, 5);

const ceramicMaterial = new THREE.MeshPhysicalMaterial({
  color: new THREE.Color(0, 0, 0),
  roughness: 0.9,
  metalness: 0.7,
  roughnessMap,
  displacementMap,
  displacementScale: 0.02,
  transparent: true,
  opacity: 0.65,
  clearcoat: 0,
  clearcoatRoughness: 1
});

ceramicMaterial.envMapIntensity = 0.7;

const ceramicLayer = new THREE.Mesh(floorGeo, ceramicMaterial);
ceramicLayer.rotation.x = -Math.PI / 2;
ceramicLayer.position.y = -0.1;
ceramicLayer.receiveShadow = true;
scene.add(ceramicLayer);


// =====================================================
// ================= REFLECTOR (REEMPLAZA AGUA) ========
// =====================================================
const reflectorGeo = new THREE.PlaneGeometry(80, 70);

const reflector = new Reflector(reflectorGeo, {
  clipBias: 0.003,
  textureWidth: window.innerWidth * devicePixelRatio,
  textureHeight: window.innerHeight * devicePixelRatio,
  color: 0x222222
});

reflector.rotation.x = -Math.PI / 2;
reflector.position.y = -0.12;

scene.add(reflector);


// ========= CARGA MODELO =========
const gltfLoader = new GLTFLoader();
let mixer = null;
let cameraGLB = null;
const clock = new THREE.Clock();

gltfLoader.load("./scene.glb", (gltf) => {
  const root = gltf.scene;
  scene.add(root);

  colorConfigs.forEach(cfg => {
    const obj = root.getObjectByName(cfg.name);
    if (obj) {
      cfg.mesh = obj;
      cfg.originalColor = obj.material.color.clone();
    }
  });

  root.traverse((obj) => {
    if (obj.isCamera) {
      cameraGLB = obj;
      controls.enabled = false;

      cameraGLB.fov = 75;
      cameraGLB.aspect = window.innerWidth / window.innerHeight;
      cameraGLB.near = 0.1;
      cameraGLB.far = 500;
      cameraGLB.updateProjectionMatrix();
    }

    if (obj.isMesh && obj.material) {
      obj.castShadow = true;
      obj.receiveShadow = true;
      obj.material.envMapIntensity = 0.7;
    }
  });

  if (gltf.animations.length > 0) {
    mixer = new THREE.AnimationMixer(root);

    let cameraClip = null;
    let modelClips = [];

    gltf.animations.forEach((clip) => {
      const isCameraAnim = clip.tracks.some(t =>
        t.name.toLowerCase().includes("camera")
      );

      if (isCameraAnim) cameraClip = clip;
      else modelClips.push(clip);
    });

    if (cameraClip) {
      const action = mixer.clipAction(cameraClip);
      action.setLoop(THREE.LoopOnce);
      action.clampWhenFinished = true;
      action.play();
    }

    modelClips.forEach((clip) => {
      const action = mixer.clipAction(clip);
      action.setLoop(THREE.LoopOnce);
      action.clampWhenFinished = true;
      action.play();
    });
  }
});


// ========= STATS =========
const stats = new Stats();
stats.showPanel(0);
document.body.appendChild(stats.dom);


// =====================================================
// === PARPADEO AZUL SOBRE COLOR ORIGINAL ==============
// =====================================================
function smoothBlink(cfg, frame, fps) {
  const durationFrames = cfg.frameEnd - cfg.frameStart;
  const totalBlinks = 3;
  const blinkDuration = durationFrames / totalBlinks;

  const localFrame = frame - cfg.frameStart;
  let blinkIndex = Math.floor(localFrame / blinkDuration);

  if (blinkIndex >= totalBlinks) {
    cfg.mesh.material.color.copy(cfg.originalColor);
    return;
  }

  let phase = (localFrame % blinkDuration) / blinkDuration;
  let intensity = Math.sin(phase * Math.PI);

  cfg.mesh.material.color.copy(cfg.originalColor).lerp(cfg.colorAlt, intensity);
}


// ========= LOOP =========
function animate() {
  stats.begin();
  requestAnimationFrame(animate);

  const delta = clock.getDelta();
  if (mixer) mixer.update(delta);

  if (mixer) {
    const tiempo = mixer.time;
    const fps = 24;
    const frame = Math.floor(tiempo * fps);

    colorConfigs.forEach(cfg => {
      if (!cfg.mesh || !cfg.mesh.material) return;

      if (frame >= cfg.frameStart && frame <= cfg.frameEnd) {
        smoothBlink(cfg, frame, fps);
      } else {
        cfg.mesh.material.color.copy(cfg.originalColor);
      }
    });
  }

  if (!cameraGLB) controls.update();

  renderPass.camera = cameraGLB || camera;
  composer.render();

  stats.end();
}

animate();


// ========= RESIZE =========
window.addEventListener("resize", () => {
  camera.aspect = innerWidth / innerHeight;
  camera.updateProjectionMatrix();

  if (cameraGLB) {
    cameraGLB.aspect = innerWidth / innerHeight;
    cameraGLB.updateProjectionMatrix();
  }

  renderer.setSize(innerWidth, innerHeight);
  composer.setSize(innerWidth, innerHeight);
  bloomPass.setSize(innerWidth, innerHeight);
});
