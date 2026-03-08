# Métachamps (metafields) – Fiche produit véhicule

Pour afficher **Historique d'entretien** et **État mécanique (Pneumatiques)** sur la page détail d'un véhicule, les définitions doivent exister dans Shopify.

**Création automatique :** connecté au panneau d'admin OptiAuto, appelez une fois **GET** ou **POST** `/api/setup-metafields`. Toutes les définitions (namespace `custom`, Produit) sont créées ; les existantes sont ignorées.

**Création manuelle :** Paramètres > Données personnalisées > Produits > Définir des métachamps.

---

Pour afficher **Historique d'entretien** et **État mécanique (Pneumatiques)** sur la page détail d'un véhicule, créez les métachamps suivants dans l’admin Shopify (Paramètres > Données personnalisées > Produits), puis renseignez-les sur chaque produit.

---

## Historique d'entretien

| Nom (clé) | Type | Description |
|-----------|------|-------------|
| `maintenance_history` | **Liste – Ligne de texte** | Une entrée par ligne. Format : `DATE \| Description`<br>Exemples :<br>• `2024-01-15 \| Vidange et filtre à huile`<br>• `2023-06-10 \| Contrôle freinage` |

La section **Historique d'entretien** n’apparaît que si ce métachamp contient au moins une entrée.

---

## État mécanique – Pneumatiques

Pour chaque roue (Avant Gauche, Avant Droit, Arrière Gauche, Arrière Droit), utilisez 4 métachamps. **Type de pneu** : utiliser une des valeurs **Été**, **Hiver** ou **4 Saisons**.

### Avant Gauche

| Nom (clé) | Type |
|-----------|------|
| `tire_ag_marque` | Ligne de texte |
| `tire_ag_dimensions` | Ligne de texte (ex. 215/45 R16) |
| `tire_ag_profondeur` | Ligne de texte (ex. 4 mm, 5,5 mm) |
| `tire_ag_type` | Ligne de texte : **Été**, **Hiver** ou **4 Saisons** |

### Avant Droit

| Nom (clé) | Type |
|-----------|------|
| `tire_ad_marque` | Ligne de texte |
| `tire_ad_dimensions` | Ligne de texte |
| `tire_ad_profondeur` | Ligne de texte |
| `tire_ad_type` | Ligne de texte : **Été**, **Hiver** ou **4 Saisons** |

### Arrière Gauche

| Nom (clé) | Type |
|-----------|------|
| `tire_rg_marque` | Ligne de texte |
| `tire_rg_dimensions` | Ligne de texte |
| `tire_rg_profondeur` | Ligne de texte |
| `tire_rg_type` | Ligne de texte : **Été**, **Hiver** ou **4 Saisons** |

### Arrière Droit

| Nom (clé) | Type |
|-----------|------|
| `tire_rd_marque` | Ligne de texte |
| `tire_rd_dimensions` | Ligne de texte |
| `tire_rd_profondeur` | Ligne de texte |
| `tire_rd_type` | Ligne de texte : **Été**, **Hiver** ou **4 Saisons** |

La section **État mécanique > Pneumatiques** s’affiche dès qu’au moins un de ces champs est renseigné pour le produit. Les blocs (Avant Gauche, etc.) n’affichent que les lignes pour lesquelles au moins une valeur est présente.

---

## Création dans Shopify

1. **Paramètres** > **Données personnalisées** > **Produits** > **Définir des métachamps** (ou **Ajouter une définition**).
2. Créez d’abord le métachamp **Liste** pour `maintenance_history` (type d’élément : Ligne de texte).
3. Créez les 16 métachamps **Ligne de texte** pour les pneumatiques (`tire_ag_marque`, `tire_ag_dimensions`, etc.) avec les noms (clés) indiqués ci-dessus.
4. Sur chaque fiche produit (Admin > Produits > [véhicule] > Métachamps), remplissez les champs souhaités.

Les sections apparaissent automatiquement sur la page détail du thème dès que les données sont renseignées.
