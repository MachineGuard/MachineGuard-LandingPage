(function () {
  'use strict';

  var DICT = window.MG_I18N;
  var CFG = window.MG_CONFIG;
  var lang = 'en';

  function t(key) {
    return (DICT[lang] && DICT[lang][key]) || DICT.en[key] || key;
  }

  /* ---------- i18n ---------- */
  function applyLang(next, persist) {
    lang = DICT[next] ? next : 'en';
    document.documentElement.lang = lang === 'es' ? 'es-419' : 'en';
    document.querySelectorAll('[data-i18n]').forEach(function (el) { el.textContent = t(el.dataset.i18n); });
    document.querySelectorAll('[data-i18n-aria]').forEach(function (el) { el.setAttribute('aria-label', t(el.dataset.i18nAria)); });
    document.querySelectorAll('[data-lang]').forEach(function (b) { b.setAttribute('aria-pressed', String(b.dataset.lang === lang)); });
    document.title = lang === 'es'
      ? 'MachineGuard – Monitoreo de temperatura y humedad de bajo costo para almacenes'
      : 'MachineGuard – Low-cost temperature & humidity monitoring for warehouses';
    if (persist) { try { localStorage.setItem('mg-lang', lang); } catch (e) { /* storage unavailable */ } }
    renderCalcResult();
  }

  function initialLang() {
    var q = new URLSearchParams(location.search).get('lang');
    if (q && DICT[q]) return q;
    try { var s = localStorage.getItem('mg-lang'); if (s && DICT[s]) return s; } catch (e) { /* ignore */ }
    return /^es/i.test(navigator.language || '') ? 'es' : 'en';
  }

  document.querySelectorAll('[data-lang]').forEach(function (b) {
    b.addEventListener('click', function () { applyLang(b.dataset.lang, true); });
  });

  /* ---------- Mobile menu ---------- */
  var menuBtn = document.querySelector('.menu-toggle');
  var nav = document.getElementById('main-nav');
  menuBtn.addEventListener('click', function () {
    var open = nav.classList.toggle('open');
    menuBtn.setAttribute('aria-expanded', String(open));
  });
  nav.addEventListener('click', function (e) {
    if (e.target.tagName === 'A') { nav.classList.remove('open'); menuBtn.setAttribute('aria-expanded', 'false'); }
  });

  /* ---------- Tabs ---------- */
  var tabs = Array.prototype.slice.call(document.querySelectorAll('[role="tab"]'));
  function selectTab(tab) {
    tabs.forEach(function (x) {
      var on = x === tab;
      x.setAttribute('aria-selected', String(on));
      x.tabIndex = on ? 0 : -1;
      document.getElementById(x.getAttribute('aria-controls')).hidden = !on;
    });
  }
  tabs.forEach(function (tab, i) {
    tab.addEventListener('click', function () { selectTab(tab); });
    tab.addEventListener('keydown', function (e) {
      var n = null;
      if (e.key === 'ArrowRight') n = tabs[(i + 1) % tabs.length];
      if (e.key === 'ArrowLeft') n = tabs[(i - 1 + tabs.length) % tabs.length];
      if (n) { e.preventDefault(); selectTab(n); n.focus(); }
    });
  });

  /* ---------- Avoided-loss calculator (US14) ---------- */
  var calcForm = document.getElementById('calc-form');
  var calcValue = document.getElementById('calc-value');
  var calcRate = document.getElementById('calc-rate');
  var calcOut = document.getElementById('calc-output');
  var calcDetail = document.getElementById('calc-detail');
  var lastEstimate = null;

  function money(n) {
    return 'S/ ' + n.toLocaleString(lang === 'es' ? 'es-PE' : 'en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  }

  function setFieldError(input, key) {
    var field = input.closest('.field');
    var err = field.querySelector('.error');
    field.classList.toggle('invalid', !!key);
    input.setAttribute('aria-invalid', key ? 'true' : 'false');
    err.textContent = key ? t(key) : '';
    err.dataset.key = key || '';
  }

  function validateCalc() {
    var value = parseFloat(calcValue.value);
    var rate = parseFloat(calcRate.value);
    var ok = true;
    if (calcValue.value === '') { setFieldError(calcValue, 'calc.err.required'); ok = false; }
    else if (!(value > 0)) { setFieldError(calcValue, 'calc.err.positive'); ok = false; }
    else setFieldError(calcValue, '');
    if (calcRate.value === '') { setFieldError(calcRate, 'calc.err.required'); ok = false; }
    else if (!(rate >= 0.1 && rate <= 100)) { setFieldError(calcRate, 'calc.err.rate'); ok = false; }
    else setFieldError(calcRate, '');
    return ok ? { value: value, rate: rate } : null;
  }

  function renderCalcResult() {
    document.querySelectorAll('.error[data-key]').forEach(function (e) { if (e.dataset.key) e.textContent = t(e.dataset.key); });
    if (!lastEstimate) { calcOut.textContent = 'S/ —'; calcDetail.textContent = t('calc.resultHelp'); return; }
    calcOut.textContent = money(lastEstimate.avoided);
    calcDetail.textContent = t('calc.resultDetail').replace('{loss}', money(lastEstimate.loss));
  }

  calcForm.addEventListener('submit', function (e) {
    e.preventDefault();
    var v = validateCalc();
    if (!v) { lastEstimate = null; renderCalcResult(); return; }
    var loss = v.value * (v.rate / 100);
    lastEstimate = { loss: loss, avoided: loss * CFG.avoidedLossReduction };
    renderCalcResult();
  });
  [calcValue, calcRate].forEach(function (i) { i.addEventListener('input', function () { if (i.closest('.field').classList.contains('invalid')) validateCalc(); }); });

  /* ---------- Pilot request (US15) ---------- */
  var dialog = document.getElementById('pilot-dialog');
  var form = document.getElementById('pilot-form');
  var success = document.getElementById('pilot-success');
  var status = document.getElementById('pilot-status');
  var lastOpener = null;

  function openPilot(opener) {
    lastOpener = opener;
    form.hidden = false; success.hidden = true; status.textContent = '';
    if (lastEstimate) form.elements.estimatedMonthlyLoss.value = lastEstimate.loss.toFixed(2);
    if (typeof dialog.showModal === 'function') dialog.showModal(); else dialog.setAttribute('open', '');
    form.elements.companyName.focus();
  }
  function closePilot() {
    if (typeof dialog.close === 'function') dialog.close(); else dialog.removeAttribute('open');
    if (lastOpener) lastOpener.focus();
  }
  document.querySelectorAll('.js-open-pilot').forEach(function (b) { b.addEventListener('click', function () { openPilot(b); }); });
  document.querySelectorAll('.js-close-pilot').forEach(function (b) { b.addEventListener('click', closePilot); });
  dialog.addEventListener('click', function (e) { if (e.target === dialog) closePilot(); });

  var EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
  var PHONE_RE = /^\+?[0-9\s().-]{7,20}$/;

  function fieldError(el, key) {
    var field = el.closest('.field');
    field.classList.toggle('invalid', !!key);
    el.setAttribute('aria-invalid', key ? 'true' : 'false');
    var err = field.querySelector('.error');
    if (err) { err.textContent = key ? t(key) : ''; err.dataset.key = key || ''; }
  }

  function validatePilot() {
    var f = form.elements, ok = true, firstBad = null;
    function bad(el, key) { fieldError(el, key); ok = false; if (!firstBad) firstBad = el; }
    ['companyName', 'contactName'].forEach(function (n) { f[n].value.trim() ? fieldError(f[n], '') : bad(f[n], 'pilot.err.required'); });
    if (!f.contactEmail.value.trim()) bad(f.contactEmail, 'pilot.err.required');
    else if (!EMAIL_RE.test(f.contactEmail.value.trim())) bad(f.contactEmail, 'pilot.err.email'); else fieldError(f.contactEmail, '');
    if (!f.contactPhone.value.trim()) bad(f.contactPhone, 'pilot.err.required');
    else if (!PHONE_RE.test(f.contactPhone.value.trim())) bad(f.contactPhone, 'pilot.err.phone'); else fieldError(f.contactPhone, '');
    f.industry.value ? fieldError(f.industry, '') : bad(f.industry, 'pilot.err.required');
    f.acceptTerms.checked ? fieldError(f.acceptTerms, '') : bad(f.acceptTerms, 'pilot.err.terms');
    if (firstBad) firstBad.focus();
    return ok;
  }

  function buildPayload() {
    var f = form.elements;
    var loss = f.estimatedMonthlyLoss.value;
    return {
      companyName: f.companyName.value.trim(),
      contactName: f.contactName.value.trim(),
      contactEmail: f.contactEmail.value.trim().toLowerCase(),
      contactPhone: f.contactPhone.value.trim(),
      industry: f.industry.value,
      estimatedMonthlyLoss: loss === '' ? null : Number(loss)
    };
  }

  function sendPilot(payload) {
    if (!CFG.apiBaseUrl) {
      console.info('[MachineGuard] Demo mode: apiBaseUrl is empty, pilot request not sent.', payload);
      return new Promise(function (r) { setTimeout(r, 500); });
    }
    return fetch(CFG.apiBaseUrl.replace(/\/$/, '') + CFG.pilotRequestPath, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Accept-Language': lang },
      body: JSON.stringify(payload)
    }).then(function (res) { if (!res.ok) throw new Error('HTTP ' + res.status); });
  }

  form.addEventListener('submit', function (e) {
    e.preventDefault();
    status.textContent = '';
    if (!validatePilot()) return;
    var btn = form.querySelector('[type="submit"]');
    btn.disabled = true; btn.textContent = t('pilot.sending');
    sendPilot(buildPayload()).then(function () {
      form.hidden = true; success.hidden = false; form.reset();
      success.querySelector('button').focus();
    }).catch(function () {
      status.textContent = t('pilot.err.network');
    }).then(function () {
      btn.disabled = false; btn.textContent = t('pilot.submit');
    });
  });

  /* ---------- Init ---------- */
  applyLang(initialLang(), false);
})();
