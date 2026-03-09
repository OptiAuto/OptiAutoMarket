/* ════════════════════════════════════════════════════════
   OptiAuto Admin – JavaScript
   ════════════════════════════════════════════════════════ */
(function () {
  'use strict';

  let jwtToken = '';
  let csrfToken = '';
  let allProducts = [];
  let editingId = null;
  let sessionTimer = null;
  let confirmCallback = null;

  const $ = (id) => document.getElementById(id);

  /* ─── Toast ─────────────────────────────── */
  function toast(msg, type) {
    var t = $('toast');
    t.textContent = msg;
    t.className = 'toast show' + (type ? ' toast--' + type : '');
    clearTimeout(t._timer);
    t._timer = setTimeout(function () { t.className = 'toast'; }, 3500);
  }

  /* ─── Confirm Dialog ────────────────────── */
  function showConfirm(title, msg, cb) {
    $('confirmTitle').textContent = title;
    $('confirmMsg').textContent = msg;
    $('confirmOverlay').classList.add('is-open');
    confirmCallback = cb;
  }
  $('confirmYes').addEventListener('click', function () {
    $('confirmOverlay').classList.remove('is-open');
    if (confirmCallback) confirmCallback();
    confirmCallback = null;
  });
  $('confirmNo').addEventListener('click', function () {
    $('confirmOverlay').classList.remove('is-open');
    confirmCallback = null;
  });

  /* ─── API Helper ────────────────────────── */
  function api(url, opts) {
    opts = opts || {};
    var headers = Object.assign({}, opts.headers || {}, {
      'Authorization': 'Bearer ' + jwtToken
    });
    if (csrfToken) headers['X-CSRF-Token'] = csrfToken;

    if (opts.body && typeof opts.body === 'object' && !(opts.body instanceof FormData)) {
      headers['Content-Type'] = 'application/json';
      opts.body = JSON.stringify(opts.body);
    }
    opts.headers = headers;

    return fetch(url, opts).then(function (r) {
      if (r.status === 401) { logout(); throw new Error('Session expirée'); }
      if (r.status === 403) {
        refreshCsrf();
        throw new Error('Token CSRF expiré, réessayez');
      }
      return r.json();
    });
  }

  function refreshCsrf() {
    fetch('/api/csrf', { headers: { 'Authorization': 'Bearer ' + jwtToken } })
      .then(function (r) { return r.json(); })
      .then(function (d) { if (d.csrfToken) csrfToken = d.csrfToken; })
      .catch(function () {});
  }

  /* ─── Auth ──────────────────────────────── */
  function doLogin() {
    var pw = $('loginPassword').value;
    if (!pw) return;
    var btn = $('loginBtn');
    btn.disabled = true;
    btn.textContent = 'Connexion...';

    fetch('/api/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ password: pw })
    })
    .then(function (r) { return r.json(); })
    .then(function (d) {
      if (d.ok && d.token) {
        jwtToken = d.token;
        csrfToken = d.csrfToken || '';
        sessionStorage.setItem('oa_jwt', jwtToken);
        sessionStorage.setItem('oa_csrf', csrfToken);
        showApp();
      } else {
        var err = $('loginError');
        err.textContent = d.error || 'Mot de passe incorrect';
        err.style.display = 'block';
      }
    })
    .catch(function (e) {
      var err = $('loginError');
      err.textContent = e.message || 'Erreur de connexion';
      err.style.display = 'block';
    })
    .finally(function () { btn.disabled = false; btn.textContent = 'Se connecter'; });
  }

  function logout() {
    jwtToken = '';
    csrfToken = '';
    sessionStorage.removeItem('oa_jwt');
    sessionStorage.removeItem('oa_csrf');
    clearInterval(sessionTimer);
    $('app').style.display = 'none';
    $('loginPage').style.display = 'flex';
    $('loginPassword').value = '';
    $('loginError').style.display = 'none';
  }

  function showApp() {
    $('loginPage').style.display = 'none';
    $('app').style.display = 'block';
    updateSessionInfo();
    sessionTimer = setInterval(updateSessionInfo, 60000);
    showList();
  }

  function updateSessionInfo() {
    try {
      var parts = jwtToken.split('.');
      var payload = JSON.parse(atob(parts[1]));
      var exp = payload.exp * 1000;
      var remaining = Math.max(0, Math.round((exp - Date.now()) / 60000));
      $('sessionInfo').textContent = remaining > 0 ? 'Session: ' + remaining + ' min' : '';
      if (remaining <= 0) logout();
    } catch (e) { /* noop */ }
  }

  /* ─── Auto-restore Session ─────────────── */
  (function () {
    var t = sessionStorage.getItem('oa_jwt');
    var c = sessionStorage.getItem('oa_csrf');
    if (t) {
      try {
        var payload = JSON.parse(atob(t.split('.')[1]));
        if (payload.exp * 1000 > Date.now()) {
          jwtToken = t;
          csrfToken = c || '';
          showApp();
          return;
        }
      } catch (e) { /* invalid */ }
      sessionStorage.removeItem('oa_jwt');
      sessionStorage.removeItem('oa_csrf');
    }
  })();

  /* ─── Navigation ────────────────────────── */
  function showList() {
    $('listPage').style.display = 'block';
    $('formPage').style.display = 'none';
    editingId = null;
    loadProducts();
  }

  function showForm(id) {
    $('listPage').style.display = 'none';
    $('formPage').style.display = 'block';
    $('formTitle').textContent = id ? 'Modifier le véhicule' : 'Ajouter un véhicule';
    $('deleteBtn').style.display = id ? 'inline-flex' : 'none';
    editingId = id || null;
    resetForm();
    activateTab('tab-general');
    if (id) loadProduct(id);
    window.scrollTo(0, 0);
  }

  /* ─── Tabs ──────────────────────────────── */
  function activateTab(tabId) {
    document.querySelectorAll('.tab').forEach(function (t) {
      t.classList.toggle('is-active', t.dataset.tab === tabId);
    });
    document.querySelectorAll('.tab-panel').forEach(function (p) {
      p.classList.toggle('is-active', p.id === tabId);
    });
  }

  $('formTabs').addEventListener('click', function (e) {
    var tab = e.target.closest('.tab');
    if (tab && tab.dataset.tab) activateTab(tab.dataset.tab);
  });

  /* ─── Products List ─────────────────────── */
  function loadProducts() {
    $('productsTable').innerHTML = '<div class="loading"><div class="spinner"></div>Chargement...</div>';
    api('/api/products')
      .then(function (data) {
        allProducts = Array.isArray(data) ? data : [];
        renderProducts();
      })
      .catch(function (e) { toast(e.message, 'error'); });
  }

  function renderProducts(filter) {
    var list = allProducts;
    if (filter) {
      var term = filter.toLowerCase();
      list = allProducts.filter(function (p) {
        var text = (p.vendor + ' ' + (p.meta && p.meta.model || '') + ' ' + (p.meta && p.meta.trim || '')).toLowerCase();
        return text.indexOf(term) >= 0;
      });
    }

    var active = allProducts.filter(function (p) { return p.status === 'active'; }).length;
    $('statTotal').textContent = allProducts.length;
    $('statActive').textContent = active;
    $('statDraft').textContent = allProducts.length - active;

    if (!list.length) {
      $('productsTable').innerHTML = '<div class="loading">' + (filter ? 'Aucun résultat pour "' + filter + '"' : 'Aucun véhicule') + '</div>';
      return;
    }

    var table = document.createElement('table');
    var thead = document.createElement('thead');
    thead.innerHTML = '<tr><th></th><th>Véhicule</th><th>Prix</th><th>Année</th><th>Km</th><th>Statut</th><th>Actions</th></tr>';
    table.appendChild(thead);

    var tbody = document.createElement('tbody');
    list.forEach(function (p) {
      var tr = document.createElement('tr');

      var tdImg = document.createElement('td');
      var img = document.createElement('img');
      img.src = p.image || 'data:image/svg+xml,' + encodeURIComponent('<svg xmlns="http://www.w3.org/2000/svg" width="64" height="48"><rect fill="#edf2f7" width="64" height="48" rx="8"/><text x="32" y="28" text-anchor="middle" fill="#a0aec0" font-size="10">?</text></svg>');
      img.alt = '';
      img.loading = 'lazy';
      tdImg.appendChild(img);

      var tdName = document.createElement('td');
      var nd = document.createElement('div');
      nd.className = 'product-name';
      nd.textContent = p.vendor + ' ' + (p.meta && p.meta.model || '');
      var md = document.createElement('div');
      md.className = 'product-meta';
      md.textContent = ((p.meta && p.meta.trim || '') + ' ' + (p.meta && p.meta.engine || '')).trim();
      tdName.appendChild(nd);
      tdName.appendChild(md);

      var tdPrice = document.createElement('td');
      var strong = document.createElement('strong');
      strong.textContent = p.price ? new Intl.NumberFormat('fr-FR').format(p.price) + ' €' : '-';
      tdPrice.appendChild(strong);

      var tdYear = document.createElement('td');
      tdYear.textContent = (p.meta && p.meta.year) || '-';

      var tdKm = document.createElement('td');
      tdKm.textContent = (p.meta && p.meta.mileage) ? new Intl.NumberFormat('fr-FR').format(p.meta.mileage) + ' km' : '-';

      var tdStatus = document.createElement('td');
      var badge = document.createElement('span');
      badge.className = 'status-badge ' + (p.status === 'active' ? 'status-badge--active' : 'status-badge--draft');
      badge.textContent = p.status === 'active' ? 'En ligne' : 'Brouillon';
      tdStatus.appendChild(badge);

      var tdActions = document.createElement('td');
      var actDiv = document.createElement('div');
      actDiv.className = 'actions-cell';

      var editBtn = document.createElement('button');
      editBtn.className = 'btn btn--ghost btn--sm';
      editBtn.textContent = 'Modifier';
      editBtn.addEventListener('click', function () { showForm(p.id); });

      var toggleBtn = document.createElement('button');
      toggleBtn.className = 'btn btn--sm ' + (p.status === 'active' ? 'btn--ghost' : 'btn--green');
      toggleBtn.textContent = p.status === 'active' ? 'Désactiver' : 'Activer';
      toggleBtn.addEventListener('click', function () {
        toggleStatus(p.id, p.status === 'active' ? 'draft' : 'active');
      });

      var delBtn = document.createElement('button');
      delBtn.className = 'btn btn--danger btn--sm';
      delBtn.textContent = 'Suppr.';
      delBtn.addEventListener('click', function () {
        showConfirm(
          'Supprimer ce véhicule ?',
          p.vendor + ' ' + (p.meta && p.meta.model || '') + ' – Cette action est irréversible.',
          function () { deleteProduct(p.id); }
        );
      });

      actDiv.appendChild(editBtn);
      actDiv.appendChild(toggleBtn);
      actDiv.appendChild(delBtn);
      tdActions.appendChild(actDiv);

      tr.appendChild(tdImg);
      tr.appendChild(tdName);
      tr.appendChild(tdPrice);
      tr.appendChild(tdYear);
      tr.appendChild(tdKm);
      tr.appendChild(tdStatus);
      tr.appendChild(tdActions);
      tbody.appendChild(tr);
    });

    table.appendChild(tbody);
    $('productsTable').innerHTML = '';
    $('productsTable').appendChild(table);
  }

  /* ─── Search ────────────────────────────── */
  var searchTimer;
  $('searchInput').addEventListener('input', function () {
    clearTimeout(searchTimer);
    var val = this.value;
    searchTimer = setTimeout(function () { renderProducts(val); }, 300);
  });

  /* ─── Toggle Status ─────────────────────── */
  function toggleStatus(id, status) {
    api('/api/products/' + id + '/status', { method: 'PATCH', body: { status: status } })
      .then(function () {
        toast(status === 'active' ? 'Véhicule activé' : 'Véhicule désactivé', 'success');
        loadProducts();
      })
      .catch(function (e) { toast(e.message, 'error'); });
  }

  /* ─── Delete Product ────────────────────── */
  function deleteProduct(id) {
    api('/api/products/' + id, { method: 'DELETE' })
      .then(function () {
        toast('Véhicule supprimé', 'success');
        if (editingId === id) showList();
        else loadProducts();
      })
      .catch(function (e) { toast(e.message, 'error'); });
  }

  /* ─── Form Reset ────────────────────────── */
  function resetForm() {
    $('vehicleForm').reset();
    $('fId').value = '';
    $('fVariantId').value = '';
    $('imagesGrid').innerHTML = '';
    $('maintenanceList').innerHTML = '';
    $('videoPreview').innerHTML = '';
    $('imagesNotSaved').style.display = editingId ? 'none' : 'block';
    $('saveBtn').textContent = 'Enregistrer';
    $('saveBtn').disabled = false;
    window._editMetaIds = {};
    addMaintenanceRow('', '');
  }

  /* ─── Load Product ──────────────────────── */
  function loadProduct(id) {
    api('/api/products/' + id)
      .then(function (p) {
        $('fId').value = p.id;
        $('fVariantId').value = p.variant_id || '';
        $('fVendor').value = p.vendor || '';
        $('fModel').value = (p.meta && p.meta.model) || '';
        $('fTrim').value = (p.meta && p.meta.trim) || '';
        $('fEngine').value = (p.meta && p.meta.engine) || '';
        $('fPrice').value = p.price || '';
        $('fStatus').value = p.status || 'active';
        $('fYear').value = (p.meta && p.meta.year) || '';
        $('fMileage').value = (p.meta && p.meta.mileage) || '';
        $('fFuel').value = (p.meta && p.meta.fuel) || '';
        $('fGearbox').value = (p.meta && p.meta.gearbox) || '';
        $('fBodyType').value = (p.meta && p.meta.body_type) || '';
        $('fTransmission').value = (p.meta && p.meta.transmission) || '';
        $('fPower').value = (p.meta && p.meta.power_ch) || '';
        $('fPowerDesc').value = (p.meta && p.meta.power) || '';
        $('fSeats').value = (p.meta && p.meta.seats) || '';
        $('fDoors').value = (p.meta && p.meta.doors) || '';
        $('fColor').value = (p.meta && p.meta.color) || '';
        $('fCritair').value = (p.meta && p.meta.critair) || '';
        $('fCo2').value = (p.meta && p.meta.co2) || '';
        $('fGuaranteeType').value = (p.meta && p.meta.guarantee_type) || '';
        $('fTva').value = (p.meta && p.meta.tva_recoverable) || '';
        $('fOptions').value = (p.meta && p.meta.options) || '';
        $('fDescription').value = (p.body_html || '').replace(/<br\s*\/?>/gi, '\n').replace(/<[^>]*>/g, '');
        $('fBadge').value = (p.meta && p.meta.badge) || '';
        $('fTags').value = p.tags || '';

        $('fTireAgMarque').value = (p.meta && p.meta.tire_ag_marque) || '';
        $('fTireAgDims').value = (p.meta && p.meta.tire_ag_dimensions) || '';
        $('fTireAgProf').value = (p.meta && p.meta.tire_ag_profondeur) || '';
        $('fTireAgType').value = (p.meta && p.meta.tire_ag_type) || '';
        $('fTireAdMarque').value = (p.meta && p.meta.tire_ad_marque) || '';
        $('fTireAdDims').value = (p.meta && p.meta.tire_ad_dimensions) || '';
        $('fTireAdProf').value = (p.meta && p.meta.tire_ad_profondeur) || '';
        $('fTireAdType').value = (p.meta && p.meta.tire_ad_type) || '';
        $('fTireRgMarque').value = (p.meta && p.meta.tire_rg_marque) || '';
        $('fTireRgDims').value = (p.meta && p.meta.tire_rg_dimensions) || '';
        $('fTireRgProf').value = (p.meta && p.meta.tire_rg_profondeur) || '';
        $('fTireRgType').value = (p.meta && p.meta.tire_rg_type) || '';
        $('fTireRdMarque').value = (p.meta && p.meta.tire_rd_marque) || '';
        $('fTireRdDims').value = (p.meta && p.meta.tire_rd_dimensions) || '';
        $('fTireRdProf').value = (p.meta && p.meta.tire_rd_profondeur) || '';
        $('fTireRdType').value = (p.meta && p.meta.tire_rd_type) || '';

        $('fVideo1').value = (p.meta && p.meta.video_1) || '';
        $('fVideo2').value = (p.meta && p.meta.video_2) || '';
        $('fVideo3').value = (p.meta && p.meta.video_3) || '';
        updateVideoPreview();

        $('maintenanceList').innerHTML = '';
        var mh = (p.meta && p.meta.maintenance_history) || '';
        if (mh) {
          try {
            var entries = JSON.parse(mh);
            if (Array.isArray(entries)) {
              entries.forEach(function (entry) {
                var parts = entry.split(' | ');
                addMaintenanceRow(parts[0] || '', parts.slice(1).join(' | ') || entry);
              });
            }
          } catch (e) {
            addMaintenanceRow('', '');
          }
        }
        if (!$('maintenanceList').children.length) addMaintenanceRow('', '');

        window._editMetaIds = p.metaIds || {};
        $('imagesNotSaved').style.display = 'none';
        renderImages(p.id, p.images || []);
      })
      .catch(function (e) { toast(e.message, 'error'); });
  }

  /* ─── Maintenance Rows ──────────────────── */
  function addMaintenanceRow(date, desc) {
    var row = document.createElement('div');
    row.className = 'maintenance-row';

    var dateInput = document.createElement('input');
    dateInput.type = 'text';
    dateInput.placeholder = 'Date (ex: 2024-01-15)';
    dateInput.value = date || '';
    dateInput.maxLength = 30;

    var descInput = document.createElement('input');
    descInput.type = 'text';
    descInput.placeholder = 'Description de l\'entretien';
    descInput.value = desc || '';
    descInput.maxLength = 200;

    var delBtn = document.createElement('button');
    delBtn.type = 'button';
    delBtn.innerHTML = '&times;';
    delBtn.title = 'Supprimer cette entrée';
    delBtn.addEventListener('click', function () {
      row.remove();
      if (!$('maintenanceList').children.length) addMaintenanceRow('', '');
    });

    row.appendChild(dateInput);
    row.appendChild(descInput);
    row.appendChild(delBtn);
    $('maintenanceList').appendChild(row);
  }

  $('addMaintenanceBtn').addEventListener('click', function () {
    addMaintenanceRow('', '');
  });

  /* ─── Images ────────────────────────────── */
  function renderImages(pid, images) {
    var grid = $('imagesGrid');
    grid.innerHTML = '';

    images.forEach(function (img) {
      var div = document.createElement('div');
      div.className = 'img-thumb';
      var im = document.createElement('img');
      im.src = img.src;
      im.alt = '';
      im.loading = 'lazy';
      var del = document.createElement('button');
      del.className = 'img-thumb__delete';
      del.innerHTML = '&times;';
      del.title = 'Supprimer';
      del.addEventListener('click', function () {
        showConfirm('Supprimer cette photo ?', 'Cette action est irréversible.', function () {
          deleteImage(pid, img.id);
        });
      });
      div.appendChild(im);
      div.appendChild(del);
      grid.appendChild(div);
    });

    var label = document.createElement('label');
    label.className = 'img-upload-btn';
    label.innerHTML = '<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" y1="3" x2="12" y2="15"/></svg>Ajouter';
    var input = document.createElement('input');
    input.type = 'file';
    input.accept = 'image/jpeg,image/png,image/webp,image/gif';
    input.multiple = true;
    input.hidden = true;
    input.addEventListener('change', function () { uploadImages(pid, input); });
    label.appendChild(input);
    grid.appendChild(label);
  }

  function uploadImages(pid, input) {
    var files = Array.from(input.files);
    if (!files.length) return;

    var uploaded = 0;
    var total = files.length;
    toast('Upload en cours... (0/' + total + ')', '');

    function next(i) {
      if (i >= files.length) {
        toast(uploaded + '/' + total + ' photo(s) ajoutée(s)', 'success');
        loadProduct(pid);
        return;
      }
      var file = files[i];
      if (file.size > 8 * 1024 * 1024) {
        toast('Fichier trop gros: ' + file.name, 'error');
        next(i + 1);
        return;
      }
      var fd = new FormData();
      fd.append('image', file);
      api('/api/products/' + pid + '/images', { method: 'POST', body: fd })
        .then(function () { uploaded++; toast('Upload... (' + uploaded + '/' + total + ')', ''); })
        .catch(function () {})
        .then(function () { next(i + 1); });
    }
    next(0);
  }

  function deleteImage(pid, iid) {
    api('/api/products/' + pid + '/images/' + iid, { method: 'DELETE' })
      .then(function () {
        toast('Photo supprimée', 'success');
        loadProduct(pid);
      })
      .catch(function (e) { toast(e.message, 'error'); });
  }

  /* ─── Video Preview ─────────────────────── */
  function getYouTubeId(url) {
    if (!url) return null;
    try {
      var u = new URL(url);
      var allowed = ['www.youtube.com', 'youtube.com', 'youtu.be'];
      if (allowed.indexOf(u.hostname) === -1) return null;
      if (u.hostname.indexOf('youtu.be') !== -1) return u.pathname.replace('/', '');
      if (u.searchParams.get('v')) return u.searchParams.get('v');
      if (u.pathname.indexOf('/embed/') !== -1) return u.pathname.split('/embed/')[1];
    } catch (e) { return null; }
    return null;
  }

  function updateVideoPreview() {
    var container = $('videoPreview');
    container.innerHTML = '';
    ['fVideo1', 'fVideo2', 'fVideo3'].forEach(function (id, i) {
      var url = $(id).value;
      var ytId = getYouTubeId(url);
      if (ytId) {
        var div = document.createElement('div');
        div.className = 'video-preview';
        var img = document.createElement('img');
        img.src = 'https://img.youtube.com/vi/' + ytId + '/mqdefault.jpg';
        img.alt = 'Vidéo ' + (i + 1);
        img.loading = 'lazy';
        var p = document.createElement('p');
        p.textContent = 'Vidéo ' + (i + 1);
        div.appendChild(img);
        div.appendChild(p);
        container.appendChild(div);
      }
    });
  }

  $('fVideo1').addEventListener('input', updateVideoPreview);
  $('fVideo2').addEventListener('input', updateVideoPreview);
  $('fVideo3').addEventListener('input', updateVideoPreview);

  /* ─── Save Vehicle ──────────────────────── */
  function collectMaintenanceHistory() {
    var rows = $('maintenanceList').querySelectorAll('.maintenance-row');
    var entries = [];
    rows.forEach(function (row) {
      var inputs = row.querySelectorAll('input');
      var date = inputs[0].value.trim();
      var desc = inputs[1].value.trim();
      if (date || desc) entries.push((date || '?') + ' | ' + (desc || '?'));
    });
    return entries;
  }

  function saveVehicle(e) {
    e.preventDefault();

    var vendor = $('fVendor').value.trim();
    var model = $('fModel').value.trim();
    if (!vendor) { toast('La marque est requise', 'error'); activateTab('tab-general'); return; }

    var btn = $('saveBtn');
    btn.disabled = true;
    btn.textContent = 'Enregistrement...';

    var maintenance = collectMaintenanceHistory();

    var data = {
      vendor: vendor,
      title: (vendor + ' ' + model).trim(),
      price: $('fPrice').value,
      status: $('fStatus').value,
      body_html: $('fDescription').value.replace(/\n/g, '<br>'),
      tags: $('fTags').value,
      variant_id: $('fVariantId').value,
      meta: {
        model: model,
        trim: $('fTrim').value,
        engine: $('fEngine').value,
        year: $('fYear').value,
        mileage: $('fMileage').value,
        fuel: $('fFuel').value,
        gearbox: $('fGearbox').value,
        body_type: $('fBodyType').value,
        transmission: $('fTransmission').value,
        power_ch: $('fPower').value,
        power: $('fPowerDesc').value,
        seats: $('fSeats').value,
        doors: $('fDoors').value,
        color: $('fColor').value,
        critair: $('fCritair').value,
        co2: $('fCo2').value,
        guarantee_type: $('fGuaranteeType').value,
        tva_recoverable: $('fTva').value,
        options: $('fOptions').value,
        badge: $('fBadge').value,
        tire_ag_marque: $('fTireAgMarque').value,
        tire_ag_dimensions: $('fTireAgDims').value,
        tire_ag_profondeur: $('fTireAgProf').value,
        tire_ag_type: $('fTireAgType').value,
        tire_ad_marque: $('fTireAdMarque').value,
        tire_ad_dimensions: $('fTireAdDims').value,
        tire_ad_profondeur: $('fTireAdProf').value,
        tire_ad_type: $('fTireAdType').value,
        tire_rg_marque: $('fTireRgMarque').value,
        tire_rg_dimensions: $('fTireRgDims').value,
        tire_rg_profondeur: $('fTireRgProf').value,
        tire_rg_type: $('fTireRgType').value,
        tire_rd_marque: $('fTireRdMarque').value,
        tire_rd_dimensions: $('fTireRdDims').value,
        tire_rd_profondeur: $('fTireRdProf').value,
        tire_rd_type: $('fTireRdType').value,
        video_1: $('fVideo1').value.trim(),
        video_2: $('fVideo2').value.trim(),
        video_3: $('fVideo3').value.trim(),
        maintenance_history: maintenance
      },
      metaIds: window._editMetaIds || {}
    };

    var id = $('fId').value;
    var url = id ? '/api/products/' + id : '/api/products';
    var method = id ? 'PUT' : 'POST';

    api(url, { method: method, body: data })
      .then(function (result) {
        toast(id ? 'Véhicule mis à jour' : 'Véhicule créé', 'success');
        var newId = id || (result.product && result.product.id);
        if (newId) showForm(parseInt(newId, 10));
        else showList();
      })
      .catch(function (e) { toast('Erreur: ' + e.message, 'error'); })
      .finally(function () { btn.disabled = false; btn.textContent = 'Enregistrer'; });
  }

  /* ─── Event Bindings ────────────────────── */
  $('loginBtn').addEventListener('click', doLogin);
  $('loginPassword').addEventListener('keydown', function (e) { if (e.key === 'Enter') doLogin(); });
  $('navList').addEventListener('click', showList);
  $('navAdd').addEventListener('click', function () { showForm(); });
  $('addBtn').addEventListener('click', function () { showForm(); });
  $('navLogout').addEventListener('click', logout);
  $('backBtn').addEventListener('click', showList);
  $('cancelBtn').addEventListener('click', showList);
  $('vehicleForm').addEventListener('submit', saveVehicle);
  $('deleteBtn').addEventListener('click', function () {
    if (!editingId) return;
    showConfirm(
      'Supprimer ce véhicule ?',
      'Toutes les photos et données seront supprimées. Cette action est irréversible.',
      function () { deleteProduct(editingId); }
    );
  });

})();
