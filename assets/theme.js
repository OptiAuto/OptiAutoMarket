/* ════════════════════════════════════════════════════════
   OptiAuto – Main JavaScript
   ════════════════════════════════════════════════════════ */

document.addEventListener('DOMContentLoaded', function () {

  /* ── Mobile Menu ─────────────────────────────────────── */
  const burger = document.getElementById('MenuToggle');
  const mobile = document.getElementById('MobileMenu');
  if (burger && mobile) {
    burger.addEventListener('click', function () {
      const open = mobile.classList.toggle('is-open');
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

  /* ── Brand → Model dynamic filter ───────────────────── */
  const modelsScript = document.getElementById('ModelsData');
  const brandSelect = document.getElementById('f-brand');
  const modelSelect = document.getElementById('f-model');
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
        modelSelect.disabled = true;
      }
    });
  }

  /* ── Toggle more filters ─────────────────────────────── */
  var moreBtn = document.getElementById('ToggleMoreFilters');
  var extraRow = document.getElementById('ExtraFilters');
  if (moreBtn && extraRow) {
    moreBtn.addEventListener('click', function () {
      var visible = extraRow.style.display !== 'none';
      extraRow.style.display = visible ? 'none' : 'flex';
      moreBtn.textContent = visible ? 'Plus de filtres' : 'Moins de filtres';
    });
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
    var trans = getVal('f-transmission');
    var seats = getVal('f-seats');
    var critair = getVal('f-critair');
    var color = getVal('f-color');
    var priceMin = getNum('f-price-min');
    var priceMax = getNum('f-price-max');
    var kmMin = getNum('f-km-min');
    var kmMax = getNum('f-km-max');
    var yearMin = getNum('f-year-min');
    var yearMax = getNum('f-year-max');

    var shown = 0;

    cards.forEach(function (c) {
      var show = true;
      var d = c.dataset;

      if (brand && d.brand !== brand) show = false;
      if (model && d.model !== model) show = false;
      if (body && d.body !== body) show = false;
      if (fuel && d.fuel !== fuel) show = false;
      if (gearbox && d.gearbox !== gearbox) show = false;
      if (trans && d.transmission !== trans) show = false;
      if (seats && d.seats !== seats) show = false;
      if (critair && d.critair !== critair) show = false;
      if (color && d.color !== color) show = false;

      var price = parseInt(d.price, 10) / 100;
      if (priceMin !== null && price < priceMin) show = false;
      if (priceMax !== null && price > priceMax) show = false;

      var km = parseInt(d.km, 10);
      if (kmMin !== null && km < kmMin) show = false;
      if (kmMax !== null && km > kmMax) show = false;

      var year = parseInt(d.year, 10);
      if (yearMin !== null && year < yearMin) show = false;
      if (yearMax !== null && year > yearMax) show = false;

      c.style.display = show ? '' : 'none';
      if (show) shown++;
    });

    if (noResults) noResults.style.display = (shown === 0 && cards.length > 0) ? '' : 'none';
    if (countEl) countEl.textContent = shown + ' véhicule' + (shown > 1 ? 's' : '');
  }

  if (applyBtn) applyBtn.addEventListener('click', applyFilters);

  if (resetBtn) {
    resetBtn.addEventListener('click', function () {
      document.querySelectorAll('.filters select').forEach(function (s) { s.selectedIndex = 0; });
      document.querySelectorAll('.filters input').forEach(function (i) { i.value = ''; });
      if (modelSelect) modelSelect.disabled = true;
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
