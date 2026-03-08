/* ════════════════════════════════════════════════════════
   OptiAuto – Main JavaScript
   ════════════════════════════════════════════════════════ */

document.addEventListener('DOMContentLoaded', function () {

  /* ── Mobile Menu ─────────────────────────────────────── */
  var burger = document.getElementById('MenuToggle');
  var mobile = document.getElementById('MobileMenu');
  if (burger && mobile) {
    burger.addEventListener('click', function () {
      var open = mobile.classList.toggle('is-open');
      burger.classList.toggle('is-open', open);
      burger.setAttribute('aria-expanded', open);
      document.body.style.overflow = open ? 'hidden' : '';
    });
    mobile.querySelectorAll('a').forEach(function (a) {
      a.addEventListener('click', function (e) {
        if (a.id === 'OpenGlobalContactMobile') return;
        mobile.classList.remove('is-open');
        burger.classList.remove('is-open');
        burger.setAttribute('aria-expanded', 'false');
        document.body.style.overflow = '';
      });
    });
  }

  /* ── Global Contact Modal ───────────────────────────── */
  var globalOverlay = document.getElementById('GlobalContactOverlay');
  var globalForm = document.getElementById('GlobalContactForm');
  var globalSuccess = document.getElementById('GlobalContactSuccess');

  function openGlobalContact() {
    if (globalOverlay) {
      globalOverlay.classList.add('is-open');
      globalOverlay.setAttribute('aria-hidden', 'false');
      document.body.style.overflow = 'hidden';
    }
    if (mobile && burger) {
      mobile.classList.remove('is-open');
      burger.classList.remove('is-open');
      document.body.style.overflow = 'hidden';
    }
  }
  function closeGlobalContact() {
    if (globalOverlay) {
      globalOverlay.classList.remove('is-open');
      globalOverlay.setAttribute('aria-hidden', 'true');
      document.body.style.overflow = '';
    }
  }

  var openGlobalBtn = document.getElementById('OpenGlobalContact');
  if (openGlobalBtn) openGlobalBtn.addEventListener('click', function (e) { e.preventDefault(); openGlobalContact(); });
  var openGlobalMobile = document.getElementById('OpenGlobalContactMobile');
  if (openGlobalMobile) openGlobalMobile.addEventListener('click', function (e) { e.preventDefault(); openGlobalContact(); });
  var closeGlobalBtn = document.getElementById('CloseGlobalContact');
  if (closeGlobalBtn) closeGlobalBtn.addEventListener('click', closeGlobalContact);
  if (globalOverlay) globalOverlay.addEventListener('click', function (e) { if (e.target === globalOverlay) closeGlobalContact(); });
  document.addEventListener('keydown', function (e) {
    if (e.key === 'Escape' && globalOverlay && globalOverlay.classList.contains('is-open')) closeGlobalContact();
  });

  if (globalForm) {
    globalForm.addEventListener('submit', function (e) {
      e.preventDefault();
      var phone = globalForm.querySelector('[name="contact[phone]"]');
      var msg = globalForm.querySelector('[name="contact[body]"]');
      var phoneErr = document.getElementById('GlobalPhoneError');
      var msgErr = document.getElementById('GlobalMessageError');
      if (phoneErr) phoneErr.style.display = 'none';
      if (msgErr) msgErr.style.display = 'none';
      phone.classList.remove('contact-form__input--error');
      msg.classList.remove('contact-form__input--error');
      var valid = true;
      if (!phone.value.trim()) { if (phoneErr) phoneErr.style.display = 'block'; phone.classList.add('contact-form__input--error'); valid = false; }
      if (!msg.value.trim()) { if (msgErr) msgErr.style.display = 'block'; msg.classList.add('contact-form__input--error'); valid = false; }
      if (!valid) return;
      var submitBtn = document.getElementById('GlobalContactSubmitBtn');
      if (submitBtn) submitBtn.disabled = true;
      var formData = new FormData(globalForm);
      fetch('/contact#contact_form', { method: 'POST', body: formData, headers: { 'Accept': 'text/html' } })
        .then(function () {
          globalForm.style.display = 'none';
          if (globalSuccess) globalSuccess.style.display = 'block';
          setTimeout(closeGlobalContact, 2500);
        })
        .catch(function () { if (submitBtn) submitBtn.disabled = false; })
        .finally(function () { if (submitBtn) submitBtn.disabled = false; });
    });
  }

  /* ── Estimation form (page Vendre / Estimation / Reprise) ── */
  var estimationForm = document.getElementById('EstimationForm');
  var estimationBody = document.getElementById('EstimationBody');
  var estimationSuccess = document.getElementById('EstimationSuccess');
  if (estimationForm && estimationForm.action.indexOf('/contact') !== -1 && estimationBody) {
    estimationForm.addEventListener('submit', function (e) {
      e.preventDefault();
      var get = function (id) { var el = document.getElementById(id); return el ? el.value : ''; };
      var lines = [
        'Email: ' + get('est-email'),
        'Téléphone: ' + get('est-phone'),
        'Immatriculation: ' + get('est-plaque'),
        'Modèle: ' + get('est-modele'),
        'Kilométrage: ' + get('est-km') + (get('est-km') ? ' km' : ''),
        'Année: ' + get('est-annee'),
        'Carburant: ' + (document.getElementById('est-carburant') ? document.getElementById('est-carburant').value : ''),
        'Boîte de vitesse: ' + (document.getElementById('est-boite') ? document.getElementById('est-boite').value : ''),
        'Description: ' + get('est-description')
      ];
      estimationBody.value = lines.join('\n');
      var btn = document.getElementById('EstimationSubmitBtn');
      if (btn) btn.disabled = true;
      fetch(estimationForm.action, { method: 'POST', body: new FormData(estimationForm), headers: { 'Accept': 'text/html' } })
        .then(function () {
          var grid = estimationForm.querySelector('.estimation-grid');
          if (grid) grid.style.display = 'none';
          estimationForm.querySelectorAll('.estimation-form__block').forEach(function (el) { el.style.display = 'none'; });
          var submitWrap = estimationForm.querySelector('.estimation-form__submit');
          if (submitWrap) submitWrap.style.display = 'none';
          if (estimationSuccess) estimationSuccess.style.display = 'block';
        })
        .catch(function () { if (btn) btn.disabled = false; })
        .finally(function () { if (btn) btn.disabled = false; });
    });
  }

  /* ── Search within checklist ─────────────────────────── */
  document.querySelectorAll('.filter-search').forEach(function (input) {
    var targetId = input.dataset.target;
    var list = document.getElementById(targetId);
    if (!list) return;
    var labels = Array.from(list.querySelectorAll('.filter-check'));
    input.addEventListener('input', function () {
      var term = this.value.toLowerCase();
      labels.forEach(function (label) {
        var text = label.querySelector('span').textContent.toLowerCase();
        label.style.display = text.indexOf(term) >= 0 ? '' : 'none';
      });
    });
  });

  /* ── Brand → Model dynamic checkboxes ───────────────── */
  var modelsScript = document.getElementById('ModelsData');
  var brandList = document.getElementById('filter-brand-list');
  var modelList = document.getElementById('filter-model-list');
  var modelsData = {};

  if (modelsScript) {
    try { modelsData = JSON.parse(modelsScript.textContent); } catch (e) { /* noop */ }
  }

  if (brandList && modelList) {
    brandList.addEventListener('change', function () {
      var checked = Array.from(brandList.querySelectorAll('input:checked'));
      modelList.innerHTML = '';

      if (checked.length === 0) {
        modelList.innerHTML = '<span class="filter-hint">Sélectionnez d\'abord une marque</span>';
        applyFilters();
        return;
      }

      checked.forEach(function (cb) {
        var brandName = cb.parentElement.querySelector('span').textContent;
        var models = modelsData[brandName] || [];
        models.forEach(function (m) {
          var label = document.createElement('label');
          label.className = 'filter-check';
          var input = document.createElement('input');
          input.type = 'checkbox';
          input.name = 'model';
          input.value = m.toLowerCase().replace(/[^a-z0-9]+/g, '-');
          var span = document.createElement('span');
          span.textContent = m;
          label.appendChild(input);
          label.appendChild(span);
          modelList.appendChild(label);
          input.addEventListener('change', applyFilters);
        });
      });

      applyFilters();
    });
  }

  /* ── Shortcut buttons ────────────────────────────────── */
  document.querySelectorAll('.filter-shortcuts button').forEach(function (btn) {
    btn.addEventListener('click', function () {
      var targetId = this.dataset.max;
      var val = this.dataset.val;
      var target = document.getElementById(targetId);
      if (target) { target.value = val; applyFilters(); }
    });
  });

  /* ── Mobile filters toggle ───────────────────────────── */
  var mobileToggle = document.getElementById('FiltersMobileToggle');
  var sidebar = document.getElementById('FiltersSidebar');
  var overlay = null;

  if (mobileToggle && sidebar) {
    overlay = document.createElement('div');
    overlay.className = 'filters-overlay';
    document.body.appendChild(overlay);

    function openMobileFilters() {
      sidebar.classList.add('is-open');
      overlay.classList.add('is-open');
      document.body.style.overflow = 'hidden';
    }
    function closeMobileFilters() {
      sidebar.classList.remove('is-open');
      overlay.classList.remove('is-open');
      document.body.style.overflow = '';
    }
    mobileToggle.addEventListener('click', openMobileFilters);
    overlay.addEventListener('click', closeMobileFilters);
  }

  /* ── Client-side Filtering (auto on change) ──────────── */
  var cards = Array.from(document.querySelectorAll('#VehicleGrid .vcard'));
  var noResults = document.getElementById('NoResults');
  var countEl = document.getElementById('ResultsCount');
  var resetBtn = document.getElementById('ResetFilters');

  function getChecked(name) {
    return Array.from(document.querySelectorAll('input[name="' + name + '"]:checked')).map(function (cb) { return cb.value; });
  }
  function getNum(id) {
    var el = document.getElementById(id);
    var v = el ? el.value : '';
    return v === '' ? null : Number(v);
  }

  function matchesFuel(cardFuel, checkedFuels) {
    if (checkedFuels.length === 0) return true;
    var hasAutre = checkedFuels.indexOf('autre') >= 0;
    var mainFuels = checkedFuels.filter(function(f) { return f !== 'autre'; });
    if (mainFuels.indexOf(cardFuel) >= 0) return true;
    if (hasAutre) {
      var knownFuels = ['essence', 'diesel', 'hybride', 'hybride-rechargeable', 'electrique'];
      return knownFuels.indexOf(cardFuel) < 0;
    }
    return false;
  }

  function applyFilters() {
    var brands = getChecked('brand');
    var models = getChecked('model');
    var bodies = getChecked('body');
    var fuels = getChecked('fuel');
    var gearboxes = getChecked('gearbox');
    var seats = getChecked('seats');
    var critairs = getChecked('critair');
    var colors = getChecked('color');
    var tvas = getChecked('tva');

    var priceMin = getNum('f-price-min');
    var priceMax = getNum('f-price-max');
    var kmMin = getNum('f-km-min');
    var kmMax = getNum('f-km-max');
    var yearMin = getNum('f-year-min');
    var yearMax = getNum('f-year-max');
    var powerMin = getNum('f-power-min');
    var powerMax = getNum('f-power-max');

    var shown = 0;

    cards.forEach(function (c) {
      var show = true;
      var d = c.dataset;

      if (brands.length && brands.indexOf(d.brand) < 0) show = false;
      if (models.length && models.indexOf(d.model) < 0) show = false;
      if (bodies.length && bodies.indexOf(d.body) < 0) show = false;
      if (!matchesFuel(d.fuel, fuels)) show = false;
      if (gearboxes.length && gearboxes.indexOf(d.gearbox) < 0) show = false;
      if (seats.length && seats.indexOf(d.seats) < 0) show = false;
      if (critairs.length && critairs.indexOf(d.critair) < 0) show = false;
      if (colors.length && colors.indexOf(d.color) < 0) show = false;
      if (tvas.length && tvas.indexOf(d.tva) < 0) show = false;

      var price = parseInt(d.price, 10) / 100;
      if (priceMin !== null && price < priceMin) show = false;
      if (priceMax !== null && price > priceMax) show = false;

      var km = parseInt(d.km, 10);
      if (kmMin !== null && km < kmMin) show = false;
      if (kmMax !== null && km > kmMax) show = false;

      var year = parseInt(d.year, 10);
      if (yearMin !== null && year < yearMin) show = false;
      if (yearMax !== null && year > yearMax) show = false;

      var power = parseInt(d.power, 10);
      if (powerMin !== null && !isNaN(power) && power < powerMin) show = false;
      if (powerMax !== null && !isNaN(power) && power > powerMax) show = false;

      c.style.display = show ? '' : 'none';
      if (show) shown++;
    });

    if (noResults) noResults.style.display = (shown === 0 && cards.length > 0) ? '' : 'none';
    if (countEl) countEl.textContent = shown + ' véhicule' + (shown > 1 ? 's' : '');
  }

  // Auto-apply on any checkbox change
  document.querySelectorAll('.filters-sidebar input[type="checkbox"]').forEach(function (cb) {
    cb.addEventListener('change', applyFilters);
  });

  // Auto-apply on range input change (debounced)
  var rangeTimer;
  document.querySelectorAll('.filters-sidebar input[type="number"]').forEach(function (input) {
    input.addEventListener('input', function () {
      clearTimeout(rangeTimer);
      rangeTimer = setTimeout(applyFilters, 400);
    });
  });

  if (resetBtn) {
    resetBtn.addEventListener('click', function () {
      document.querySelectorAll('.filters-sidebar input[type="checkbox"]').forEach(function (cb) { cb.checked = false; });
      document.querySelectorAll('.filters-sidebar input[type="number"]').forEach(function (i) { i.value = ''; });
      document.querySelectorAll('.filter-search').forEach(function (s) { s.value = ''; s.dispatchEvent(new Event('input')); });
      if (modelList) modelList.innerHTML = '<span class="filter-hint">Sélectionnez d\'abord une marque</span>';
      cards.forEach(function (c) { c.style.display = ''; });
      if (noResults) noResults.style.display = 'none';
      if (countEl) countEl.textContent = cards.length + ' véhicule' + (cards.length > 1 ? 's' : '');
    });
  }

  /* ── Sorting ──────────────────────────────────────────── */
  var sortSelect = document.getElementById('SortBy');
  var grid = document.getElementById('VehicleGrid');

  if (sortSelect && grid) {
    sortSelect.addEventListener('change', function () {
      var key = this.value;
      var sorted = cards.slice().sort(function (a, b) {
        switch (key) {
          case 'price-asc': return parseInt(a.dataset.price) - parseInt(b.dataset.price);
          case 'price-desc': return parseInt(b.dataset.price) - parseInt(a.dataset.price);
          case 'km-asc': return parseInt(a.dataset.km) - parseInt(b.dataset.km);
          case 'km-desc': return parseInt(b.dataset.km) - parseInt(a.dataset.km);
          case 'date-desc': return parseInt(b.dataset.year) - parseInt(a.dataset.year);
          default: return 0;
        }
      });
      sorted.forEach(function (c) { grid.appendChild(c); });
    });
  }

});
