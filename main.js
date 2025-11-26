// ======== IMPORTS (r129) ========
import * as THREE from "https://cdn.skypack.dev/three@0.129.0/build/three.module.js";
import { GLTFLoader } from "https://cdn.skypack.dev/three@0.129.0/examples/jsm/loaders/GLTFLoader.js";
import { RGBELoader } from "https://cdn.skypack.dev/three@0.129.0/examples/jsm/loaders/RGBELoader.js";
import { OrbitControls } from "https://cdn.skypack.dev/three@0.129.0/examples/jsm/controls/OrbitControls.js";
import { Sky } from "https://cdn.skypack.dev/three@0.129.0/examples/jsm/objects/Sky.js";
import Stats from "https://cdn.skypack.dev/three@0.129.0/examples/jsm/libs/stats.module.js";

// === POST-PROCESSING ===
import { EffectComposer } from "https://cdn.skypack.dev/three@0.129.0/examples/jsm/postprocessing/EffectComposer.js";
import { RenderPass } from "https://cdn.skypack.dev/three@0.129.0/examples/jsm/postprocessing/RenderPass.js";
import { UnrealBloomPass } from "https://cdn.skypack.dev/three@0.129.0/examples/jsm/postprocessing/UnrealBloomPass.js";

// ==========================================================
// === SISTEMA DE CONFIGURACIÓN DE CAMBIO DE COLOR =========
// ==========================================================
const colorConfigs = [
  {
    name: "llanta_derecha",
    frameStart: 365,
    frameEnd: 430,
    colorBase: new THREE.Color(0, 0, 0),
    colorAlt: new THREE.Color(0, 0.2, 1),
    mesh: null
  },
  {
    name: "rin_derecho",
    frameStart: 365,
    frameEnd: 430,
    colorBase: new THREE.Color(1, 1, 1),
    colorAlt: new THREE.Color(0, 0.2, 1),
    mesh: null
  },
  {
    name: "disco_derecho",
    frameStart: 365,
    frameEnd: 430,
    colorBase: new THREE.Color(1, 1, 1),
    colorAlt: new THREE.Color(0, 0.2, 1),
    mesh: null
  },
  {
    name: "pastilla_derecha",
    frameStart: 365,
    frameEnd: 430,
    colorBase: new THREE.Color(1, 1, 1),
    colorAlt: new THREE.Color(0, 0.2, 1),
    mesh: null
  }
];


// ========= CONTENEDOR =========
const container = document.getElementById("canvas-container");
if (!container) throw new Error("Falta <div id='canvas-container'> en tu HTML");

// ========= ESCENA =========
const scene = new THREE.Scene();
scene.background = new THREE.Color(0xffffff);

// ========= CÁMARA POR DEFECTO =========
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
// === POST-PROCESSING: BLOOM + DOF ====================
// =====================================================
const composer = new EffectComposer(renderer);

// Render base
const renderPass = new RenderPass(scene, camera);
composer.addPass(renderPass);

// Bloom
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
const esAndroid = /android/i.test(navigator.userAgent);

// if (!esAndroid) {
  const pmremGenerator = new THREE.PMREMGenerator(renderer);
  pmremGenerator.compileEquirectangularShader();

  new RGBELoader()
    .load("hdri.hdr", (hdrMap) => {
      const envMap = pmremGenerator.fromEquirectangular(hdrMap).texture;
      scene.environment = envMap;

      hdrMap.dispose();
      pmremGenerator.dispose();
    });
// }

// ========= CIELO =========
const sky = new Sky();
sky.scale.setScalar(450000);
scene.add(sky);

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

// ========= LUZ =========
const dirLight = new THREE.DirectionalLight(0xffffff, 0.3);
dirLight.position.set(7, 5.9, 17);
dirLight.castShadow = true;

dirLight.shadow.mapSize.width = 2048;
dirLight.shadow.mapSize.height = 2048;
dirLight.shadow.camera.near = 0.5;
dirLight.shadow.camera.far = 150;
dirLight.shadow.camera.left = -30;
dirLight.shadow.camera.right = 30;
dirLight.shadow.camera.top = 30;
dirLight.shadow.camera.bottom = -30;
dirLight.shadow.bias = -0.0005;

scene.add(dirLight);

// ========= HELPERS =========
scene.add(new THREE.DirectionalLightHelper(dirLight, 0));
scene.add(new THREE.CameraHelper(dirLight.shadow.camera));

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
  color: new THREE.Color(1, 1, 1),
  roughness: 1,
  metalness: 0,
  roughnessMap,
  displacementMap,
  displacementScale: 0.07,
  clearcoat: 0,
  clearcoatRoughness: 1
});

ceramicMaterial.envMapIntensity = 0.5;

const ceramicLayer = new THREE.Mesh(floorGeo, ceramicMaterial);
ceramicLayer.rotation.x = -Math.PI / 2;
ceramicLayer.position.y = -0.1;
ceramicLayer.receiveShadow = true;
scene.add(ceramicLayer);

// ========= CARGA MODELO =========
const gltfLoader = new GLTFLoader();
let mixer = null;
let cameraGLB = null;
const clock = new THREE.Clock();

gltfLoader.load("./scene.glb", (gltf) => {
  const root = gltf.scene;
  scene.add(root);

  // === VINCULAR OBJETOS POR NOMBRE ===
  colorConfigs.forEach(cfg => {
    const obj = root.getObjectByName(cfg.name);
    if (obj) cfg.mesh = obj;
    else console.warn("No se encontró objeto:", cfg.name);
  });

  // Detectar cámara del GLB
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
      obj.material.envMapIntensity = 0.2;
    }
  });

  // ========= ANIMACIONES =========
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
// === FUNCIÓN: 3 PARPADEOS SUAVES =====================
// =====================================================
function smoothBlink(cfg, frame, fps) {

  const durationFrames = cfg.frameEnd - cfg.frameStart; 
  const totalBlinks = 3;

  const blinkDuration = durationFrames / totalBlinks;  

  const localFrame = frame - cfg.frameStart;
  let blinkIndex = Math.floor(localFrame / blinkDuration);

  if (blinkIndex >= totalBlinks) {
    cfg.mesh.material.color.copy(cfg.colorBase);
    return;
  }

  let phase = (localFrame % blinkDuration) / blinkDuration;

  let intensity = Math.sin(phase * Math.PI);

  cfg.mesh.material.color.copy(cfg.colorBase).lerp(cfg.colorAlt, intensity);
}



// ========= LOOP =========
function animate() {
  stats.begin();
  requestAnimationFrame(animate);

  const delta = clock.getDelta();
  if (mixer) mixer.update(delta);

  // === CAMBIO DE COLOR POR FRAME =======
  if (mixer) {
    const tiempo = mixer.time;
    const fps = 24;
    const frame = Math.floor(tiempo * fps);

    colorConfigs.forEach(cfg => {
      if (!cfg.mesh || !cfg.mesh.material) return;

      if (frame >= cfg.frameStart && frame <= cfg.frameEnd) {
        smoothBlink(cfg, frame, fps);
      } else {
        cfg.mesh.material.color.copy(cfg.colorBase);
      }
    });
  }

  // === Actualizar controles si no hay cámara GLB ===
  if (!cameraGLB) controls.update();

  // === Aplicar cámara activa ===
  renderPass.camera = cameraGLB || camera;

  // === POST-PROCESSING RENDER ===
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

  // === NECESARIO PARA EL DOF ===
  bokehPass.renderTargetDepth.setSize(innerWidth, innerHeight);
  bokehPass.renderTargetColor.setSize(innerWidth, innerHeight);
});
