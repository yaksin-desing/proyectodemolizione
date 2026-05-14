// loader.js  —  ESM, importado desde main.js
// =====================================================

const BOX_SIZE = 90;
const ARM      = 28;

const corners = {
  tl: document.getElementById('lc-tl'),
  tr: document.getElementById('lc-tr'),
  bl: document.getElementById('lc-bl'),
  br: document.getElementById('lc-br'),
};

function getEls() {
  return {
    overlay:    document.getElementById('loader-overlay'),
    barFill:    document.getElementById('loader-bar-fill'),
    percentNum: document.getElementById('loader-percent-num'),
  };
}

// ── Posicionado con transform (GPU, sin layout) ──────
function positionCorners() {
  const overlay = document.getElementById('loader-overlay');
  const W = overlay.offsetWidth;
  const H = overlay.offsetHeight;
  const cx = W / 2, cy = H / 2;
  const half = BOX_SIZE / 2;

  // Anclar cada esquina en su posición base con top/left fijo,
  // el movimiento posterior se hace con transform para evitar reflow
  const pos = {
    tl: { top: cy - half,      left: cx - half      },
    tr: { top: cy - half,      left: cx + half - 18 },
    bl: { top: cy + half - 18, left: cx - half      },
    br: { top: cy + half - 18, left: cx + half - 18 },
  };

  Object.entries(pos).forEach(([k, p]) => {
    const el = corners[k];
    el.style.top    = p.top  + 'px';
    el.style.left   = p.left + 'px';
    el.style.width  = '18px';
    el.style.height = '18px';
    el.style.transform = 'translate(0,0)';
    // Avisa al compositor que estas capas se van a animar
    el.style.willChange = 'transform, opacity';
  });
}

// ── Expansión con transform: sin layout recalc ───────
function expandCorners() {
  const overlay = document.getElementById('loader-overlay');
  const W = overlay.offsetWidth;
  const H = overlay.offsetHeight;
  const cx = W / 2, cy = H / 2;
  const half = BOX_SIZE / 2;

  const deltas = {
    tl: { dx: -(cx - half),       dy: -(cy - half)      },
    tr: { dx:  (W - ARM) - (cx + half - 18), dy: -(cy - half)      },
    bl: { dx: -(cx - half),       dy:  (H - ARM) - (cy + half - 18) },
    br: { dx:  (W - ARM) - (cx + half - 18), dy:  (H - ARM) - (cy + half - 18) },
  };

  Object.entries(deltas).forEach(([k, d]) => {
    const el = corners[k];
    el.classList.add('expanding');
    el.style.transform = `translate(${d.dx}px, ${d.dy}px)`;
    el.style.width  = ARM + 'px';
    el.style.height = ARM + 'px';
  });

  setTimeout(() => {
    Object.values(corners).forEach(el => el.classList.add('fade-out'));
  }, 500);
}

positionCorners();
window.addEventListener('resize', positionCorners);

// ── Progress ─────────────────────────────────────────
export function loaderSetProgress(value) {
  const { barFill, percentNum } = getEls();
  const clamped = Math.min(Math.max(value, 0), 100);
  const pct     = Math.round(clamped);

  if (barFill)    barFill.style.width    = `${clamped}%`;
  if (percentNum) percentNum.textContent = String(pct).padStart(2, '0') + '%';
}

// ── Done ─────────────────────────────────────────────
let _expandedOnce = false;

export function loaderDone() {
  const { overlay } = getEls();
  if (!overlay || _expandedOnce) return;
  _expandedOnce = true;

  loaderSetProgress(100);

  // Espera DOS frames reales antes de arrancar la secuencia:
  // el primero termina de pintar el estado 100 %, el segundo
  // ya tiene el modelo renderizado — sin jank al iniciar Three.js
  requestAnimationFrame(() => {
    requestAnimationFrame(() => {
      expandCorners();

      setTimeout(() => {
        overlay.classList.add('hide');
        overlay.addEventListener('transitionend', () => {
          overlay.classList.add('gone');
          // Libera las capas de la GPU una vez fuera de pantalla
          Object.values(corners).forEach(el => { el.style.willChange = 'auto'; });
        }, { once: true });
      }, 850);
    });
  });
}