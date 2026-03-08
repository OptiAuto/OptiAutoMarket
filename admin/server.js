/* ═══════════════════════════════════════════════════════════
   OptiAuto Admin – Secure Server
   Security: Helmet, JWT, bcrypt, rate-limit, CSRF, HPP, CSP
   ═══════════════════════════════════════════════════════════ */

require('dotenv').config({ path: require('path').join(__dirname, '..', '.env') });

const express    = require('express');
const helmet     = require('helmet');
const rateLimit  = require('express-rate-limit');
const hpp        = require('hpp');
const jwt        = require('jsonwebtoken');
const bcrypt     = require('bcryptjs');
const multer     = require('multer');
const crypto     = require('crypto');
const fetch      = require('node-fetch');
const path       = require('path');

/* ─── Configuration ─────────────────────────────────────── */
const SHOP          = process.env.SHOPIFY_SHOP;
const SHOPIFY_TOKEN = process.env.SHOPIFY_ACCESS_TOKEN || '';
const ADMIN_PW      = process.env.ADMIN_PASSWORD || 'optiauto2026';
const PORT          = process.env.ADMIN_PORT || 3000;
const API_VER       = '2024-01';
const BASE          = `https://${SHOP}/admin/api/${API_VER}`;

const JWT_SECRET    = process.env.JWT_SECRET || crypto.randomBytes(64).toString('hex');
const JWT_EXPIRY    = '4h';

const PW_HASH       = bcrypt.hashSync(ADMIN_PW, 12);

const ALLOWED_IMG_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];
const ALLOWED_IMG_MAGIC = {
  'ffd8ff':   'image/jpeg',
  '89504e47': 'image/png',
  '52494646': 'image/webp',
  '47494638': 'image/gif',
};

const app = express();

/* ─── Security Middleware ───────────────────────────────── */

app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc:  ["'self'"],
      scriptSrc:   ["'self'", "'unsafe-inline'"],
      styleSrc:    ["'self'", "'unsafe-inline'", "https://fonts.googleapis.com"],
      fontSrc:     ["'self'", "https://fonts.gstatic.com"],
      imgSrc:      ["'self'", "data:", "https://cdn.shopify.com", "https://*.shopifycdn.com"],
      connectSrc:  ["'self'"],
      frameAncestors: ["'none'"],
      formAction:  ["'self'"],
      baseUri:     ["'self'"],
    },
  },
  crossOriginEmbedderPolicy: false,
  hsts: { maxAge: 31536000, includeSubDomains: true, preload: true },
  referrerPolicy: { policy: 'strict-origin-when-cross-origin' },
}));

app.use(hpp());

app.disable('x-powered-by');

app.use((req, res, next) => {
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'DENY');
  res.setHeader('X-XSS-Protection', '1; mode=block');
  res.setHeader('Permissions-Policy', 'camera=(), microphone=(), geolocation=(), payment=()');
  res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
  res.setHeader('Pragma', 'no-cache');
  next();
});

const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 5,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Trop de tentatives. Réessayez dans 15 minutes.' },
  keyGenerator: (req) => req.ip,
});

const apiLimiter = rateLimit({
  windowMs: 1 * 60 * 1000,
  max: 60,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Trop de requêtes. Réessayez dans une minute.' },
});

/* ─── Body Parsing ──────────────────────────────────────── */
app.use(express.json({ limit: '1mb' }));
app.use(express.urlencoded({ extended: false, limit: '1mb' }));

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 8 * 1024 * 1024, files: 5 },
  fileFilter: (req, file, cb) => {
    if (ALLOWED_IMG_TYPES.includes(file.mimetype)) cb(null, true);
    else cb(new Error('Type de fichier non autorisé'), false);
  },
});

/* ─── Static Files ──────────────────────────────────────── */
app.use(express.static(path.join(__dirname, 'public'), {
  maxAge: 0,
  etag: false,
  setHeaders: (res) => {
    res.setHeader('Cache-Control', 'no-store');
  },
}));

