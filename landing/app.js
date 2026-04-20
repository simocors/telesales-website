/* Telesales landing — interactions */
(() => {
  const $ = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => Array.from(r.querySelectorAll(s));
  // (dedup note) $$ here is Array.from; above $ is single query

  /* =========== i18n =========== */
  let currentLang = localStorage.getItem('ts.lang') || 'it';
  function applyI18n(lang) {
    currentLang = lang;
    document.documentElement.lang = lang;
    const dict = window.I18N[lang];
    $$('[data-i18n]').forEach(el => {
      const k = el.getAttribute('data-i18n');
      if (dict[k] != null) el.innerHTML = dict[k];
    });
    // hero variant (reapply with current copy variant)
    applyHeroVariant(state.hero);
    // FAQ rebuild
    buildFaq();
    localStorage.setItem('ts.lang', lang);
    $$('.lang-switch button').forEach(b => b.classList.toggle('active', b.dataset.lang === lang));
  }

  /* =========== state + tweaks =========== */
  const stored = (() => { try { return JSON.parse(localStorage.getItem('ts.tweaks') || 'null'); } catch(e) { return null; } })();
  const state = Object.assign({}, window.TWEAK_DEFAULTS, stored || {});
  function persist() { try { localStorage.setItem('ts.tweaks', JSON.stringify(state)); } catch(e) {} }

  function applyAccent(v) {
    state.accent = v;
    document.documentElement.setAttribute('data-accent', v === 'gold' ? 'gold' : v);
    if (v === 'gold') document.documentElement.removeAttribute('data-accent');
    persist();
  }
  function applyTheme(v) {
    state.theme = v;
    if (v === 'light') document.documentElement.setAttribute('data-theme','light');
    else document.documentElement.setAttribute('data-theme','dark');
    persist();
  }
  function applyHeroVariant(v) {
    state.hero = v;
    const pack = (window.HERO_VARIANTS[currentLang] || window.HERO_VARIANTS.it)[v];
    if (!pack) return;
    // direct DOM writes into the headline spans
    const lines = $$('.hero-headline [data-i18n]');
    if (lines[0]) lines[0].textContent = pack.h1a;
    if (lines[1]) lines[1].textContent = pack.h1b;
    if (lines[2]) lines[2].textContent = pack.h1c;
    if (lines[3]) lines[3].textContent = pack.h1d;
    const sub = $('.hero-sub'); if (sub) sub.textContent = pack.sub;
    persist();
  }

  // tweaks panel
  $$('.tweak-options').forEach(group => {
    const key = group.dataset.tweak;
    group.addEventListener('click', (e) => {
      const btn = e.target.closest('.tweak-opt'); if (!btn) return;
      const v = btn.dataset.val;
      group.querySelectorAll('.tweak-opt').forEach(b => b.classList.toggle('active', b === btn));
      if (key === 'accent') applyAccent(v);
      if (key === 'theme') applyTheme(v);
      if (key === 'hero') applyHeroVariant(v);
      // notify host
      try { window.parent.postMessage({type:'__edit_mode_set_keys', edits:{[key]: v}}, '*'); } catch(e) {}
    });
  });
  // mark current tweak buttons active
  function syncTweakButtons() {
    $$('.tweak-options').forEach(group => {
      const key = group.dataset.tweak;
      group.querySelectorAll('.tweak-opt').forEach(b => b.classList.toggle('active', b.dataset.val === state[key]));
    });
  }

  // edit mode host protocol
  window.addEventListener('message', (ev) => {
    if (!ev.data || !ev.data.type) return;
    if (ev.data.type === '__activate_edit_mode') $('#tweaks').classList.add('on');
    if (ev.data.type === '__deactivate_edit_mode') $('#tweaks').classList.remove('on');
  });
  $('#tweaksClose').addEventListener('click', () => {
    $('#tweaks').classList.remove('on');
    try { window.parent.postMessage({type:'__deactivate_edit_mode'}, '*'); } catch(e) {}
  });
  requestAnimationFrame(() => {
    try { window.parent.postMessage({type:'__edit_mode_available'}, '*'); } catch(e) {}
  });

  // lang buttons
  $$('.lang-switch button').forEach(b => {
    b.addEventListener('click', () => applyI18n(b.dataset.lang));
  });

  /* =========== nav scroll =========== */
  const nav = $('#nav');
  const floatMic = $('#floatMic');
  function onScroll() {
    const y = window.scrollY;
    nav.classList.toggle('scrolled', y > 20);
    floatMic.classList.toggle('on', y > 600);
  }
  window.addEventListener('scroll', onScroll, { passive: true });
  onScroll();

  /* =========== reveal on view =========== */
  const io = new IntersectionObserver((entries) => {
    entries.forEach(e => { if (e.isIntersecting) { e.target.classList.add('in'); io.unobserve(e.target); } });
  }, { threshold: .12, rootMargin: '0px 0px -40px 0px' });
  $$('.reveal').forEach(el => io.observe(el));

  /* =========== count-up =========== */
  const cio = new IntersectionObserver((entries) => {
    entries.forEach(e => {
      if (!e.isIntersecting) return;
      const el = e.target;
      const target = parseInt(el.dataset.count, 10);
      const suffix = el.dataset.suffix || '';
      const dur = 1400;
      const t0 = performance.now();
      const fmt = (n) => n.toLocaleString(currentLang === 'it' ? 'it-IT' : 'en-US');
      function step(t) {
        const p = Math.min(1, (t - t0) / dur);
        const eased = 1 - Math.pow(1 - p, 3);
        el.textContent = fmt(Math.round(target * eased)) + suffix;
        if (p < 1) requestAnimationFrame(step);
      }
      requestAnimationFrame(step);
      cio.unobserve(el);
    });
  }, { threshold: .4 });
  $$('[data-count]').forEach(el => cio.observe(el));

  /* =========== marquee (duplicate content for seamless loop) =========== */
  const track = $('#marqueeTrack');
  const names = window.COMPANIES;
  const pills = names.map(n => `<span class="pill-company">${n}</span>`).join('');
  track.innerHTML = pills + pills;

  /* =========== hero waveform (persistent, procedural) =========== */
  const heroWave = $('#heroWave');
  const BAR_COUNT = 56;
  for (let i = 0; i < BAR_COUNT; i++) {
    const b = document.createElement('span');
    b.className = 'bar';
    heroWave.appendChild(b);
  }
  const heroBars = heroWave.querySelectorAll('.bar');
  let t0 = performance.now();
  function tickHero() {
    const t = (performance.now() - t0) / 1000;
    heroBars.forEach((b, i) => {
      const x = i / BAR_COUNT;
      // multi-band envelope
      const env =
        0.35 + 0.35 * Math.sin(x * 5 + t * 2.1) * Math.cos(t * 1.1) +
        0.20 * Math.sin(x * 17 + t * 4) +
        0.15 * Math.sin(t * 3 + x * 23);
      const h = Math.max(3, Math.min(1, Math.abs(env)) * 100);
      b.style.height = h + '%';
      b.style.opacity = 0.6 + 0.4 * Math.sin(x * 8 + t);
    });
    requestAnimationFrame(tickHero);
  }
  tickHero();

  // product hero (AI Voice card) mini wave
  const pw = $('#productWave');
  for (let i = 0; i < 28; i++) { const b = document.createElement('span'); pw.appendChild(b); }
  const pwBars = pw.querySelectorAll('span');
  function tickPW() {
    const t = performance.now() / 1000;
    pwBars.forEach((b, i) => {
      const x = i / 28;
      const h = Math.abs(Math.sin(x * 9 + t * 2.3) * 0.6 + Math.sin(t * 4 + x * 15) * 0.3) * 40 + 4;
      b.style.height = h + 'px';
    });
    requestAnimationFrame(tickPW);
  }
  tickPW();

  // hero visual timer
  let tvt = 134;
  setInterval(() => {
    tvt++;
    const m = String(Math.floor(tvt / 60)).padStart(2,'0');
    const s = String(tvt % 60).padStart(2,'0');
    const el = $('#hv-timer'); if (el) el.textContent = '00:' + m + ':' + s;
  }, 1000);

  /* =========== FAQ =========== */
  function buildFaq() {
    const list = $('#faqList');
    const data = window.FAQ[currentLang] || window.FAQ.it;
    list.innerHTML = data.map((f, i) => `
      <div class="faq-item" data-idx="${i}">
        <button class="faq-q" aria-expanded="false">
          <span>${f.q}</span>
          <span class="faq-toggle" aria-hidden="true">+</span>
        </button>
        <div class="faq-a"><div class="faq-a-inner">${f.a}</div></div>
      </div>
    `).join('');
    list.querySelectorAll('.faq-item').forEach(item => {
      item.querySelector('.faq-q').addEventListener('click', () => {
        const wasOpen = item.classList.contains('open');
        list.querySelectorAll('.faq-item').forEach(x => x.classList.remove('open'));
        if (!wasOpen) item.classList.add('open');
      });
    });
  }

  /* =========== Marco call simulation =========== */
  const micOrb = $('#micOrb');
  const marcoWave = $('#marcoWave');
  const marcoState = $('#marcoState');
  const marcoTranscript = $('#marcoTranscript');
  const marcoTxt = $('#marcoTxt');
  const marcoBtnLabel = $('#marcoBtnLabel');
  const marcoBtnIcon = $('#marcoBtnIcon');

  // build marco wave bars
  for (let i = 0; i < 48; i++) { const b = document.createElement('span'); b.className = 'bar'; marcoWave.appendChild(b); }
  const mwBars = marcoWave.querySelectorAll('.bar');
  let mwActive = false;
  function tickMW() {
    const t = performance.now() / 1000;
    mwBars.forEach((b, i) => {
      const x = i / 48;
      const amp = mwActive ? (0.5 + 0.5 * Math.sin(t * 3 + x * 2)) : 0.15;
      const h = (Math.abs(Math.sin(x * 13 + t * 6)) * 0.6 + Math.sin(t * 8 + x * 19) * 0.3) * 60 * amp + 4;
      b.style.height = h + 'px';
    });
    requestAnimationFrame(tickMW);
  }
  tickMW();

  let callState = 'idle'; // idle | connecting | live | ending | ended
  let typingTimer = null;

  function setState(next) {
    callState = next;
    const key = 'marco.' + (next === 'idle' ? 'idle' : next === 'connecting' ? 'connecting' : next === 'live' ? 'live' : 'ended');
    const txt = window.I18N[currentLang][key] || '';
    marcoState.innerHTML = `<span class="st ${next === 'live' ? 'live' : next === 'ended' ? 'end' : ''}">${txt}</span>`;

    if (next === 'idle') {
      marcoWave.classList.remove('on'); marcoTranscript.classList.remove('on');
      marcoTxt.textContent = ''; mwActive = false;
      marcoBtnIcon.textContent = '🎙';
      marcoBtnLabel.textContent = window.I18N[currentLang]['marco.start'];
    }
    if (next === 'connecting') {
      marcoWave.classList.add('on'); marcoTranscript.classList.remove('on');
      mwActive = false;
      marcoBtnIcon.textContent = '⏸';
      marcoBtnLabel.textContent = currentLang === 'it' ? 'Chiudi' : 'End';
    }
    if (next === 'live') {
      marcoWave.classList.add('on'); marcoTranscript.classList.add('on');
      mwActive = true;
      marcoBtnIcon.textContent = '⏸';
      marcoBtnLabel.textContent = currentLang === 'it' ? 'Chiudi chiamata' : 'End call';
    }
    if (next === 'ended') {
      marcoWave.classList.remove('on');
      mwActive = false;
      marcoBtnIcon.textContent = '🎙';
      marcoBtnLabel.textContent = currentLang === 'it' ? 'Richiama' : 'Call again';
    }
  }

  function typeLines(lines, done) {
    if (typingTimer) clearTimeout(typingTimer);
    let full = '';
    let li = 0, ci = 0;
    marcoTxt.innerHTML = '';
    function tick() {
      if (callState !== 'live') return;
      if (li >= lines.length) { done && done(); return; }
      const line = lines[li];
      if (ci < line.length) {
        full = full + line[ci];
        marcoTxt.innerHTML = full + '<span class="caret"></span>';
        ci++;
        typingTimer = setTimeout(tick, 22 + Math.random() * 30);
      } else {
        full = full + '\n\n';
        marcoTxt.innerHTML = full + '<span class="caret"></span>';
        ci = 0; li++;
        typingTimer = setTimeout(tick, 450);
      }
    }
    tick();
  }

  let currentConvId = null;
  let pollInterval = null;

  async function startCall(scriptKey) {
    if (callState === 'connecting' || callState === 'live') {
      endCall(); return;
    }
    setState('connecting');

    try {
      // Chiama il backend per avviare la demo live
      const backendUrl = 'https://telesales-auto-callback.up.railway.app';
      const response = await fetch(`${backendUrl}/demo/start`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phone_number: '+393925920000', company: 'Demo Prospect' })
      });

      if (!response.ok) throw new Error('Failed to start demo');

      const data = await response.json();
      currentConvId = data.conversation_id;

      setTimeout(() => {
        if (callState !== 'connecting') return;
        setState('live');
        startPolling();
      }, 1400);
    } catch (e) {
      console.error('Demo start error:', e);
      // Fallback alla simulazione locale
      setState('live');
      const key = scriptKey || 'default';
      const script = (window.MARCO_SCRIPT[key] || window.MARCO_SCRIPT.default)[currentLang] || window.MARCO_SCRIPT.default.it;
      typeLines(script, () => {
        setTimeout(() => { if (callState === 'live') endCall(); }, 1600);
      });
    }
  }

  function startPolling() {
    if (!currentConvId) return;

    pollInterval = setInterval(async () => {
      try {
        const backendUrl = 'https://telesales-auto-callback.up.railway.app';
        const response = await fetch(`${backendUrl}/demo/status/${currentConvId}`);
        const data = await response.json();

        if (data.transcript && data.transcript.length > 0) {
          marcoTxt.innerHTML = '';
          data.transcript.forEach(t => {
            const line = document.createElement('div');
            line.className = `transcript-line ${t.role === 'Marco' ? 'agent' : 'client'}`;
            line.innerHTML = `<strong>${t.role}:</strong> ${t.message}`;
            marcoTxt.appendChild(line);
          });
          marcoTxt.scrollTop = marcoTxt.scrollHeight;
        }

        if (data.status === 'ended' || data.status === 'completed') {
          clearInterval(pollInterval);
          setTimeout(() => { if (callState === 'live') endCall(); }, 2000);
        }
      } catch (e) {
        console.error('Polling error:', e);
      }
    }, 1500);
  }

  function endCall() {
    if (pollInterval) clearInterval(pollInterval);
    if (typingTimer) clearTimeout(typingTimer);
    setState('ended');
    currentConvId = null;
    setTimeout(() => { if (callState === 'ended') setState('idle'); }, 2800);
  }

  // bind all call triggers
  $$('[data-call-marco]').forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.preventDefault();
      // scroll to marco if not in view
      const marco = $('#marco');
      const rect = marco.getBoundingClientRect();
      if (rect.top < -100 || rect.top > window.innerHeight * .6) {
        marco.scrollIntoView ? null : null;
        window.scrollTo({ top: marco.offsetTop - 60, behavior: 'smooth' });
      }
      startCall();
    });
  });

  // try-question buttons
  $$('.marco-try .q').forEach(btn => {
    btn.addEventListener('click', () => {
      const say = btn.getAttribute('data-say') || '';
      const key = /costa|prezzo|pricing|cost/i.test(say) ? 'pricing'
                : /crm|integra/i.test(say) ? 'crm'
                : /accor|umano|human|notice/i.test(say) ? 'human'
                : 'default';
      startCall(key);
    });
  });

  /* =========== booking form =========== */
  const form = $('#bookingForm');
  const status = $('#formStatus');
  const submit = $('#submitBtn');
  form.addEventListener('submit', (e) => {
    e.preventDefault();
    submit.disabled = true;
    const origLabel = submit.innerHTML;
    submit.innerHTML = `<span class="mono">${currentLang === 'it' ? 'invio…' : 'sending…'}</span>`;
    setTimeout(() => {
      submit.innerHTML = `✓ ${currentLang === 'it' ? 'prenotato' : 'booked'}`;
      status.textContent = currentLang === 'it'
        ? 'Ti ricontattiamo entro 24h · controlla la mail.'
        : 'We\'ll get back within 24h · check your inbox.';
      setTimeout(() => {
        submit.disabled = false;
        submit.innerHTML = origLabel;
        status.textContent = '';
        form.reset();
      }, 4000);
    }, 1200);
  });

  /* =========== init =========== */
  applyAccent(state.accent || 'gold');
  applyTheme(state.theme || 'dark');
  applyI18n(currentLang);
  applyHeroVariant(state.hero || 'a');
  syncTweakButtons();
})();
