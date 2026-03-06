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
      a.addEventListener('click', function () {
        mobile.classList.remove('is-open');
        burger.classList.remove('is-open');
        burger.setAttribute('aria-expanded', 'false');
        document.body.style.overflow = '';
      });
    });
  }

  /* ── Filter Accordion ────────────────────────────────── */
  document.querySelectorAll('.filter-block__toggle').forEach(function (btn) {
    btn.addEventListener('click', function () {
      var body = this.nextElementSibling;
      var isOpen = this.classList.toggle('is-open');
      body.style.display = isOpen ? '' : 'none';
    });
  });

  /* ── Search within brand select ──────────────────────── */
  document.querySelectorAll('.filter-search').forEach(function (input) {
    var targetId = input.dataset.search;
    var select = document.getElementById(targetId);
    if (!select) return;
    var options = Array.from(select.options);
    input.addEventListener('input', function () {
      var term = this.value.toLowerCase();
      options.forEach(function (opt) {
        if (opt.value === '') { opt.style.display = ''; return; }
        opt.style.display = opt.textContent.toLowerCase().indexOf(term) >= 0 ? '' : 'none';
      });
    });
  });

  /* ── Brand → Model dynamic filter ───────────────────── */
  var modelsScript = document.getElementById('ModelsData');
  var brandSelect = document.getElementById('f-brand');
  var modelSelect = document.getElementById('f-model');
  var modelsData = {};

  if (modelsScript) {
    try { modelsData = JSON.parse(modelsScript.textContent); } catch (e) { /* noop */ }
  }

  if (brandSelect && modelSelect) {
    brandSelect.addEventListener('change', function () {
      var brand = this.options[this.selectedIndex].text;
      modelSelect.innerHTML = '<option value="">Tous les modèles</option>';
      if (brand && modelsData[brand]) {
        modelsData[brand].forEach(function (m) {
          var opt = document.createElement('option');
          opt.value = m.toLowerCase().replace(/[^a-z0-9]+/g, '-');
          opt.textContent = m;
          modelSelect.appendChild(opt);
        });
        modelSelect.disabled = false;
      } else {
        modelSelect.innerHTML = '<option value="">Sélectionnez d\'abord une marque</option>';
        modelSelect.disabled = true;
      }
    });
  }

  /* ── Shortcut buttons (< 20000 km, < 5000€, etc.) ───── */
  document.querySelectorAll('.filter-shortcuts button').forEach(function (btn) {
    btn.addEventListener('click', function () {
      var targetId = this.dataset.max;
      var val = this.dataset.val;
      var target = document.getElementById(targetId);
      if (target) target.value = val;
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

  /* ── Client-side Filtering ───────────────────────────── */
  var cards = Array.from(document.querySelectorAll('#VehicleGrid .vcard'));
  var noResults = document.getElementById('NoResults');
  var countEl = document.getElementById('ResultsCount');
  var applyBtn = document.getElementById('ApplyFilters');
  var resetBtn = document.getElementById('ResetFilters');

  function getVal(id) {
    var el = document.getElementById(id);
    return el ? el.value : '';
  }
  function getNum(id) {
    var v = getVal(id);
    return v === '' ? null : Number(v);
  }

  function applyFilters() {
    var brand = getVal('f-brand');
    var model = getVal('f-model');
    var body = getVal('f-body');
    var fuel = getVal('f-fuel');
    var gearbox = getVal('f-gearbox');
    var seats = getVal('f-seats');
    var critair = getVal('f-critair');
    var color = getVal('f-color');
    var guarantee = getVal('f-guarantee');
    var tva = getVal('f-tva');

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

      if (brand && d.brand !== brand) show = false;
      if (model && d.model !== model) show = false;
      if (body && d.body !== body) show = false;
      if (fuel && d.fuel !== fuel) show = false;
      if (gearbox && d.gearbox !== gearbox) show = false;
      if (seats && d.seats !== seats) show = false;
      if (critair && d.critair !== critair) show = false;
      if (color && d.color !== color) show = false;
      if (guarantee && d.guarantee !== guarantee) show = false;
      if (tva && d.tva !== tva) show = false;

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

    if (typeof closeMobileFilters === 'function') closeMobileFilters();
  }

  if (applyBtn) applyBtn.addEventListener('click', applyFilters);

  if (resetBtn) {
    resetBtn.addEventListener('click', function () {
      document.querySelectorAll('.filters-sidebar select').forEach(function (s) { s.selectedIndex = 0; });
      document.querySelectorAll('.filters-sidebar input').forEach(function (i) { i.value = ''; });
      if (modelSelect) {
        modelSelect.innerHTML = '<option value="">Sélectionnez d\'abord une marque</option>';
        modelSelect.disabled = true;
      }
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