/* ─── CSRF Token ────────────────────────────────────────── */
const csrfTokens = new Map();

function generateCsrf(sessionId) {
  const token = crypto.randomBytes(32).toString('hex');
  csrfTokens.set(sessionId, { token, exp: Date.now() + 4 * 3600 * 1000 });
  // Cleanup expired tokens
  for (const [k, v] of csrfTokens) {
    if (v.exp < Date.now()) csrfTokens.delete(k);
  }
  return token;
}

function verifyCsrf(sessionId, token) {
  const entry = csrfTokens.get(sessionId);
  if (!entry || entry.exp < Date.now()) return false;
  return crypto.timingSafeEqual(Buffer.from(entry.token), Buffer.from(token || ''.padEnd(64, '0')).slice(0, entry.token.length));
}

/* ─── Auth Middleware ───────────────────────────────────── */
function authMiddleware(req, res, next) {
  const auth = req.headers.authorization;
  if (!auth || !auth.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Non autorisé' });
  }
  const token = auth.slice(7);
  try {
    const payload = jwt.verify(token, JWT_SECRET, { algorithms: ['HS256'] });
    req.adminId = payload.sub;
    req.sessionId = payload.jti;
    next();
  } catch (err) {
    if (err.name === 'TokenExpiredError') {
      return res.status(401).json({ error: 'Session expirée. Reconnectez-vous.' });
    }
    return res.status(401).json({ error: 'Non autorisé' });
  }
}

/* CSRF check on mutating endpoints */
function csrfMiddleware(req, res, next) {
  if (['GET', 'HEAD', 'OPTIONS'].includes(req.method)) return next();
  const csrfToken = req.headers['x-csrf-token'];
  if (!req.sessionId || !verifyCsrf(req.sessionId, csrfToken)) {
    return res.status(403).json({ error: 'Token CSRF invalide. Rechargez la page.' });
  }
  next();
}

/* ─── Sanitization ──────────────────────────────────────── */
function sanitizeStr(s) {
  if (typeof s !== 'string') return '';
  return s.replace(/[<>]/g, '').trim().slice(0, 1000);
}

function sanitizeHtml(s) {
  if (typeof s !== 'string') return '';
  return s.replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '')
          .replace(/on\w+\s*=/gi, '')
          .replace(/javascript:/gi, '')
          .trim()
          .slice(0, 10000);
}

function validateId(id) {
  const n = parseInt(id, 10);
  if (isNaN(n) || n <= 0 || String(n) !== String(id)) return null;
  return n;
}

function validateImageBuffer(buffer) {
  const hex = buffer.slice(0, 4).toString('hex');
  for (const [magic, type] of Object.entries(ALLOWED_IMG_MAGIC)) {
    if (hex.startsWith(magic)) return type;
  }
  return null;
}

/* ─── Shopify API Proxy ─────────────────────────────────── */
async function shopifyAPI(endpoint, method = 'GET', body = null) {
  const opts = {
    method,
    headers: {
      'X-Shopify-Access-Token': SHOPIFY_TOKEN,
      'Content-Type': 'application/json',
    },
    timeout: 30000,
  };
  if (body) opts.body = JSON.stringify(body);
  try {
    const resp = await fetch(`${BASE}${endpoint}`, opts);
    const text = await resp.text();
    let data;
    try { data = JSON.parse(text); } catch { data = text; }
    return { status: resp.status, data };
  } catch (err) {
    return { status: 500, data: { error: 'Erreur de communication avec Shopify' } };
  }
}

/* ─── Shopify GraphQL (métachamps) ───────────────────────── */
const GRAPHQL_URL = `https://${process.env.SHOPIFY_SHOP}/admin/api/${API_VER}/graphql.json`;

async function shopifyGraphQL(query, variables = {}) {
  if (!SHOPIFY_TOKEN) return { data: null, errors: [{ message: 'SHOPIFY_ACCESS_TOKEN manquant' }] };
  try {
    const resp = await fetch(GRAPHQL_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Shopify-Access-Token': SHOPIFY_TOKEN,
      },
      body: JSON.stringify({ query, variables }),
      timeout: 15000,
    });
    const json = await resp.json();
    return { data: json.data, errors: json.errors || [] };
  } catch (err) {
    return { data: null, errors: [{ message: err.message || 'Erreur GraphQL' }] };
  }
}

