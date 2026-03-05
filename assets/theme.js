/**
 * OptiAuto Market - Theme JavaScript
 * Filtres véhicules, tri, menu mobile, galerie marque→modèle
 */

document.addEventListener('DOMContentLoaded', function () {

  /* ═══════ MOBILE MENU ═══════ */
  var menuToggle = document.getElementById('MenuToggle');
  var mobileMenu = document.getElementById('MobileMenu');
  if (menuToggle && mobileMenu) {
    menuToggle.addEventListener('click', function () {
      var open = mobileMenu.classList.toggle('is-open');
      menuToggle.setAttribute('aria-expanded', open);
      mobileMenu.setAttribute('aria-hidden', !open);
    });
  }

  /* ═══════ MODELS DATA (marque → modèle) ═══════ */
  var modelsData = {};
  var modelsScript = document.getElementById('ModelsData');
  if (modelsScript) {
    try { modelsData = JSON.parse(modelsScript.textContent); } catch (e) { /* silent */ }
  }

  /* ═══════ BRAND → MODEL DEPENDENCY ═══════ */
  var brandSelect = document.getElementById('f-brand');
  var modelSelect = document.getElementById('f-model');
  if (brandSelect && modelSelect) {
    brandSelect.addEventListener('change', function () {
      var brandHandle = brandSelect.value;
      modelSelect.innerHTML = '<option value="">Tous les modèles</option>';
      if (!brandHandle) { modelSelect.disabled = true; return; }
      var brandName = brandSelect.options[brandSelect.selectedIndex].textContent;
      var models = modelsData[brandName] || [];
      if (models.length === 0) { modelSelect.disabled = true; return; }
      modelSelect.disabled = false;
      models.forEach(function (m) {
        var opt = document.createElement('option');
        opt.value = m.toLowerCase().replace(/[^a-z0-9]+/g, '-');
        opt.textContent = m;
        modelSelect.appendChild(opt);
      });
    });
  }

  /* ═══════ MORE FILTERS TOGGLE ═══════ */
  var toggleBtn = document.getElementById('ToggleMoreFilters');
  var extraFilters = document.getElementById('ExtraFilters');
  if (toggleBtn && extraFilters) {
    toggleBtn.addEventListener('click', function () {
      var visible = extraFilters.style.display !== 'none';
      extraFilters.style.display = visible ? 'none' : 'flex';
      toggleBtn.textContent = visible ? 'Plus de filtres' : 'Moins de filtres';
    });
  }

  /* ═══════ CLIENT-SIDE FILTERING ═══════ */
  var applyBtn = document.getElementById('ApplyFilters');
  var resetBtn = document.getElementById('ResetFilters');
  var grid = document.getElementById('VehicleGrid');
  var noResults = document.getElementById('NoResults');
  var resultsCount = document.getElementById('ResultsCount');

  function getVal(id) {
    var el = document.getElementById(id);
    return el ? el.value : '';
  }
  function getNum(id) {
    var v = getVal(id);
    return v ? parseInt(v, 10) : null;
  }

  function applyFilters() {
    if (!grid) return;
    var cards = grid.querySelectorAll('.vcard');
    var brand = getVal('f-brand');
    var model = getVal('f-model');
    var body = getVal('f-body');
    var fuel = getVal('f-fuel');
    var gearbox = getVal('f-gearbox');
    var transmission = getVal('f-transmission');
    var seats = getVal('f-seats');
    var critair = getVal('f-critair');
    var color = getVal('f-color');
    var priceMin = getNum('f-price-min');
    var priceMax = getNum('f-price-max');
    var kmMin = getNum('f-km-min');
    var kmMax = getNum('f-km-max');
    var yearMin = getNum('f-year-min');
    var yearMax = getNum('f-year-max');

    var visible = 0;
    cards.forEach(function (card) {
      var show = true;
      if (brand && card.dataset.brand !== brand) show = false;
      if (model && card.dataset.model !== model) show = false;
      if (body && card.dataset.body !== body) show = false;
      if (fuel && card.dataset.fuel !== fuel) show = false;
      if (gearbox && card.dataset.gearbox !== gearbox) show = false;
      if (transmission && card.dataset.transmission !== transmission) show = false;
      if (seats && card.dataset.seats !== seats) show = false;
      if (critair && card.dataset.critair !== critair) show = false;
      if (color && card.dataset.color !== color) show = false;

      var cardPrice = parseInt(card.dataset.price, 10) / 100;
      var cardKm = parseInt(card.dataset.km, 10);
      var cardYear = parseInt(card.dataset.year, 10);

      if (priceMin !== null && cardPrice < priceMin) show = false;
      if (priceMax !== null && cardPrice > priceMax) show = false;
      if (kmMin !== null && cardKm < kmMin) show = false;
      if (kmMax !== null && cardKm > kmMax) show = false;
      if (yearMin !== null && cardYear < yearMin) show = false;
      if (yearMax !== null && cardYear > yearMax) show = false;

      card.style.display = show ? '' : 'none';
      if (show) visible++;
    });

    if (noResults) noResults.style.display = visible === 0 ? '' : 'none';
    if (resultsCount) {
      resultsCount.textContent = visible + ' véhicule' + (visible > 1 ? 's' : '');
    }
  }

  if (applyBtn) applyBtn.addEventListener('click', applyFilters);

  if (resetBtn) {
    resetBtn.addEventListener('click', function () {
      var selects = document.querySelectorAll('.filters select');
      selects.forEach(function (s) { s.selectedIndex = 0; });
      var inputs = document.querySelectorAll('.filters input');
      inputs.forEach(function (i) { i.value = ''; });
      if (modelSelect) { modelSelect.innerHTML = '<option value="">Tous les modèles</option>'; modelSelect.disabled = true; }
      applyFilters();
    });
  }

  /* ═══════ SORTING ═══════ */
  var sortSelect = document.getElementById('SortBy');
  if (sortSelect && grid) {
    sortSelect.addEventListener('change', function () {
      var cards = Array.from(grid.querySelectorAll('.vcard'));
      var sort = sortSelect.value;
      cards.sort(function (a, b) {
        switch (sort) {
          case 'price-asc': return (parseInt(a.dataset.price)||0) - (parseInt(b.dataset.price)||0);
          case 'price-desc': return (parseInt(b.dataset.price)||0) - (parseInt(a.dataset.price)||0);
          case 'km-asc': return (parseInt(a.dataset.km)||0) - (parseInt(b.dataset.km)||0);
          case 'km-desc': return (parseInt(b.dataset.km)||0) - (parseInt(a.dataset.km)||0);
          case 'date-desc': return (parseInt(b.dataset.year)||0) - (parseInt(a.dataset.year)||0);
          default: return 0;
        }
      });
      cards.forEach(function (c) { grid.appendChild(c); });
    });
  }

});
