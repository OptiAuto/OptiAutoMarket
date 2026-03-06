require('dotenv').config({ path: require('path').join(__dirname, '..', '.env') });
const express = require('express');
const multer = require('multer');
const fetch = require('node-fetch');
const fs = require('fs');
const path = require('path');

const app = express();
const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 10 * 1024 * 1024 } });

const SHOP = process.env.SHOPIFY_SHOP;
const TOKEN = process.env.SHOPIFY_ACCESS_TOKEN || '';
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || 'optiauto2026';
const PORT = process.env.ADMIN_PORT || 3000;
const API_VER = '2024-01';
const BASE = `https://${SHOP}/admin/api/${API_VER}`;

app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, 'public')));

function authMiddleware(req, res, next) {
  const auth = req.headers.authorization;
  if (!auth || auth !== `Bearer ${ADMIN_PASSWORD}`) {
    return res.status(401).json({ error: 'Non autorisé' });
  }
  next();
}

async function shopifyAPI(endpoint, method = 'GET', body = null) {
  const opts = {
    method,
    headers: {
      'X-Shopify-Access-Token': TOKEN,
      'Content-Type': 'application/json',
    },
  };
  if (body) opts.body = JSON.stringify(body);
  const resp = await fetch(`${BASE}${endpoint}`, opts);
  const text = await resp.text();
  try { return { status: resp.status, data: JSON.parse(text) }; }
  catch { return { status: resp.status, data: text }; }
}

// Login check
app.post('/api/login', (req, res) => {
  if (req.body.password === ADMIN_PASSWORD) {
    return res.json({ ok: true, token: ADMIN_PASSWORD });
  }
  res.status(401).json({ error: 'Mot de passe incorrect' });
});

