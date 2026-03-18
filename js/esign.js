// esign.js — Signature pad management for SubPaperz

class ESignature {
  constructor(canvasId, options = {}) {
    this.canvasId = canvasId;
    this.canvas = document.getElementById(canvasId);
    this.options = { required: true, label: 'Signature', ...options };
    this.pad = null;
    this.resizeObserver = null;
  }

  init() {
    if (!this.canvas) { console.error(`ESignature: canvas #${this.canvasId} not found`); return; }
    this.pad = new SignaturePad(this.canvas, {
      backgroundColor: 'rgb(255,255,255)',
      penColor: 'rgb(0,0,0)',
      minWidth: 1,
      maxWidth: 3,
    });
    this._resize();
    this.resizeObserver = new ResizeObserver(() => this._resize());
    this.resizeObserver.observe(this.canvas.parentElement);
  }

  _resize() {
    const ratio = Math.max(window.devicePixelRatio || 1, 1);
    const w = this.canvas.offsetWidth;
    const h = this.canvas.offsetHeight;
    const data = this.pad ? this.pad.toData() : [];
    this.canvas.width = w * ratio;
    this.canvas.height = h * ratio;
    this.canvas.getContext('2d').scale(ratio, ratio);
    if (this.pad) { this.pad.clear(); this.pad.fromData(data); }
  }

  isEmpty() { return !this.pad || this.pad.isEmpty(); }

  getDataURL(type = 'image/png') {
    if (this.isEmpty()) return null;
    return this.pad.toDataURL(type);
  }

  clear() { if (this.pad) this.pad.clear(); }

  validate() {
    if (this.options.required && this.isEmpty()) {
      return { valid: false, error: `${this.options.label} is required.` };
    }
    return { valid: true, error: null };
  }

  destroy() {
    if (this.resizeObserver) this.resizeObserver.disconnect();
    if (this.pad) this.pad.off();
  }
}

function initAllSignaturePads() {
  const instances = [];
  document.querySelectorAll('[data-signature-pad]').forEach(canvas => {
    const label = canvas.dataset.signatureLabel || 'Signature';
    const required = canvas.dataset.signatureRequired !== 'false';
    const instance = new ESignature(canvas.id, { label, required });
    instance.init();
    instances.push(instance);

    // Wire up the clear button if present
    const clearBtn = document.querySelector(`[data-clear-pad="${canvas.id}"]`);
    if (clearBtn) clearBtn.addEventListener('click', () => instance.clear());
  });
  return instances;
}

window.ESignature = ESignature;
window.initAllSignaturePads = initAllSignaturePads;