/* ─── Audit Logging ─────────────────────────────────────── */
function auditLog(action, details, req) {
  const ts = new Date().toISOString();
  const ip = req.ip || req.connection?.remoteAddress || 'unknown';
  console.log(`[AUDIT] ${ts} | ${ip} | ${action} | ${JSON.stringify(details)}`);
}

/* ═══════════════════════════════════════════════════════════
   ROUTES
   ═══════════════════════════════════════════════════════════ */

/* ─── Login ─────────────────────────────────────────────── */
app.post('/api/login', loginLimiter, (req, res) => {
  const { password } = req.body || {};

  if (!password || typeof password !== 'string') {
    return res.status(400).json({ error: 'Mot de passe requis' });
  }

  if (!bcrypt.compareSync(password, PW_HASH)) {
    auditLog('LOGIN_FAILED', {}, req);
    return res.status(401).json({ error: 'Mot de passe incorrect' });
  }

  const jti = crypto.randomBytes(16).toString('hex');
  const token = jwt.sign({ sub: 'admin', role: 'admin', jti }, JWT_SECRET, {
    algorithm: 'HS256',
    expiresIn: JWT_EXPIRY,
  });

  const csrfToken = generateCsrf(jti);

  auditLog('LOGIN_SUCCESS', {}, req);
  res.json({ ok: true, token, csrfToken, expiresIn: JWT_EXPIRY });
});

/* ─── CSRF Refresh ──────────────────────────────────────── */
app.get('/api/csrf', authMiddleware, (req, res) => {
  const csrfToken = generateCsrf(req.sessionId);
  res.json({ csrfToken });
});

/* ─── Créer les définitions de métachamps (entretien + pneumatiques) ── */
app.all('/api/setup-metafields', apiLimiter, authMiddleware, async (req, res) => {
  const mutation = `
    mutation CreateMetafieldDefinition($definition: MetafieldDefinitionInput!) {
      metafieldDefinitionCreate(definition: $definition) {
        createdDefinition { id name key }
        userErrors { field message code }
      }
    }
  `;
  const definitions = [
    { name: 'Historique entretien', namespace: 'custom', key: 'maintenance_history', type: 'list.single_line_text_field', description: 'Entrées au format : Date | Description (une par ligne)' },
    { name: 'Pneu AG - Marque', namespace: 'custom', key: 'tire_ag_marque', type: 'single_line_text_field', description: 'Avant gauche - marque' },
    { name: 'Pneu AG - Dimensions', namespace: 'custom', key: 'tire_ag_dimensions', type: 'single_line_text_field', description: 'Avant gauche - ex. 215/45 R16' },
    { name: 'Pneu AG - Profondeur', namespace: 'custom', key: 'tire_ag_profondeur', type: 'single_line_text_field', description: 'Avant gauche - ex. 4 mm' },
    { name: 'Pneu AG - Type', namespace: 'custom', key: 'tire_ag_type', type: 'single_line_text_field', description: 'Avant gauche : Été, Hiver ou 4 Saisons' },
    { name: 'Pneu AD - Marque', namespace: 'custom', key: 'tire_ad_marque', type: 'single_line_text_field' },
    { name: 'Pneu AD - Dimensions', namespace: 'custom', key: 'tire_ad_dimensions', type: 'single_line_text_field' },
    { name: 'Pneu AD - Profondeur', namespace: 'custom', key: 'tire_ad_profondeur', type: 'single_line_text_field' },
    { name: 'Pneu AD - Type', namespace: 'custom', key: 'tire_ad_type', type: 'single_line_text_field' },
    { name: 'Pneu RG - Marque', namespace: 'custom', key: 'tire_rg_marque', type: 'single_line_text_field' },
    { name: 'Pneu RG - Dimensions', namespace: 'custom', key: 'tire_rg_dimensions', type: 'single_line_text_field' },
    { name: 'Pneu RG - Profondeur', namespace: 'custom', key: 'tire_rg_profondeur', type: 'single_line_text_field' },
    { name: 'Pneu RG - Type', namespace: 'custom', key: 'tire_rg_type', type: 'single_line_text_field' },
    { name: 'Pneu RD - Marque', namespace: 'custom', key: 'tire_rd_marque', type: 'single_line_text_field' },
    { name: 'Pneu RD - Dimensions', namespace: 'custom', key: 'tire_rd_dimensions', type: 'single_line_text_field' },
    { name: 'Pneu RD - Profondeur', namespace: 'custom', key: 'tire_rd_profondeur', type: 'single_line_text_field' },
    { name: 'Pneu RD - Type', namespace: 'custom', key: 'tire_rd_type', type: 'single_line_text_field' },
  ].map(d => ({ ...d, ownerType: 'PRODUCT' }));

  const results = { created: [], skipped: [], errors: [] };
  for (const def of definitions) {
    const { data, errors } = await shopifyGraphQL(mutation, { definition: def });
    if (errors.length) {
      results.errors.push({ key: def.key, errors });
      continue;
    }
    const payload = data?.metafieldDefinitionCreate;
    const userErrors = payload?.userErrors || [];
    if (userErrors.length) {
      const alreadyExists = userErrors.some(e => (e.message || '').toLowerCase().includes('already') || e.code === 'TAKEN');
      if (alreadyExists) results.skipped.push(def.key);
      else results.errors.push({ key: def.key, userErrors });
    } else if (payload?.createdDefinition) {
      results.created.push(payload.createdDefinition.name || def.key);
    }
  }
  auditLog('SETUP_METAFIELDS', { created: results.created.length, skipped: results.skipped.length, errors: results.errors.length }, req);
  res.json({ ok: true, message: `${results.created.length} définition(s) créée(s), ${results.skipped.length} déjà existante(s).`, ...results });
});

