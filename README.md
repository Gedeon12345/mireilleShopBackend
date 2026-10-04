# Backend – Mireille Shop (Express + MongoDB)

## Lancer en local
```bash
cd backend
npm install
cp .env.example .env     # renseigner MONGO_URI (Atlas) et JWT_SECRET
npm run init             # 1er administrateur + catégories (ADMIN_EMAIL / ADMIN_PASSWORD dans .env)
npm run dev              # http://localhost:5000/api/health
```
Retirez ensuite `ADMIN_PASSWORD` du `.env`. Côté frontend : `VITE_USE_MOCK=false` (le proxy Vite envoie `/api` vers le port 5000).

## Déployer sur Render
1. **MongoDB Atlas** : cluster gratuit, utilisateur de base, accès réseau `0.0.0.0/0`, copier l'URI dans `MONGO_URI`.
2. **Render** > New > Web Service > Root Directory `backend`, Build `npm install`, Start `npm start`.
3. Variables : `MONGO_URI`, `JWT_SECRET` (32+ caractères), `FRONTEND_URL` (URL Vercel, sans `/` final ; plusieurs séparées par des virgules), `TZ_OFFSET_MINUTES=60`, `CLOUDINARY_URL` (optionnel).
4. Premier compte : onglet *Shell* de Render, ou en local avec l'URI Atlas : `ADMIN_EMAIL=... ADMIN_PASSWORD=... npm run init`.
5. Vercel : `VITE_USE_MOCK=false` et `VITE_API_URL=https://<service>.onrender.com/api`, puis redéployer.

## Règles garanties côté serveur
- Vente + déduction du stock dans **une transaction** ; déduction conditionnelle : jamais de stock négatif, même avec deux ventes simultanées.
- Annulation : stock restauré, vente conservée (`cancelled`) ; aucune suppression de vente ni de produit (archivage).
- Chaque variation de stock (initial, vente, annulation, modification, ajustement) crée un `StockMovement`.
- Une ligne de stock = pointure + couleur, unique par produit (couleur insensible à la casse).
- Routes privées protégées par JWT ; connexion limitée à 10 échecs / 15 min ; mots de passe hachés (bcrypt).

## Test de bout en bout (sur l'API en ligne)
```bash
API_URL=https://<service>.onrender.com/api EMAIL=admin@... PASSWORD=... npm run smoke
```
Vérifie les critères du cahier : produit multi-pointures/couleurs, vente, refus au-delà du stock, ventes simultanées, annulation, archivage, routes protégées. Crée un produit « [TEST] » archivé à la fin.