// List products
app.get('/api/products', authMiddleware, async (req, res) => {
  try {
    const r = await shopifyAPI('/products.json?limit=250&fields=id,title,vendor,status,images,variants,metafields,tags,created_at,updated_at');
    if (r.status !== 200) return res.status(r.status).json(r.data);

    const products = r.data.products || [];
    const enriched = [];

    for (const p of products) {
      const mr = await shopifyAPI(`/products/${p.id}/metafields.json`);
      const metafields = mr.status === 200 ? (mr.data.metafields || []) : [];
      const meta = {};
      metafields.forEach(m => { meta[m.key] = m.value; });
      enriched.push({
        id: p.id,
        title: p.title,
        vendor: p.vendor,
        status: p.status,
        tags: p.tags,
        price: p.variants?.[0]?.price || '0',
        image: p.images?.[0]?.src || null,
        images: (p.images || []).map(i => ({ id: i.id, src: i.src })),
        meta,
        created_at: p.created_at,
      });
    }

    res.json(enriched);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Get single product
app.get('/api/products/:id', authMiddleware, async (req, res) => {
  try {
    const r = await shopifyAPI(`/products/${req.params.id}.json`);
    if (r.status !== 200) return res.status(r.status).json(r.data);

    const p = r.data.product;
    const mr = await shopifyAPI(`/products/${p.id}/metafields.json`);
    const metafields = mr.status === 200 ? (mr.data.metafields || []) : [];
    const meta = {};
    const metaIds = {};
    metafields.forEach(m => { meta[m.key] = m.value; metaIds[m.key] = m.id; });

    res.json({
      id: p.id,
      title: p.title,
      vendor: p.vendor,
      status: p.status,
      tags: p.tags,
      body_html: p.body_html || '',
      price: p.variants?.[0]?.price || '0',
      variant_id: p.variants?.[0]?.id,
      images: (p.images || []).map(i => ({ id: i.id, src: i.src, position: i.position })),
      meta,
      metaIds,
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Create product
app.post('/api/products', authMiddleware, async (req, res) => {
  try {
    const d = req.body;
    const metafields = buildMetafields(d.meta || {});

    const product = {
      title: d.title || `${d.vendor} ${d.meta?.model || ''}`.trim(),
      vendor: d.vendor || '',
      body_html: d.body_html || '',
      status: d.status || 'active',
      tags: d.tags || '',
      product_type: 'Voiture',
      variants: [{ price: d.price || '0', inventory_management: null }],
      metafields,
    };

    const r = await shopifyAPI('/products.json', 'POST', { product });
    if (r.status === 201 || r.status === 200) {
      res.json({ ok: true, product: r.data.product });
    } else {
      res.status(r.status).json(r.data);
    }
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Update product
app.put('/api/products/:id', authMiddleware, async (req, res) => {
  try {
    const d = req.body;
    const product = {
      id: parseInt(req.params.id),
      title: d.title || `${d.vendor} ${d.meta?.model || ''}`.trim(),
      vendor: d.vendor || '',
      body_html: d.body_html || '',
      status: d.status || 'active',
      tags: d.tags || '',
    };

    if (d.price && d.variant_id) {
      product.variants = [{ id: parseInt(d.variant_id), price: d.price }];
    }

    const r = await shopifyAPI(`/products/${req.params.id}.json`, 'PUT', { product });

    if (d.meta) {
      const metafields = buildMetafields(d.meta);
      for (const mf of metafields) {
        if (d.metaIds && d.metaIds[mf.key]) {
          await shopifyAPI(`/products/${req.params.id}/metafields/${d.metaIds[mf.key]}.json`, 'PUT', {
            metafield: { id: d.metaIds[mf.key], value: mf.value, type: mf.type }
          });
        } else {
          await shopifyAPI(`/products/${req.params.id}/metafields.json`, 'POST', {
            metafield: { namespace: mf.namespace, key: mf.key, value: mf.value, type: mf.type }
          });
        }
      }
    }

    res.json({ ok: true, product: r.data?.product });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Toggle product status (active/draft)
app.patch('/api/products/:id/status', authMiddleware, async (req, res) => {
  try {
    const status = req.body.status;
    const r = await shopifyAPI(`/products/${req.params.id}.json`, 'PUT', {
      product: { id: parseInt(req.params.id), status }
    });
    res.json({ ok: true, status });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Upload image
app.post('/api/products/:id/images', authMiddleware, upload.single('image'), async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ error: 'Aucune image fournie' });
    const base64 = req.file.buffer.toString('base64');
    const r = await shopifyAPI(`/products/${req.params.id}/images.json`, 'POST', {
      image: { attachment: base64, filename: req.file.originalname }
    });
    if (r.status === 200 || r.status === 201) {
      res.json({ ok: true, image: r.data.image });
    } else {
      res.status(r.status).json(r.data);
    }
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Delete image
app.delete('/api/products/:pid/images/:iid', authMiddleware, async (req, res) => {
  try {
    await shopifyAPI(`/products/${req.params.pid}/images/${req.params.iid}.json`, 'DELETE');
    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Delete product
app.delete('/api/products/:id', authMiddleware, async (req, res) => {
  try {
    await shopifyAPI(`/products/${req.params.id}.json`, 'DELETE');
    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

function buildMetafields(meta) {
  const fields = [];
  const mapping = {
    model: 'single_line_text_field',
    trim: 'single_line_text_field',
    engine: 'single_line_text_field',
    year: 'single_line_text_field',
    mileage: 'single_line_text_field',
    fuel: 'single_line_text_field',
    gearbox: 'single_line_text_field',
    body_type: 'single_line_text_field',
    transmission: 'single_line_text_field',
    color: 'single_line_text_field',
    seats: 'single_line_text_field',
    critair: 'single_line_text_field',
    power_ch: 'single_line_text_field',
    power: 'single_line_text_field',
    doors: 'single_line_text_field',
    co2: 'single_line_text_field',
    options: 'single_line_text_field',
    badge: 'single_line_text_field',
    guarantee_type: 'single_line_text_field',
    tva_recoverable: 'single_line_text_field',
  };

  for (const [key, val] of Object.entries(meta)) {
    if (val !== undefined && val !== null && val !== '' && mapping[key]) {
      fields.push({
        namespace: 'custom',
        key,
        value: String(val),
        type: mapping[key],
      });
    }
  }
  return fields;
}

app.listen(PORT, () => {
  console.log(`\n  ╔══════════════════════════════════════╗`);
  console.log(`  ║  OptiAuto Admin Panel                ║`);
  console.log(`  ║  http://localhost:${PORT}              ║`);
  console.log(`  ║  Mot de passe: ${ADMIN_PASSWORD.slice(0, 4)}...              ║`);
  console.log(`  ╚══════════════════════════════════════╝\n`);
});
