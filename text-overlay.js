// =====================================================
// TEXT OVERLAY CONTROLLER
// Importa en main.js:
//   import { initTextOverlay, updateTextByFrame } from './text-overlay.js';
//
// Llama initTextOverlay() una vez al cargar.
// Llama updateTextByFrame(frame) en cada frame del loop.
// =====================================================


// =====================================================
// SECUENCIAS DE TEXTO — EDITA AQUÍ
//
// Cada entrada define:
//   frameStart : frame donde aparece el texto
//   frameEnd   : frame donde desaparece
//   title      : contenido del h1 (acepta HTML, ej: "TITULO <span>ACENTO</span>")
//   body       : contenido del párrafo
//
// Puedes añadir tantas entradas como quieras.
// Los rangos NO deben solaparse.
// =====================================================
const TEXT_SEQUENCES = [
  {
    frameStart : 1,
    frameEnd   : 340,
    title      : "ENCUENTRA TODAS LAS <span>PIESAS AQUI</span>",
    body       : "Tenemos toda clase de piesas originales para tu auto, desde las más comunes hasta las más difíciles de encontrar. ¡Explora nuestro catálogo y encuentra lo que necesitas!",
  },
  {
    frameStart : 365,
    frameEnd   : 430,
    title      : "SISTEMAS DE FRENO, SUSPENCION Y <span>NEUMATICOS</span>",
    body       : "Rines, pastillas, amortiguadores, resortes, y neumáticos de todas las marcas y modelos. ¡Mantén tu auto seguro y con el mejor rendimiento con nuestras piezas de alta calidad!",
  },
  {
    frameStart : 535,
    frameEnd   : 575,
    title      : "ENCUENTRA ESPEJOS RESTROVISORES Y SISTEMA DE <span>ILUMINACIÓN</span>",
    body       : "Faros, luces traseras, intermitentes, y espejos retrovisores para todo tipo de vehículos. ¡Ilumina tu camino y mantén la visibilidad con nuestras piezas de iluminación de alta calidad!",
  },
  {
    frameStart : 631,
    frameEnd   : 775,
    title      : "TENEMOS PIEZAS DE <span>CARROCERIA</span>",
    body       : "Molduras, defensas, capotas, y piezas de carrocería para todo tipo de vehículos. ¡Dale a tu auto un nuevo look o repara los daños con nuestras piezas de carrocería de alta calidad!",
  },

];


// ── Estado interno ──────────────────────────────────
let elTitle    = null;
let elBody     = null;
let elWrap     = null;
let activeIndex = -1;   // índice de la secuencia activa (-1 = ninguna)


// ── Helpers de animación ─────────────────────────────
function animateIn(el, content) {
  el.innerHTML = content.replace(/\n/g, '<br>');
  el.classList.remove('exit');
  // Forzar reflow para reiniciar animación si ya estaba visible
  void el.offsetWidth;
  el.classList.add('enter');
}

function animateOut(el) {
  el.classList.remove('enter');
  void el.offsetWidth;
  el.classList.add('exit');
}


// =====================================================
// initTextOverlay()
// Llama una vez al inicio, antes del loop.
// =====================================================
export function initTextOverlay() {
  elTitle = document.getElementById('scene-title');
  elBody  = document.getElementById('scene-body');
  elWrap  = document.getElementById('scene-text');

  if (!elTitle || !elBody) {
    console.warn('[TextOverlay] No se encontraron #scene-title o #scene-body en el HTML.');
  }
}


// =====================================================
// updateTextByFrame(frame)
// Llama en cada iteración del loop de animación.
// frame = número entero del frame actual (mixer.time * fps)
// =====================================================
export function updateTextByFrame(frame) {
  if (!elTitle || !elBody) return;

  // Buscar qué secuencia corresponde al frame actual
  const newIndex = TEXT_SEQUENCES.findIndex(
    s => frame >= s.frameStart && frame <= s.frameEnd
  );

  // Sin cambio: no hacer nada
  if (newIndex === activeIndex) return;

  // Salida del texto anterior
  if (activeIndex !== -1) {
    animateOut(elTitle);
    animateOut(elBody);
    elWrap.classList.remove('visible');
  }

  activeIndex = newIndex;

  // Entrada del nuevo texto
  if (newIndex !== -1) {
    const seq = TEXT_SEQUENCES[newIndex];
    // Pequeño delay para que salga primero el anterior
    setTimeout(() => {
      animateIn(elTitle, seq.title);
      animateIn(elBody,  seq.body);
      elWrap.classList.add('visible');
    }, activeIndex === -1 ? 0 : 300);
  }
}