/**
 * OptiAuto Market — Script de configuration Shopify
 * 
 * Ce script crée :
 * 1. Les définitions de metafields pour les véhicules
 * 2. Une collection "Voitures d'occasion"
 * 3. Des produits exemples avec données réelles et photos
 *
 * CONFIGURATION :
 * - Remplir SHOP_URL et ACCESS_TOKEN ci-dessous
 * - Pour obtenir un token : Admin Shopify > Paramètres > Applications > Développer des applications
 *   > Créer une application > Configurer les scopes API Admin (write_products, write_metafield_definitions)
 *
 * USAGE : node scripts/setup-shopify.js
 */

const { readFileSync } = require('fs');
const { resolve } = require('path');
const envPath = resolve(__dirname, '..', '.env');
const envVars = Object.fromEntries(readFileSync(envPath, 'utf8').trim().split('\n').map(l => l.split('=')));
const SHOP_URL = envVars.SHOPIFY_SHOP;
const CLIENT_ID = envVars.SHOPIFY_CLIENT_ID;
const CLIENT_SECRET = envVars.SHOPIFY_CLIENT_SECRET;
let ACCESS_TOKEN = null;

const API_VERSION = '2024-01';
const BASE = `https://${SHOP_URL}/admin/api/${API_VERSION}`;

function getHeaders() {
  return {
    'Content-Type': 'application/json',
    'X-Shopify-Access-Token': ACCESS_TOKEN,
  };
}

async function getAccessToken() {
  console.log('🔑 Récupération du token...');
  const res = await fetch(`https://${SHOP_URL}/admin/oauth/access_token`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: `grant_type=client_credentials&client_id=${CLIENT_ID}&client_secret=${CLIENT_SECRET}`,
  });
  const data = await res.json();
  if (data.access_token) {
    ACCESS_TOKEN = data.access_token;
    console.log('  ✅ Token obtenu (expire dans 24h)');
    return true;
  }
  console.error('  ❌ Impossible d\'obtenir le token:', data);
  return false;
}

async function api(method, endpoint, body) {
  const opts = { method, headers: getHeaders() };
  if (body) opts.body = JSON.stringify(body);
  const res = await fetch(`${BASE}${endpoint}`, opts);
  const text = await res.text();
  let data;
  try { data = JSON.parse(text); } catch (e) { data = { raw: text }; }
  if (!res.ok) {
    console.error(`  ❌ ${method} ${endpoint} (${res.status}):`, JSON.stringify(data.errors || data, null, 2).substring(0, 200));
    return null;
  }
  return data;
}

async function sleep(ms) { return new Promise(r => setTimeout(r, ms)); }

/* ═══════════════════════════════════════════
   1. METAFIELD DEFINITIONS
   ═══════════════════════════════════════════ */

const metafieldDefs = [
  { key: 'model',        name: 'Modèle',        type: 'single_line_text_field' },
  { key: 'trim',         name: 'Finition',       type: 'single_line_text_field' },
  { key: 'engine',       name: 'Motorisation',   type: 'single_line_text_field' },
  { key: 'year',         name: 'Année',          type: 'number_integer' },
  { key: 'mileage',      name: 'Kilométrage',    type: 'number_integer' },
  { key: 'fuel',         name: 'Carburant',      type: 'single_line_text_field' },
  { key: 'gearbox',      name: 'Boîte',          type: 'single_line_text_field' },
  { key: 'body_type',    name: 'Carrosserie',    type: 'single_line_text_field' },
  { key: 'transmission', name: 'Transmission',   type: 'single_line_text_field' },
  { key: 'seats',        name: 'Places',         type: 'number_integer' },
  { key: 'critair',      name: "Crit'Air",       type: 'single_line_text_field' },
  { key: 'color',        name: 'Couleur',        type: 'single_line_text_field' },
  { key: 'power',        name: 'Puissance',      type: 'single_line_text_field' },
  { key: 'doors',        name: 'Portes',         type: 'number_integer' },
  { key: 'co2',          name: 'Émissions CO₂',  type: 'number_integer' },
  { key: 'badge',        name: 'Badge',          type: 'single_line_text_field' },
  { key: 'options',      name: 'Options',        type: 'multi_line_text_field' },
];

async function createMetafieldDefinitions() {
  console.log('\n══════ Création des metafield definitions ══════');
  for (const def of metafieldDefs) {
    const body = {
      metafield_definition: {
        name: def.name,
        namespace: 'custom',
        key: def.key,
        type: def.type,
        owner_type: 'PRODUCT',
      }
    };
    const result = await api('POST', '/metafield_definitions.json', body);
    if (result) {
      console.log(`  ✅ ${def.name} (custom.${def.key})`);
    }
    await sleep(300);
  }
}

