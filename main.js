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
scene.background = new THREE.Color(0x000000);


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
renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
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
//composer.addPass(bloomPass);


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
  scene.environment = null;

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
// ========== CREAR 7 LÁMPARAS LED ======================
// =====================================================

// --- GEOMETRÍA Y MATERIAL COMPARTIDOS ---
const tuboGeo = new THREE.BoxGeometry(0.1, 0.1, 4);
const tuboMat = new THREE.MeshPhysicalMaterial({
  color: new THREE.Color(1, 1, 1),
  emissive: new THREE.Color(1, 1, 1),
  emissiveIntensity: 20,
  roughness: 0.1,
  metalness: 0.0
});

// --- FUNCIÓN QUE CREA UNA LÁMPARA COMPLETA ---
function crearLampara() {
  const holder = new THREE.Object3D();

  // --- TUBO LED ---
  const tuboLED = new THREE.Mesh(tuboGeo, tuboMat);
  tuboLED.castShadow = false;
  holder.add(tuboLED);

  // --- LUZ RECTANGULAR ---
  const rectLight = new THREE.RectAreaLight(0xffffff, 20, 0.15, 2.5);
  rectLight.position.set(0, 0, 0);
  rectLight.lookAt(0, -1, 0);
  holder.add(rectLight);

  // --- LUZ REAL INTERNA (CON SOMBRAS) ---
  const pointLED = new THREE.PointLight(0xffffff, 4, 12);
  pointLED.castShadow = false;
  pointLED.shadow.mapSize.width = 2048;
  pointLED.shadow.mapSize.height = 2048;
  pointLED.shadow.bias = -0.0005;
  pointLED.position.set(0, 0, 0);
  holder.add(pointLED);

  return holder;
}

// =====================================================
// ======= CREAR Y CONFIGURAR POSICIONES ===============
// =====================================================

const lamparas = []; // ← Guardamos las 7 lámparas aquí

// posiciones iniciales (PUEDES EDITARLAS COMO QUIERAS)
const posicionesIniciales = [
  { x: -7.19, y: 2, z: 0 },
  { x: -6.2, y: 2, z: -3.6 },
  { x: -3.6, y: 2, z: -6.2 },
  { x:  0, y: 2.1, z: -7.23 },
  { x:  3.6, y: 2.2, z: -6.2 },
  { x:  6.2, y: 2.3, z: -3.6 },
  { x:  7.25, y: 2.4, z: 0 },

  { x:  3.6, y: 2.4, z: 6.2 },
  { x:  0, y: 2.4, z: 7.23 },
  { x:  -3.6, y: 2.4, z: 6.2 },
];

// rotaciones iniciales (PUEDES EDITARLAS)
const rotacionesIniciales = [
  { x:Math.PI / 2, y: Math.PI / 1, z: 0 },
  { x: Math.PI / 2, y: Math.PI / 1, z: 0 },
  { x: Math.PI / 2, y: Math.PI / 1, z: 0 },
  { x: Math.PI / 2, y: Math.PI / 1, z: 0 },
  { x: Math.PI / 2, y: Math.PI / 1, z: 0 },
  { x: Math.PI / 2, y: Math.PI / 1, z: 0 },
  { x: Math.PI / 2, y: Math.PI / 1, z: 0 },
  { x: Math.PI / 2, y: Math.PI / 1, z: 0 },
  { x: Math.PI / 2, y: Math.PI / 1, z: 0 },
  { x: Math.PI / 2, y: Math.PI / 1, z: 0 },
];

// CREAR LAS 7 LÁMPARAS
for (let i = 0; i < 10; i++) {
  const lampara = crearLampara();

  // Aplicar posición personalizada
  lampara.position.set(
    posicionesIniciales[i].x,
    posicionesIniciales[i].y,
    posicionesIniciales[i].z
  );

  // Aplicar rotación personalizada
  lampara.rotation.set(
    rotacionesIniciales[i].x,
    rotacionesIniciales[i].y,
    rotacionesIniciales[i].z
  );

  // Agregar a la escena
  scene.add(lampara);

  // Guardar referencia
  lamparas.push(lampara);
}



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
      obj.material.envMapIntensity = 0.3;
    }
  });

  if (gltf.animations.length > 0) {
    mixer = new THREE.AnimationMixer(root);

    let cameraAction = null;
    let modelActions = [];
    let cameraClip = null;
    let modelClips = [];

    // Separar animaciones de cámara y modelo
    gltf.animations.forEach((clip) => {
      const isCameraAnim = clip.tracks.some(t =>
        t.name.toLowerCase().includes("camera")
      );

      if (isCameraAnim) cameraClip = clip;
      else modelClips.push(clip);
    });

    // === ANIMACIÓN DE LA CÁMARA (ES LA QUE CONTROLA TODO) ===
    if (cameraClip) {
      cameraAction = mixer.clipAction(cameraClip);
      cameraAction.setLoop(THREE.LoopRepeat);  // Solo ella hace loop
      cameraAction.clampWhenFinished = false;
      cameraAction.play();
    }

    // === ANIMACIONES DEL MODELO (UNA SOLA VEZ, PERO LUEGO SE REINICIAN MANUALMENTE) ===
    modelClips.forEach((clip) => {
      const action = mixer.clipAction(clip);
      action.setLoop(THREE.LoopOnce);
      action.clampWhenFinished = false;
      action.play();
      modelActions.push(action);
    });

    // === SINCRONIZAR MODELO CUANDO LA CÁMARA LOOP ===
    mixer.addEventListener("loop", (e) => {
      if (e.action === cameraAction) {
        // Reiniciar TODAS las animaciones del modelo
        modelActions.forEach(a => {
          a.reset();
          a.play();
        });
      }
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