/* ─── All API routes: auth + rate limit ─────────────────── */
app.use('/api/products', apiLimiter, authMiddleware, csrfMiddleware);

/* ─── List Products ─────────────────────────────────────── */
app.get('/api/products', async (req, res) => {
  try {
    const r = await shopifyAPI('/products.json?limit=250&fields=id,title,vendor,status,images,variants,tags,created_at,updated_at');
    if (r.status !== 200) return res.status(502).json({ error: 'Erreur Shopify' });

    const products = r.data.products || [];
    const enriched = [];

    for (const p of products) {
      const mr = await shopifyAPI(`/products/${p.id}/metafields.json`);
      const metafields = mr.status === 200 ? (mr.data.metafields || []) : [];
      const meta = {};
      metafields.forEach(m => { meta[m.key] = m.value; });
      enriched.push({
        id: p.id,
        title: sanitizeStr(p.title),
        vendor: sanitizeStr(p.vendor),
        status: p.status,
        tags: sanitizeStr(p.tags),
        price: p.variants?.[0]?.price || '0',
        image: p.images?.[0]?.src || null,
        images: (p.images || []).map(i => ({ id: i.id, src: i.src })),
        meta,
        created_at: p.created_at,
      });
    }

    res.json(enriched);
  } catch {
    res.status(500).json({ error: 'Erreur interne' });
  }
});

/* ─── Get Single Product ────────────────────────────────── */
app.get('/api/products/:id', async (req, res) => {
  const id = validateId(req.params.id);
  if (!id) return res.status(400).json({ error: 'ID invalide' });

  try {
    const r = await shopifyAPI(`/products/${id}.json`);
    if (r.status !== 200) return res.status(502).json({ error: 'Erreur Shopify' });

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
  } catch {
    res.status(500).json({ error: 'Erreur interne' });
  }
});

