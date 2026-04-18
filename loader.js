// =====================================================
// LOADER CONTROLLER
// Importado por main.js — NO añadir como <script> en el HTML
// =====================================================

// Los elementos se buscan en el momento de uso (no al importar)
// para evitar race conditions si el módulo se evalúa antes
// de que el DOM esté completamente parseado.
function getEls() {
  return {
    overlay:    document.getElementById('loader-overlay'),
    barFill:    document.getElementById('loader-bar-fill'),
    percentNum: document.getElementById('loader-percent-num'),
    statusEl:   document.getElementById('loader-status'),
  };
}

// =====================================================
// MENSAJES DE ESTADO
// Edita este array para personalizar los textos
// =====================================================
const STATUS_MESSAGES = [
  'Avvio della scena',
  'Caricamento della geometria',
  'Applicazione dei materiali',
  'Configurazione delle luci',
  'Preparazione delle animazioni',
  'Pronto',
];

function getStatusMessage(progress) {
  const index = Math.floor((progress / 100) * (STATUS_MESSAGES.length - 1));
  return STATUS_MESSAGES[Math.min(index, STATUS_MESSAGES.length - 1)];
}


// =====================================================
// loaderSetProgress(value)
// value = 0 a 100
// =====================================================
export function loaderSetProgress(value) {
  const { barFill, percentNum, statusEl } = getEls();
  const clamped = Math.min(Math.max(value, 0), 100);
  const pct = Math.round(clamped);

  if (barFill)    barFill.style.width    = `${clamped}%`;
  if (percentNum) percentNum.textContent = `${pct}%`;
  if (statusEl)   statusEl.textContent   = getStatusMessage(clamped);
}


// =====================================================
// loaderDone()
// Llama esto cuando la escena esté lista.
// =====================================================
export function loaderDone() {
  const { overlay } = getEls();
  if (!overlay) return;

  loaderSetProgress(100);

  setTimeout(() => {
    overlay.classList.add('hide');

    overlay.addEventListener('transitionend', () => {
      overlay.classList.add('gone');
    }, { once: true });
  }, 500);
}