/* ═══════════════════════════════════════════
   2. COLLECTION
   ═══════════════════════════════════════════ */

async function createCollection() {
  console.log('\n══════ Création de la collection ══════');
  const body = {
    custom_collection: {
      title: 'Voitures d\'occasion',
      body_html: '<p>Découvrez notre sélection de véhicules d\'occasion contrôlés, garantis et au meilleur prix.</p>',
      published: true,
      template_suffix: 'cars',
    }
  };
  const result = await api('POST', '/custom_collections.json', body);
  if (result && result.custom_collection) {
    console.log(`  ✅ Collection créée : ${result.custom_collection.title} (id: ${result.custom_collection.id})`);
    return result.custom_collection.id;
  }
  return null;
}

/* ═══════════════════════════════════════════
   3. PRODUITS EXEMPLES (données réelles)
   ═══════════════════════════════════════════ */

const vehiclePhotos = {
  'Peugeot':      'https://images.unsplash.com/photo-1609521263047-f8f205293f24?w=800&q=80',
  'Renault':      'https://images.unsplash.com/photo-1541899481282-d53bffe3c35d?w=800&q=80',
  'Volkswagen':   'https://images.unsplash.com/photo-1583121274602-3e2820c69888?w=800&q=80',
  'BMW':          'https://images.unsplash.com/photo-1555215695-3004980ad54e?w=800&q=80',
  'Mercedes':     'https://images.unsplash.com/photo-1618843479313-40f8afb4b4d8?w=800&q=80',
  'Audi':         'https://images.unsplash.com/photo-1606664515524-ed2f786a0bd6?w=800&q=80',
  'Toyota':       'https://images.unsplash.com/photo-1559416523-140ddc3d238c?w=800&q=80',
  'Tesla':        'https://images.unsplash.com/photo-1560958089-b8a1929cea89?w=800&q=80',
  'Citroën':      'https://images.unsplash.com/photo-1549399542-7e3f8b79c341?w=800&q=80',
  'Dacia':        'https://images.unsplash.com/photo-1533473359331-0135ef1b58bf?w=800&q=80',
  'Fiat':         'https://images.unsplash.com/photo-1595787142240-a1d0b7717cd2?w=800&q=80',
  'Ford':         'https://images.unsplash.com/photo-1551830820-330a71b99659?w=800&q=80',
  'Hyundai':      'https://images.unsplash.com/photo-1580273916550-e323be2ae537?w=800&q=80',
  'Kia':          'https://images.unsplash.com/photo-1619767886558-efdc259cde1a?w=800&q=80',
  'Skoda':        'https://images.unsplash.com/photo-1606220838315-056192d5e927?w=800&q=80',
  'Volvo':        'https://images.unsplash.com/photo-1573950940509-d924ee3fd345?w=800&q=80',
};