/* ─── Create Product ────────────────────────────────────── */
app.post('/api/products', async (req, res) => {
  try {
    const d = req.body;
    const vendor = sanitizeStr(d.vendor);
    const model = sanitizeStr(d.meta?.model);

    if (!vendor) return res.status(400).json({ error: 'La marque est requise' });

    const metafields = buildMetafields(d.meta || {});
    const product = {
      title: sanitizeStr(d.title) || `${vendor} ${model}`.trim(),
      vendor,
      body_html: sanitizeHtml(d.body_html || ''),
      status: ['active', 'draft'].includes(d.status) ? d.status : 'draft',
      tags: sanitizeStr(d.tags || ''),
      product_type: 'Voiture',
      variants: [{ price: String(Math.max(0, parseFloat(d.price) || 0)), inventory_management: null }],
      metafields,
    };

    const r = await shopifyAPI('/products.json', 'POST', { product });
    if (r.status === 201 || r.status === 200) {
      auditLog('PRODUCT_CREATED', { id: r.data.product?.id, title: product.title }, req);
      res.json({ ok: true, product: r.data.product });
    } else {
      res.status(502).json({ error: 'Erreur Shopify' });
    }
  } catch {
    res.status(500).json({ error: 'Erreur interne' });
  }
});

/* ─── Update Product ────────────────────────────────────── */
app.put('/api/products/:id', async (req, res) => {
  const id = validateId(req.params.id);
  if (!id) return res.status(400).json({ error: 'ID invalide' });

  try {
    const d = req.body;
    const vendor = sanitizeStr(d.vendor);
    const model = sanitizeStr(d.meta?.model);

    const product = {
      id,
      title: sanitizeStr(d.title) || `${vendor} ${model}`.trim(),
      vendor,
      body_html: sanitizeHtml(d.body_html || ''),
      status: ['active', 'draft'].includes(d.status) ? d.status : 'active',
      tags: sanitizeStr(d.tags || ''),
    };

    if (d.price && d.variant_id) {
      const vid = validateId(d.variant_id);
      if (vid) {
        product.variants = [{ id: vid, price: String(Math.max(0, parseFloat(d.price) || 0)) }];
      }
    }

    const r = await shopifyAPI(`/products/${id}.json`, 'PUT', { product });

    if (d.meta) {
      const metafields = buildMetafields(d.meta);
      for (const mf of metafields) {
        const metaId = d.metaIds?.[mf.key];
        if (metaId && validateId(metaId)) {
          await shopifyAPI(`/products/${id}/metafields/${metaId}.json`, 'PUT', {
            metafield: { id: metaId, value: mf.value, type: mf.type }
          });
        } else {
          await shopifyAPI(`/products/${id}/metafields.json`, 'POST', {
            metafield: { namespace: mf.namespace, key: mf.key, value: mf.value, type: mf.type }
          });
        }
      }
    }

    auditLog('PRODUCT_UPDATED', { id }, req);
    res.json({ ok: true, product: r.data?.product });
  } catch {
    res.status(500).json({ error: 'Erreur interne' });
  }
});

/* ─── Toggle Status ─────────────────────────────────────── */
app.patch('/api/products/:id/status', async (req, res) => {
  const id = validateId(req.params.id);
  if (!id) return res.status(400).json({ error: 'ID invalide' });

  const status = ['active', 'draft'].includes(req.body.status) ? req.body.status : 'draft';
  try {
    await shopifyAPI(`/products/${id}.json`, 'PUT', { product: { id, status } });
    auditLog('PRODUCT_STATUS', { id, status }, req);
    res.json({ ok: true, status });
  } catch {
    res.status(500).json({ error: 'Erreur interne' });
  }
});

