// Test de bout en bout contre une API en ligne (critères de validation du cahier des charges).
// Usage : API_URL=https://xxx.onrender.com/api EMAIL=... PASSWORD=... npm run smoke
// Crée un produit "[TEST]" qui est archivé à la fin (aucune suppression, l'historique de test reste visible).
const API = (process.env.API_URL || '').replace(/\/+$/, '')
const { EMAIL, PASSWORD } = process.env
if (!API || !EMAIL || !PASSWORD) { console.error('Renseignez API_URL, EMAIL et PASSWORD.'); process.exit(1) }

const call = async (method, path, body, token) => {
  const r = await fetch(`${API}${path}`, {
    method,
    headers: { ...(body ? { 'Content-Type': 'application/json' } : {}), ...(token ? { Authorization: `Bearer ${token}` } : {}) },
    body: body ? JSON.stringify(body) : undefined,
  })
  let data = null
  try { data = await r.json() } catch { /* pas de corps */ }
  return { status: r.status, data }
}
let pass = 0, fail = 0
const check = (name, cond, info = '') => { cond ? pass++ : fail++; console.log(`${cond ? 'OK    ' : 'ÉCHEC '} ${name}${cond ? '' : `  -> ${info}`}`) }
const qty = (p, size, color) => p.sizes.find((s) => s.size === size && s.color === color)?.quantity

console.log(`Test sur ${API}\n(première requête lente possible : Render se réveille)\n`)

// 12. routes privées protégées
check('Route privée refusée sans connexion', (await call('GET', '/products')).status === 401)
check('Mauvais mot de passe refusé', (await call('POST', '/auth/login', { email: EMAIL, password: `${PASSWORD}x` })).status === 401)
const login = await call('POST', '/auth/login', { email: EMAIL, password: PASSWORD })
check('Connexion administrateur', login.status === 200 && !!login.data?.token, JSON.stringify(login.data))
const T = login.data?.token
if (!T) process.exit(1)

const cats = await call('GET', '/categories', null, T)
check('Catégories disponibles', cats.status === 200 && cats.data.length > 0)
const category = cats.data[0]._id

// 1-2. produit multi-pointures / couleurs
const body = { name: '[TEST] Chaussure', category, gender: 'Mixte', price: 10000, sizes: [
  { size: 41, color: 'Noir', quantity: 5 }, { size: 41, color: 'Blanc', quantity: 3 }, { size: 42, color: 'Noir', quantity: 2 }] }
const created = await call('POST', '/products', body, T)
check('Produit créé avec plusieurs pointures et couleurs', created.status === 201 && created.data.sizes.length === 3, JSON.stringify(created.data))
const pid = created.data._id
check('Doublon pointure + couleur refusé', (await call('POST', '/products', { ...body, sizes: [{ size: 41, color: 'noir', quantity: 1 }, { size: 41, color: 'NOIR', quantity: 2 }] }, T)).status === 400)
check('Prix nul refusé', (await call('POST', '/products', { ...body, price: 0 }, T)).status === 400)

// 3-4. vente : seule la bonne ligne baisse
const sale = await call('POST', '/sales', { items: [{ product: pid, size: 41, color: 'Noir', quantity: 2 }] }, T)
check('Vente enregistrée', sale.status === 201 && sale.data.totalAmount === 20000, JSON.stringify(sale.data))
let p = (await call('GET', `/products/${pid}`, null, T)).data
check('Le stock de la ligne vendue baisse (5 -> 3)', qty(p, 41, 'Noir') === 3, `qté=${qty(p, 41, 'Noir')}`)
check('Les autres lignes restent inchangées', qty(p, 41, 'Blanc') === 3 && qty(p, 42, 'Noir') === 2)

// 5. refus des ventes impossibles
const over = await call('POST', '/sales', { items: [{ product: pid, size: 41, color: 'Blanc', quantity: 99 }] }, T)
check('Vente supérieure au stock refusée', over.status === 409, `statut=${over.status}`)
check('Quantité nulle refusée', (await call('POST', '/sales', { items: [{ product: pid, size: 41, color: 'Blanc', quantity: 0 }] }, T)).status === 400)
p = (await call('GET', `/products/${pid}`, null, T)).data
check('Aucune déduction après un refus', qty(p, 41, 'Blanc') === 3)

// annulation
const cancel = await call('POST', `/sales/${sale.data._id}/cancel`, null, T)
check('Annulation de la vente', cancel.status === 200 && cancel.data.status === 'cancelled')
p = (await call('GET', `/products/${pid}`, null, T)).data
check('Stock restauré après annulation (3 -> 5)', qty(p, 41, 'Noir') === 5)
check('Double annulation refusée', (await call('POST', `/sales/${sale.data._id}/cancel`, null, T)).status === 409)

// ventes simultanées : 2 x 2 paires sur un stock de 3 -> une seule doit passer
const race = await Promise.all([1, 2].map(() => call('POST', '/sales', { items: [{ product: pid, size: 41, color: 'Blanc', quantity: 2 }] }, T)))
const wins = race.filter((r) => r.status === 201)
check('Deux ventes simultanées : une seule acceptée', wins.length === 1, race.map((r) => r.status).join(','))
p = (await call('GET', `/products/${pid}`, null, T)).data
check('Stock jamais négatif (3 -> 1)', qty(p, 41, 'Blanc') === 1, `qté=${qty(p, 41, 'Blanc')}`)
if (wins[0]) await call('POST', `/sales/${wins[0].data._id}/cancel`, null, T)

// historique, statistiques
const mv = await call('GET', `/inventory/movements?product=${pid}`, null, T)
check('Mouvements de stock tracés', mv.status === 200 && mv.data.length >= 5, `n=${mv.data?.length}`)
const dash = await call('GET', '/dashboard', null, T)
check('Tableau de bord alimenté', dash.status === 200 && typeof dash.data.totalStock === 'number')
const hist = await call('GET', '/sales', null, T)
check('Historique conserve les ventes (dont annulées)', hist.status === 200 && hist.data.some((s) => s.status === 'cancelled'))

// 9. produit archivé non vendable
check('Archivage du produit', (await call('PATCH', `/products/${pid}/archive`, null, T)).status === 200)
const arch = await call('POST', '/sales', { items: [{ product: pid, size: 42, color: 'Noir', quantity: 1 }] }, T)
check('Produit archivé non vendable', arch.status === 404, `statut=${arch.status}`)

console.log(`\n${pass} réussis, ${fail} échec(s).`)
process.exit(fail ? 1 : 0)
