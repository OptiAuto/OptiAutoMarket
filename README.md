# OptiAuto Market - Thème Shopify

Thème Shopify complet pour la vente de voitures d'occasion, inspiré des meilleurs sites du marché (CapCar, La Centrale, AutoScout24, Carvana, etc.).

## 🚗 Fonctionnalités

- **Page d'accueil** : Hero, catégories, grille de véhicules, avantages, statistiques, témoignages
- **Catalogue** : Filtres avancés (marque, prix, année, km, carburant, boîte), tri, pagination
- **Fiche véhicule** : Galerie photos, spécifications, contact
- **Design** : Moderne, élégant, responsive (mobile-first)
- **Sections personnalisables** via l'éditeur de thème Shopify

## 📦 Structure du thème

```
src/
├── assets/          # CSS, JS
├── config/         # Paramètres du thème, metafields
├── layout/         # theme.liquid
├── locales/        # Traductions (fr.json)
├── sections/       # Sections réutilisables
├── snippets/       # Composants (vehicle-card)
└── templates/      # index, collection, product, page
```

## 🛠 Installation sur Shopify

### Méthode 1 : Upload ZIP
1. Compressez le dossier `src` en ZIP (le contenu doit être à la racine : assets/, config/, etc.)
2. Dans l'admin Shopify : **Boutique en ligne** > **Thèmes** > **Ajouter un thème** > **Importer un fichier ZIP**

### Méthode 2 : Shopify CLI
```bash
cd src
shopify theme push
```

## 📋 Configuration des produits (véhicules)

Pour chaque véhicule (produit), configurez les **metafields** suivants :

| Metafield | Type | Exemple |
|-----------|------|---------|
| custom.year | Texte | 2020 |
| custom.mileage | Nombre | 45000 |
| custom.fuel_type | Texte | Diesel, Essence, Électrique, Hybride |
| custom.transmission | Texte | Manuelle, Automatique |
| custom.price_indicator | Texte | Bonne affaire, Très bonne affaire |
| custom.power | Texte | 150 ch |
| custom.color | Texte | Noir |
| custom.doors | Nombre | 5 |
| custom.seats | Nombre | 5 |
| custom.co2 | Nombre | 120 |

### Créer les metafields dans Shopify
1. **Paramètres** > **Métachamps** > **Produits**
2. Créez les champs selon le fichier `config/metafields_schema.json`

## 📁 Collections recommandées

Créez des collections pour les catégories :
- Citadine
- SUV / 4x4
- Berline
- Break
- Monospace
- Utilitaire

## 📄 Pages à créer

- `/pages/vendre-ma-voiture` - Formulaire ou infos vente
- `/pages/estimation` - Estimation gratuite
- `/pages/comment-ca-marche` - Processus d'achat
- `/pages/garanties` - Garanties
- `/pages/financement` - Options de financement
- `/pages/contact` - Contact
- `/pages/reprise` - Reprise véhicule

## 🎨 Personnalisation

Dans **Personnaliser le thème** > **Paramètres du thème** :
- Couleurs (primaire, accent, fond)
- Téléphone d'en-tête
- Texte du bouton "Vendre ma voiture"
- Copyright du pied de page

## 📱 Responsive

Le thème est optimisé pour :
- Mobile (< 768px)
- Tablette (768px - 1024px)
- Desktop (> 1024px)

## 🔗 Références

Inspiré des fonctionnalités de : CapCar, La Centrale, AutoScout24, Carvana, Aramis Auto, Spoticar, AutoHero, Alvergnas.