/* ─── Upload Image ──────────────────────────────────────── */
app.post('/api/products/:id/images', upload.single('image'), async (req, res) => {
  const id = validateId(req.params.id);
  if (!id) return res.status(400).json({ error: 'ID invalide' });

  try {
    if (!req.file) return res.status(400).json({ error: 'Aucune image fournie' });

    const detectedType = validateImageBuffer(req.file.buffer);
    if (!detectedType) {
      return res.status(400).json({ error: 'Fichier image invalide (signature incorrecte)' });
    }

    const base64 = req.file.buffer.toString('base64');
    const safeFilename = req.file.originalname.replace(/[^a-zA-Z0-9._-]/g, '_').slice(0, 100);

    const r = await shopifyAPI(`/products/${id}/images.json`, 'POST', {
      image: { attachment: base64, filename: safeFilename }
    });

    if (r.status === 200 || r.status === 201) {
      auditLog('IMAGE_UPLOADED', { productId: id }, req);
      res.json({ ok: true, image: r.data.image });
    } else {
      res.status(502).json({ error: 'Erreur Shopify' });
    }
  } catch {
    res.status(500).json({ error: 'Erreur interne' });
  }
});

/* ─── Delete Image ──────────────────────────────────────── */
app.delete('/api/products/:pid/images/:iid', async (req, res) => {
  const pid = validateId(req.params.pid);
  const iid = validateId(req.params.iid);
  if (!pid || !iid) return res.status(400).json({ error: 'ID invalide' });

  try {
    await shopifyAPI(`/products/${pid}/images/${iid}.json`, 'DELETE');
    auditLog('IMAGE_DELETED', { productId: pid, imageId: iid }, req);
    res.json({ ok: true });
  } catch {
    res.status(500).json({ error: 'Erreur interne' });
  }
});

/* ─── Delete Product ────────────────────────────────────── */
app.delete('/api/products/:id', async (req, res) => {
  const id = validateId(req.params.id);
  if (!id) return res.status(400).json({ error: 'ID invalide' });

  try {
    await shopifyAPI(`/products/${id}.json`, 'DELETE');
    auditLog('PRODUCT_DELETED', { id }, req);
    res.json({ ok: true });
  } catch {
    res.status(500).json({ error: 'Erreur interne' });
  }
});

/* ─── Catch-all 404 ─────────────────────────────────────── */
app.use((req, res) => {
  res.status(404).json({ error: 'Route introuvable' });
});

/* ─── Global Error Handler ──────────────────────────────── */
app.use((err, req, res, _next) => {
  console.error(`[ERROR] ${new Date().toISOString()} | ${err.message}`);
  if (err.code === 'LIMIT_FILE_SIZE') {
    return res.status(413).json({ error: 'Fichier trop volumineux (max 8 Mo)' });
  }
  res.status(500).json({ error: 'Erreur interne du serveur' });
});

/* ─── Metafield Builder ─────────────────────────────────── */
function buildMetafields(meta) {
  const fields = [];
  const allowed = [
    'model','trim','engine','year','mileage','fuel','gearbox','body_type',
    'transmission','color','seats','critair','power_ch','power','doors',
    'co2','options','badge','guarantee_type','tva_recoverable',
  ];

  for (const key of allowed) {
    const val = meta[key];
    if (val !== undefined && val !== null && val !== '') {
      fields.push({
        namespace: 'custom',
        key,
        value: sanitizeStr(String(val)),
        type: 'single_line_text_field',
      });
    }
  }
  return fields;
}

/* ─── Start ─────────────────────────────────────────────── */
app.listen(PORT, '127.0.0.1', () => {
  console.log(`\n  ╔══════════════════════════════════════╗`);
  console.log(`  ║  OptiAuto Admin – Secure             ║`);
  console.log(`  ║  http://localhost:${PORT}              ║`);
  console.log(`  ║  Security: ON                        ║`);
  console.log(`  ║  - Helmet (CSP, HSTS, X-Frame)       ║`);
  console.log(`  ║  - JWT auth (${JWT_EXPIRY} expiry)          ║`);
  console.log(`  ║  - bcrypt password hashing            ║`);
  console.log(`  ║  - Rate limiting (5 login/15min)      ║`);
  console.log(`  ║  - CSRF protection                    ║`);
  console.log(`  ║  - Input sanitization                 ║`);
  console.log(`  ║  - Image magic byte validation        ║`);
  console.log(`  ║  - Audit logging                      ║`);
  console.log(`  ╚══════════════════════════════════════╝\n`);
});
