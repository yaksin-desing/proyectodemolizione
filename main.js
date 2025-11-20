// ======== IMPORTS (todos de la misma versión r129) ========
import * as THREE from "https://cdn.skypack.dev/three@0.129.0/build/three.module.js";

import {
  GLTFLoader
} from "https://cdn.skypack.dev/three@0.129.0/examples/jsm/loaders/GLTFLoader.js";
import {
  RGBELoader
} from "https://cdn.skypack.dev/three@0.129.0/examples/jsm/loaders/RGBELoader.js";
import {
  OrbitControls
} from "https://cdn.skypack.dev/three@0.129.0/examples/jsm/controls/OrbitControls.js";
import {
  Sky
} from "https://cdn.skypack.dev/three@0.129.0/examples/jsm/objects/Sky.js";
import Stats from "https://cdn.skypack.dev/three@0.129.0/examples/jsm/libs/stats.module.js";
import {
  Reflector
} from "https://cdn.skypack.dev/three@0.129.0/examples/jsm/objects/Reflector.js";

// ========= CONTENEDOR =========
const container = document.getElementById("canvas-container");
if (!container) throw new Error("Falta <div id='canvas-container'> en tu HTML");

// ========= ESCENA =========
const scene = new THREE.Scene();
scene.background = new THREE.Color(0xffffff); // blanco


// ========= CÁMARA =========
const camera = new THREE.PerspectiveCamera(
  45,
  window.innerWidth / window.innerHeight,
  0.1,
  2000
);
camera.position.set(0, 1, 7);

// ========= RENDERER =========
const renderer = new THREE.WebGLRenderer({
  antialias: true
});
renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
renderer.setSize(window.innerWidth, window.innerHeight);
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



// ========= PISO CERÁMICO REFLECTIVO (Reflector) =========

// Geometría del piso
const floorGeo = new THREE.PlaneGeometry(200, 100);

// Reflector para el reflejo
const reflectiveFloor = new Reflector(floorGeo, {
  clipBias: 0.1,
  textureWidth: window.innerWidth * 1,
  textureHeight: window.innerHeight * 1,
  color: 0xffffff,
});

reflectiveFloor.rotation.x = -Math.PI / 2;
reflectiveFloor.position.y = -0.09;
//scene.add(reflectiveFloor);

// ========= TEXTURAS CERÁMICAS (NORMAL + ROUGHNESS) =========
const textureLoader = new THREE.TextureLoader();

// displacement map
const displacementMap = textureLoader.load("marmol_disp.png");
displacementMap.wrapS = THREE.RepeatWrapping;
displacementMap.wrapT = THREE.RepeatWrapping;
displacementMap.repeat.set(5, 5);

// carga el normal map
const normalMap = textureLoader.load("marmol_normal.jpg");
normalMap.wrapS = THREE.RepeatWrapping;
normalMap.wrapT = THREE.RepeatWrapping;
normalMap.repeat.set(5, 5);

// carga el roughness map
const roughnessMap = textureLoader.load("marmol_rough.jpg");
roughnessMap.wrapS = THREE.RepeatWrapping;
roughnessMap.wrapT = THREE.RepeatWrapping;
roughnessMap.repeat.set(5, 5);

// ========= CAPA CERÁMICA =========
const ceramicMaterial = new THREE.MeshPhysicalMaterial({
  color: new THREE.Color(1.0, 1.0, 1.0),

  roughness: 0.5,
  metalness: 0.0,

  // === texturas añadidas ===
  //normalMap: normalMap,
  //normalScale: new THREE.Vector2(0.5, 0.5),
  roughnessMap: roughnessMap,

  displacementMap: displacementMap,
  displacementScale: 0.07,

  clearcoat: 1.0,
  clearcoatRoughness: 0.15,

  transparent: true,
  opacity: 0.85,
});

const ceramicLayer = new THREE.Mesh(floorGeo, ceramicMaterial);
ceramicLayer.rotation.x = -Math.PI / 2;
ceramicLayer.position.y = -0.1;
ceramicLayer.renderOrder = 2;

scene.add(ceramicLayer);

// ========= CARGA DEL MODELO =========
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
        c.material.envMapIntensity = 0.4;
        c.material.needsUpdate = true;
      }
    }
  });

  model.scale.set(1, 1, 1);
  model.position.y = 0;
  scene.add(model);

  if (gltf.animations.length > 0) {
    mixer = new THREE.AnimationMixer(model);
    gltf.animations.forEach((clip) => mixer.clipAction(clip).plays());
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