const products = [
  {
    vendor: 'Peugeot', model: '3008', trim: 'Allure Pack', engine: '1.2 PureTech 130 EAT8',
    year: 2023, mileage: 53302, fuel: 'Essence', gearbox: 'Automatique', body_type: 'SUV',
    transmission: 'Traction avant', seats: 5, critair: "Crit'Air 1", color: 'Gris', power: '130 ch',
    doors: 5, co2: 135, price: 2099000, badge: '',
    options: 'Caméra de recul,Navigation GPS,Climatisation automatique bi-zone,Régulateur de vitesse adaptatif,Aide au stationnement avant/arrière,Sièges chauffants,Apple CarPlay / Android Auto,Toit panoramique,Jantes alliage 18"',
  },
  {
    vendor: 'Renault', model: 'Clio', trim: 'Intens', engine: '1.0 TCe 90', 
    year: 2022, mileage: 41200, fuel: 'Essence', gearbox: 'Manuelle', body_type: 'Citadine',
    transmission: 'Traction avant', seats: 5, critair: "Crit'Air 1", color: 'Blanc', power: '90 ch',
    doors: 5, co2: 119, price: 1499000, badge: 'Bonne affaire',
    options: 'Écran tactile 9.3",Navigation GPS,Climatisation automatique,Régulateur de vitesse,Bluetooth,Aide au stationnement arrière,Feux LED,Carte mains libres',
  },
  {
    vendor: 'Volkswagen', model: 'Golf', trim: 'Life', engine: '1.5 TSI 130 DSG7',
    year: 2022, mileage: 38500, fuel: 'Essence', gearbox: 'Automatique', body_type: 'Compact',
    transmission: 'Traction avant', seats: 5, critair: "Crit'Air 1", color: 'Noir', power: '130 ch',
    doors: 5, co2: 128, price: 2349000, badge: '',
    options: 'Digital Cockpit Pro,Navigation Discover Pro,ACC régulateur adaptatif,Lane Assist,Climatisation automatique tri-zone,Sièges sport,Apple CarPlay sans fil,Jantes alliage 17"',
  },
  {
    vendor: 'BMW', model: 'Série 3', trim: 'Sport Line', engine: '318d 150',
    year: 2021, mileage: 67000, fuel: 'Diesel', gearbox: 'Automatique', body_type: 'Berline',
    transmission: 'Propulsion arrière', seats: 5, critair: "Crit'Air 2", color: 'Bleu', power: '150 ch',
    doors: 4, co2: 118, price: 2899000, badge: '',
    options: 'GPS Navigation Professional,Affichage tête haute,Sièges cuir Dakota,Climatisation automatique tri-zone,Phares LED adaptatifs,Aide au stationnement Plus,Régulateur de vitesse actif,Volant M Sport',
  },
  {
    vendor: 'Mercedes-Benz', model: 'Classe A', trim: 'AMG Line', engine: '180 136 7G-DCT',
    year: 2021, mileage: 54800, fuel: 'Essence', gearbox: 'Automatique', body_type: 'Compact',
    transmission: 'Traction avant', seats: 5, critair: "Crit'Air 1", color: 'Blanc', power: '136 ch',
    doors: 5, co2: 133, price: 2649000, badge: 'Première main',
    options: 'MBUX avec écran tactile,Navigation,Climatisation automatique,Pack AMG extérieur,Jantes AMG 18",Caméra de recul,Sièges avant chauffants,Éclairage ambiance 64 couleurs,Keyless Go',
  },
  {
    vendor: 'Audi', model: 'A3 Sportback', trim: 'S Line', engine: '35 TFSI 150 S tronic',
    year: 2022, mileage: 29800, fuel: 'Essence', gearbox: 'Automatique', body_type: 'Compact',
    transmission: 'Traction avant', seats: 5, critair: "Crit'Air 1", color: 'Gris', power: '150 ch',
    doors: 5, co2: 130, price: 2999000, badge: '',
    options: 'Virtual Cockpit Plus,MMI Navigation Plus,Audi smartphone interface,Climatisation automatique tri-zone,Pack S Line extérieur et intérieur,Sièges sport,Phares Matrix LED,Aide au stationnement Plus',
  },
  {
    vendor: 'Toyota', model: 'Yaris', trim: 'Collection', engine: '1.5 VVT-i 116 Hybrid',
    year: 2023, mileage: 18200, fuel: 'Hybride essence', gearbox: 'Automatique', body_type: 'Citadine',
    transmission: 'Traction avant', seats: 5, critair: "Crit'Air 1", color: 'Rouge', power: '116 ch',
    doors: 5, co2: 87, price: 2199000, badge: 'Très bonne affaire',
    options: "Toyota Touch 2 avec navigation,JBL Premium Audio,Caméra de recul,Climatisation automatique,Régulateur de vitesse adaptatif,Détection de piétons,Feux LED,Toit ouvrant panoramique,Sièges chauffants",
  },
  {
    vendor: 'Tesla', model: 'Model 3', trim: 'Standard Plus', engine: '325 RWD',
    year: 2022, mileage: 42000, fuel: 'Électrique', gearbox: 'Automatique', body_type: 'Berline',
    transmission: 'Propulsion arrière', seats: 5, critair: "Crit'Air 0 (Électrique)", color: 'Blanc', power: '283 ch',
    doors: 4, co2: 0, price: 2699000, badge: '',
    options: "Autopilot,Écran tactile 15 pouces,Navigation,Caméras 360°,Sièges chauffants,Toit vitré panoramique,Coffre avant (frunk),Supercharge gratuit limité,Mises à jour OTA",
  },
  {
    vendor: 'Citroën', model: 'C5 Aircross', trim: 'Feel', engine: '1.5 BlueHDi 130',
    year: 2021, mileage: 78500, fuel: 'Diesel', gearbox: 'Manuelle', body_type: 'SUV',
    transmission: 'Traction avant', seats: 5, critair: "Crit'Air 2", color: 'Noir', power: '130 ch',
    doors: 5, co2: 128, price: 1899000, badge: 'Bonne affaire',
    options: "Écran tactile 8 pouces,Navigation connectée,Climatisation automatique bi-zone,Caméra de recul,Sièges Advanced Comfort,Grip Control,Apple CarPlay / Android Auto,Toit ouvrant",
  },
  {
    vendor: 'Dacia', model: 'Sandero', trim: 'Confort', engine: '1.0 TCe 90',
    year: 2023, mileage: 22500, fuel: 'Essence', gearbox: 'Manuelle', body_type: 'Citadine',
    transmission: 'Traction avant', seats: 5, critair: "Crit'Air 1", color: 'Orange', power: '90 ch',
    doors: 5, co2: 121, price: 1249000, badge: '',
    options: "Media Display 8 pouces,Navigation smartphone,Climatisation manuelle,Régulateur/limiteur de vitesse,Radar de recul,Bluetooth,Vitres avant électriques,Volant réglable",
  },
  {
    vendor: 'Fiat', model: '500', trim: 'Lounge', engine: '1.2 69',
    year: 2020, mileage: 45000, fuel: 'Essence', gearbox: 'Manuelle', body_type: 'Citadine',
    transmission: 'Traction avant', seats: 4, critair: "Crit'Air 1", color: 'Blanc', power: '69 ch',
    doors: 3, co2: 110, price: 1099000, badge: 'Très bonne affaire',
    options: "Écran tactile Uconnect 7 pouces,Climatisation automatique,Bluetooth,Capteur de pluie,Vitres électriques,Rétroviseurs électriques,Jantes alliage 15 pouces",
  },
  {
    vendor: 'Ford', model: 'Puma', trim: 'ST-Line', engine: '1.0 EcoBoost 125 mHEV',
    year: 2022, mileage: 35600, fuel: 'Hybride essence', gearbox: 'Manuelle', body_type: 'Crossover',
    transmission: 'Traction avant', seats: 5, critair: "Crit'Air 1", color: 'Bleu', power: '125 ch',
    doors: 5, co2: 118, price: 2149000, badge: '',
    options: "SYNC 3 avec écran 8 pouces,Navigation,FordPass Connect,Climatisation automatique,Pack ST-Line,Caméra de recul,Aide au stationnement,Sièges sport,Megabox coffre",
  },
  {
    vendor: 'Hyundai', model: 'Tucson', trim: 'Creative', engine: '1.6 T-GDi 150 Hybrid',
    year: 2022, mileage: 48200, fuel: 'Hybride essence', gearbox: 'Automatique', body_type: 'SUV',
    transmission: '4 roues motrices (AWD)', seats: 5, critair: "Crit'Air 1", color: 'Gris', power: '230 ch',
    doors: 5, co2: 135, price: 2799000, badge: '',
    options: "Écran tactile 10.25 pouces,Navigation,Cockpit digital 10.25 pouces,Climatisation automatique bi-zone,Sièges chauffants et ventilés,Caméra 360°,Toit ouvrant panoramique,Hayon électrique,BlueLink connecté",
  },
  {
    vendor: 'Kia', model: 'Sportage', trim: 'Active', engine: '1.6 T-GDi 150 MHEV DCT7',
    year: 2023, mileage: 26800, fuel: 'Hybride essence', gearbox: 'Automatique', body_type: 'SUV',
    transmission: 'Traction avant', seats: 5, critair: "Crit'Air 1", color: 'Noir', power: '150 ch',
    doors: 5, co2: 144, price: 3199000, badge: 'Première main',
    options: "Double écran panoramique 12.3 pouces,Navigation,Climatisation automatique bi-zone,Sièges chauffants,Caméra de recul,Régulateur de vitesse adaptatif,Phares LED,Jantes alliage 18 pouces",
  },
  {
    vendor: 'Skoda', model: 'Octavia', trim: 'Style', engine: '1.5 TSI 150 DSG7',
    year: 2021, mileage: 62000, fuel: 'Essence', gearbox: 'Automatique', body_type: 'Berline',
    transmission: 'Traction avant', seats: 5, critair: "Crit'Air 1", color: 'Gris', power: '150 ch',
    doors: 5, co2: 128, price: 2249000, badge: '',
    options: "Virtual Cockpit 10 pouces,Columbus Navigation 10 pouces,Climatisation automatique tri-zone,Sièges chauffants,Détecteur d'angle mort,Caméra de recul,SmartLink (CarPlay/Android Auto),Accoudoir central arrière",
  },
  {
    vendor: 'Volvo', model: 'XC40', trim: 'Momentum', engine: 'T3 163',
    year: 2021, mileage: 55300, fuel: 'Essence', gearbox: 'Automatique', body_type: 'SUV',
    transmission: 'Traction avant', seats: 5, critair: "Crit'Air 1", color: 'Blanc', power: '163 ch',
    doors: 5, co2: 145, price: 2899000, badge: '',
    options: "Sensus Navigation 9 pouces,Harman Kardon Premium Sound,Climatisation automatique bi-zone,Pilot Assist,Caméra de recul,Sièges cuir,Éclairage d'ambiance,Toit ouvrant panoramique",
  },
];

