// ======== IMPORTS (todos de la misma versión r129) ========
import * as THREE from "https://cdn.skypack.dev/three@0.129.0/build/three.module.js";

import { GLTFLoader } from "https://cdn.skypack.dev/three@0.129.0/examples/jsm/loaders/GLTFLoader.js";
import { RGBELoader } from "https://cdn.skypack.dev/three@0.129.0/examples/jsm/loaders/RGBELoader.js";
import { OrbitControls } from "https://cdn.skypack.dev/three@0.129.0/examples/jsm/controls/OrbitControls.js";
import { Sky } from "https://cdn.skypack.dev/three@0.129.0/examples/jsm/objects/Sky.js";
import Stats from "https://cdn.skypack.dev/three@0.129.0/examples/jsm/libs/stats.module.js";
import { Reflector } from "https://cdn.skypack.dev/three@0.129.0/examples/jsm/objects/Reflector.js";

// ========= CONTENEDOR =========
const container = document.getElementById("canvas-container");
if (!container) throw new Error("Falta <div id='canvas-container'> en tu HTML");

// ========= ESCENA =========
const scene = new THREE.Scene();
scene.background = new THREE.Color(0xffffff);

// ========= CÁMARA =========
const camera = new THREE.PerspectiveCamera(
  75,
  window.innerWidth / window.innerHeight,
  0.1,
  2000
);
camera.position.set(0, 1, 7);

// ========= RENDERER =========
const renderer = new THREE.WebGLRenderer({ antialias: false });
renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
renderer.setSize(window.innerWidth, window.innerHeight);

// ACTIVAR SOMBRAS
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;

container.appendChild(renderer.domElement);

// ========= ORBIT CONTROLS =========
const controls = new OrbitControls(camera, renderer.domElement);
controls.enableDamping = true;
controls.dampingFactor = 0.03;
controls.target.set(0, 1, 0);
controls.update();

// ========= HDRI =========
const pmremGenerator = new THREE.PMREMGenerator(renderer);
pmremGenerator.compileEquirectangularShader();

new RGBELoader()
  .setPath("")
  .load("hdri.hdr", (hdrMap) => {
    const envMap = pmremGenerator.fromEquirectangular(hdrMap).texture;
    scene.environment = envMap;

    hdrMap.dispose();
    pmremGenerator.dispose();
  });

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

// ========= LUZ PRINCIPAL CON SOMBRAS =========
const dirLight = new THREE.DirectionalLight(0xffffff, 0.3);
dirLight.position.set(10, 20, 10);
dirLight.castShadow = true;

// calidad sombras
dirLight.shadow.mapSize.width = 2048;
dirLight.shadow.mapSize.height = 2048;
dirLight.shadow.camera.near = 0.5;
dirLight.shadow.camera.far = 150;

// área sombras
dirLight.shadow.camera.left = -30;
dirLight.shadow.camera.right = 30;
dirLight.shadow.camera.top = 30;
dirLight.shadow.camera.bottom = -30;

dirLight.shadow.bias = -0.0005;

scene.add(dirLight);

// ========= HELPERS VISIBLES =========
const dirLightHelper = new THREE.DirectionalLightHelper(dirLight, 0);
scene.add(dirLightHelper);

const shadowHelper = new THREE.CameraHelper(dirLight.shadow.camera);
scene.add(shadowHelper);



// ========= PISO CERÁMICO =========
const floorGeo = new THREE.PlaneGeometry(80, 70);

// Reflector (no recibe sombras)
const reflectiveFloor = new Reflector(floorGeo, {
  clipBias: 0.1,
  textureWidth: window.innerWidth,
  textureHeight: window.innerHeight,
  color: 0xffffff,
});
reflectiveFloor.rotation.x = -Math.PI / 2;
reflectiveFloor.position.y = -0.09;
// scene.add(reflectiveFloor);

// Texturas
const textureLoader = new THREE.TextureLoader();

const displacementMap = textureLoader.load("marmol_disp.png");
displacementMap.wrapS = THREE.RepeatWrapping;
displacementMap.wrapT = THREE.RepeatWrapping;
displacementMap.repeat.set(5, 5);

const normalMap = textureLoader.load("marmol_normal.jpg");
normalMap.wrapS = THREE.RepeatWrapping;
normalMap.wrapT = THREE.RepeatWrapping;
normalMap.repeat.set(5, 5);

const roughnessMap = textureLoader.load("marmol_rough.jpg");
roughnessMap.wrapS = THREE.RepeatWrapping;
roughnessMap.wrapT = THREE.RepeatWrapping;
roughnessMap.repeat.set(5, 5);

// material piso
const ceramicMaterial = new THREE.MeshPhysicalMaterial({
  color: new THREE.Color(1, 1, 1),
  roughness: 0.3,
  metalness: 0,

  roughnessMap: roughnessMap,
  displacementMap: displacementMap,
  displacementScale: 0.07,

  clearcoat: 0,
  clearcoatRoughness: 1,

  transparent: false,
  opacity: 1,
});

const ceramicLayer = new THREE.Mesh(floorGeo, ceramicMaterial);
ceramicLayer.rotation.x = -Math.PI / 2;
ceramicLayer.position.y = -0.1;
ceramicLayer.renderOrder = 2;

// Recibir sombra
ceramicLayer.receiveShadow = true;

scene.add(ceramicLayer);

// ========= CARGA MODELO =========
const loader = new GLTFLoader();
let mixer = null;
const clock = new THREE.Clock();

loader.load("./scene.glb", (gltf) => {
  const model = gltf.scene;

  model.traverse((c) => {
    if (c.isMesh) {
      c.castShadow = true;
      c.receiveShadow = true;

      if (c.material) {
        c.material.envMapIntensity = 0.3;
        c.material.needsUpdate = true;
      }
    }
  });

  model.scale.set(1, 1, 1);
  model.position.y = 0.05;

  scene.add(model);

  if (gltf.animations.length > 0) {
    mixer = new THREE.AnimationMixer(model);
    gltf.animations.forEach((clip) => mixer.clipAction(clip).play());
  }
});

// ========= STATS =========
const stats = new Stats();
stats.showPanel(0);
document.body.appendChild(stats.dom);

// ========= LOOP =========
function animate() {
  stats.begin();
  requestAnimationFrame(animate);

  const delta = clock.getDelta();
  if (mixer) mixer.update(delta);

  controls.update();
  renderer.render(scene, camera);

  stats.end();
}

animate();

// ========= RESIZE =========
window.addEventListener("resize", () => {
  camera.aspect = innerWidth / innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(innerWidth, innerHeight);
});
