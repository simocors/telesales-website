// =============================================
// Telesales · Marco Ferretti 2.0 widget
// Inietta un form "chiamami ora" e gestisce la
// chiamata diretta verso l'agente AI.
// =============================================

(function (global) {
  'use strict';

  var ELEVENLABS_API_KEY = '3ff8fd353d2754bf2a98fa448f38e38826c1261e73984fff80b740f4d022497c';
  var AGENT_ID = 'agent_5301kpdv4sd9e15vcz4qpm8e7vrn';
  var PHONE_NUMBER_ID = 'phnum_1001kn4a2xjaenf9516b2fb5azxe';
  var API_BASE = 'https://api.elevenlabs.io/v1/convai';

  var PREFIX = '+39 ';
  var MAX_ATTEMPTS = 4;
  var RETRY_DELAY_MS = 700;

  var lastPrewarm = 0;
  function prewarm() {
    var now = Date.now();
    if (now - lastPrewarm < 30000) return;
    lastPrewarm = now;
    try {
      fetch(API_BASE + '/agents/' + AGENT_ID, { method: 'GET', headers: { 'xi-api-key': ELEVENLABS_API_KEY } }).catch(function(){});
      fetch(API_BASE + '/phone-numbers/' + PHONE_NUMBER_ID, { method: 'GET', headers: { 'xi-api-key': ELEVENLABS_API_KEY } }).catch(function(){});
    } catch (e) {}
  }

  function normalize(raw) {
    var v = (raw || '').replace(/[^\d+]/g, '').trim();
    if (!v) return '';
    if (v.indexOf('00') === 0) v = '+' + v.slice(2);
    if (v.charAt(0) !== '+') {
      if (v.indexOf('39') === 0) v = '+' + v;
      else v = '+39' + v;
    }
    return v;
  }

  function buildFormHTML(opts) {
    var headline = opts.headline || 'Fatti chiamare da Marco.';
    var sub = opts.sub || 'Inserisci il tuo numero: il telefono squilla entro pochi secondi. Marco parla in diretta.';
    return ''
      + '<div class="marco-widget-inner">'
      +   '<div class="marco-widget-live"><span class="dot"></span>Marco · Online</div>'
      +   '<h2 class="marco-widget-title">' + headline + '</h2>'
      +   '<p class="marco-widget-sub">' + sub + '</p>'
      +   '<form class="marco-form" autocomplete="off">'
      +     '<label class="marco-label">Numero di telefono</label>'
      +     '<input class="marco-input" type="tel" inputmode="tel" autocomplete="tel" value="' + PREFIX + '" placeholder="' + PREFIX + '..." required>'
      +     '<button class="marco-btn" type="submit">Chiamami ora</button>'
      +     '<div class="marco-status" role="status"></div>'
      +   '</form>'
      +   '<p class="marco-foot">Chiamata reale. Numero visibile al chiamante. Un solo squillo per numero al minuto.</p>'
      + '</div>';
  }

  function setStatus(el, type, html) {
    if (!el) return;
    el.className = 'marco-status show ' + type;
    el.innerHTML = html;
  }

  async function triggerCall(num) {
    var r = await fetch(API_BASE + '/sip-trunk/outbound-call', {
      method: 'POST',
      headers: { 'xi-api-key': ELEVENLABS_API_KEY, 'Content-Type': 'application/json' },
      body: JSON.stringify({ agent_id: AGENT_ID, agent_phone_number_id: PHONE_NUMBER_ID, to_number: num })
    });
    var text = await r.text();
    var data = {};
    try { data = JSON.parse(text); } catch (e) {}
    return { ok: r.ok, status: r.status, data: data };
  }

  function bindPhoneInput(input) {
    function ensurePrefix() {
      if (!input.value.startsWith(PREFIX)) {
        var digits = input.value.replace(/[^\d]/g, '');
        var rest = digits.indexOf('39') === 0 ? digits.slice(2) : digits;
        input.value = PREFIX + rest;
      }
    }
    input.addEventListener('focus', function () {
      ensurePrefix();
      setTimeout(function () { var end = input.value.length; input.setSelectionRange(end, end); }, 0);
    });
    input.addEventListener('input', ensurePrefix);
    input.addEventListener('keydown', function (e) {
      var start = input.selectionStart, end = input.selectionEnd;
      if (e.key === 'Backspace' && start <= PREFIX.length && start === end) e.preventDefault();
      if (e.key === 'Delete' && start < PREFIX.length) e.preventDefault();
    });
  }

  async function handleSubmit(form, input, btn, status) {
    var num = normalize(input.value);
    if (!/^\+\d{9,15}$/.test(num)) {
      setStatus(status, 'err', 'Numero non valido. Riprova con prefisso internazionale.');
      return;
    }
    btn.disabled = true;
    var originalText = btn.textContent;
    btn.innerHTML = '<span class="marco-spinner"></span> Sto chiamando...';
    setStatus(status, 'load', '<span class="marco-spinner"></span> Inoltro la chiamata a Marco...');

    var lastErr = null;
    for (var i = 1; i <= MAX_ATTEMPTS; i++) {
      try {
        setStatus(status, 'load', '<span class="marco-spinner"></span> Inoltro la chiamata a Marco...');
        var r = await triggerCall(num);
        if (!r.ok) {
          var msg = (r.data && r.data.detail && (r.data.detail.message || r.data.detail)) || r.data.error || ('HTTP ' + r.status);
          if (r.status === 400 || r.status === 401 || r.status === 403) {
            throw new Error(typeof msg === 'string' ? msg : JSON.stringify(msg));
          }
          lastErr = typeof msg === 'string' ? msg : JSON.stringify(msg);
          if (i < MAX_ATTEMPTS) { await new Promise(function (res) { setTimeout(res, RETRY_DELAY_MS); }); continue; }
          throw new Error(lastErr);
        }
        var failed = r.data && r.data.success === false;
        if (failed) {
          var raw = r.data.message || 'chiamata rifiutata';
          if (/486|480|busy|unavailable/i.test(raw) && i < MAX_ATTEMPTS) {
            lastErr = raw;
            await new Promise(function (res) { setTimeout(res, RETRY_DELAY_MS); });
            continue;
          }
          var hint = raw;
          if (/486|busy/i.test(raw)) hint = 'Il carrier sta filtrando la chiamata. Riprova tra qualche secondo.';
          else if (/480|temporarily unavailable/i.test(raw)) hint = 'Numero non raggiungibile in questo momento.';
          else if (/403|forbidden|not allowed/i.test(raw)) hint = "L'operatore blocca la chiamata in ingresso.";
          throw new Error(hint);
        }
        setStatus(status, 'ok', 'Fatto. Il telefono squilla tra pochi secondi. Rispondi: Marco è in linea.');
        btn.innerHTML = 'Chiamata inoltrata';
        return;
      } catch (err) {
        lastErr = err.message || 'errore sconosciuto';
        if (i === MAX_ATTEMPTS) break;
        await new Promise(function (res) { setTimeout(res, RETRY_DELAY_MS); });
      }
    }
    setStatus(status, 'err', 'Chiamata non riuscita: ' + lastErr);
    btn.disabled = false;
    btn.innerHTML = originalText;
  }

  function init(selector, opts) {
    opts = opts || {};
    var container = typeof selector === 'string' ? document.querySelector(selector) : selector;
    if (!container) return;
    container.classList.add('marco-widget');
    container.innerHTML = buildFormHTML(opts);
    var form = container.querySelector('.marco-form');
    var input = container.querySelector('.marco-input');
    var btn = container.querySelector('.marco-btn');
    var status = container.querySelector('.marco-status');
    bindPhoneInput(input);
    form.addEventListener('submit', function (e) {
      e.preventDefault();
      e.stopPropagation();
      handleSubmit(form, input, btn, status);
    });
    // prewarm subito e quando il widget torna visibile
    prewarm();
    try {
      var io = new IntersectionObserver(function (entries) {
        entries.forEach(function (en) { if (en.isIntersecting) prewarm(); });
      }, { threshold: 0.1 });
      io.observe(container);
    } catch (e) {}
  }

  // tutti i pulsanti [data-marco-trigger] scrollano al widget e lo highlightano
  function wireTriggers() {
    var btns = document.querySelectorAll('[data-marco-trigger]');
    btns.forEach(function (b) {
      b.addEventListener('click', function (e) {
        e.preventDefault();
        var target = document.querySelector('.marco-widget');
        if (target) {
          target.scrollIntoView({ behavior: 'smooth', block: 'center' });
          target.classList.add('pulse');
          setTimeout(function () { target.classList.remove('pulse'); }, 1400);
          var inp = target.querySelector('.marco-input');
          if (inp) setTimeout(function () { inp.focus(); }, 500);
        }
      });
    });
  }

  global.TelesalesMarco = { init: init };

  // auto-init se esiste un contenitore con data-marco
  document.addEventListener('DOMContentLoaded', function () {
    var auto = document.querySelector('[data-marco-auto]');
    if (auto) {
      init(auto, {
        headline: auto.getAttribute('data-headline') || undefined,
        sub: auto.getAttribute('data-sub') || undefined
      });
    }
    wireTriggers();
  });
})(window);