async function createProducts(collectionId) {
  console.log('\n══════ Création des produits ══════');
  const productIds = [];

  for (const v of products) {
    const title = `${v.vendor} ${v.model}`;
    const photoUrl = vehiclePhotos[v.vendor.replace('-Benz', '')] || vehiclePhotos['Peugeot'];

    const body = {
      product: {
        title: title,
        body_html: `<p>${title} ${v.trim} – ${v.engine}. Véhicule de ${v.year}, ${v.mileage.toLocaleString('fr-FR')} km, ${v.fuel}, boîte ${v.gearbox.toLowerCase()}. Contrôlé et garanti.</p>`,
        vendor: v.vendor,
        product_type: 'Véhicule',
        status: 'active',
        variants: [
          {
            price: (v.price / 100).toFixed(2),
            inventory_management: null,
            requires_shipping: false,
          }
        ],
        images: [{ src: photoUrl }],
        metafields: [
          { namespace: 'custom', key: 'model',        value: v.model,                       type: 'single_line_text_field' },
          { namespace: 'custom', key: 'trim',          value: v.trim,                        type: 'single_line_text_field' },
          { namespace: 'custom', key: 'engine',        value: v.engine,                      type: 'single_line_text_field' },
          { namespace: 'custom', key: 'year',          value: String(v.year),                type: 'number_integer' },
          { namespace: 'custom', key: 'mileage',       value: String(v.mileage),             type: 'number_integer' },
          { namespace: 'custom', key: 'fuel',          value: v.fuel,                        type: 'single_line_text_field' },
          { namespace: 'custom', key: 'gearbox',       value: v.gearbox,                     type: 'single_line_text_field' },
          { namespace: 'custom', key: 'body_type',     value: v.body_type,                   type: 'single_line_text_field' },
          { namespace: 'custom', key: 'transmission',  value: v.transmission,                type: 'single_line_text_field' },
          { namespace: 'custom', key: 'seats',         value: String(v.seats),               type: 'number_integer' },
          { namespace: 'custom', key: 'critair',       value: v.critair,                     type: 'single_line_text_field' },
          { namespace: 'custom', key: 'color',         value: v.color,                       type: 'single_line_text_field' },
          { namespace: 'custom', key: 'power',         value: v.power,                       type: 'single_line_text_field' },
          { namespace: 'custom', key: 'doors',         value: String(v.doors),               type: 'number_integer' },
          { namespace: 'custom', key: 'co2',           value: String(v.co2),                 type: 'number_integer' },
          { namespace: 'custom', key: 'options',       value: v.options,                     type: 'multi_line_text_field' },
          ...(v.badge ? [{ namespace: 'custom', key: 'badge', value: v.badge, type: 'single_line_text_field' }] : []),
        ]
      }
    };

    const result = await api('POST', '/products.json', body);
    if (result && result.product) {
      console.log(`  ✅ ${title} ${v.trim} — ${(v.price/100).toLocaleString('fr-FR')} € (id: ${result.product.id})`);
      productIds.push(result.product.id);
    } else {
      console.log(`  ❌ ${title} — échec`);
    }
    await sleep(500);
  }

  return productIds;
}

async function addProductsToCollection(collectionId, productIds) {
  if (!collectionId || productIds.length === 0) return;
  console.log('\n══════ Ajout des produits à la collection ══════');
  for (const pid of productIds) {
    const body = { collect: { product_id: pid, collection_id: collectionId } };
    const result = await api('POST', '/collects.json', body);
    if (result) {
      console.log(`  ✅ Produit ${pid} ajouté`);
    }
    await sleep(200);
  }
}

/* ═══════════════════════════════════════════
   EXECUTION
   ═══════════════════════════════════════════ */

async function main() {
  console.log('🚗 OptiAuto Market — Configuration Shopify\n');

  const tokenOk = await getAccessToken();
  if (!tokenOk) { process.exit(1); }

  await createMetafieldDefinitions();
  const collectionId = await createCollection();
  const productIds = await createProducts(collectionId);
  await addProductsToCollection(collectionId, productIds);

  console.log('\n══════ Terminé ══════');
  console.log(`✅ ${metafieldDefs.length} metafield definitions créées`);
  console.log(`✅ 1 collection créée`);
  console.log(`✅ ${productIds.length} produits créés avec photos`);
  console.log('\n📌 N\'oubliez pas d\'assigner le template "collection.cars" à votre collection dans l\'admin.');
}

main().catch(console.error);
