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

// protection du stock contre les écrasements
const stale = (await call('GET', `/products/${pid}`, null, T)).data
const adj = await call('POST', '/inventory/adjustment', { product: pid, size: 42, color: 'Noir', delta: 3, reason: 'Test réception' }, T)
check('Réception relative (+3)', adj.status === 200 && adj.data.newQuantity === adj.data.previousQuantity + 3, JSON.stringify(adj.data))
const upd = await call('PUT', `/products/${pid}`, { name: stale.name, category: stale.category._id, gender: stale.gender, price: stale.price, sizes: stale.sizes, updatedAt: stale.updatedAt }, T)
check('Modification sur fiche périmée refusée (409)', upd.status === 409, `statut=${upd.status}`)
await call('POST', '/inventory/adjustment', { product: pid, size: 42, color: 'Noir', delta: -3, reason: 'Test retour' }, T)

// comptes employés : droits limités
const empEmail = `test.vendeur.${Date.now()}@example.com`
const empPass = 'motdepasse-test-1'
const emp = await call('POST', '/users', { name: '[TEST] Vendeur', email: empEmail, password: empPass }, T)
check('Compte employé créé', emp.status === 201 && emp.data.role === 'employee' && !emp.data.password, JSON.stringify(emp.data))
const eLogin = await call('POST', '/auth/login', { email: empEmail, password: empPass })
const E = eLogin.data?.token
check('Connexion employé', eLogin.status === 200 && !!E)
if (E) {
  check('Employé : création de produit refusée', (await call('POST', '/products', body, E)).status === 403)
  check('Employé : ajustement de stock refusé', (await call('POST', '/inventory/adjustment', { product: pid, size: 42, color: 'Noir', newQuantity: 9, reason: 'test' }, E)).status === 403)
  check('Employé : gestion des comptes refusée', (await call('GET', '/users', null, E)).status === 403)
  const es = await call('POST', '/sales', { items: [{ product: pid, size: 42, color: 'Noir', quantity: 1 }] }, E)
  check('Employé : vente autorisée', es.status === 201, JSON.stringify(es.data))
  if (es.status === 201) {
    check('Employé : annulation refusée', (await call('POST', `/sales/${es.data._id}/cancel`, null, E)).status === 403)
    const eh = await call('GET', '/sales', null, E)
    check('Employé : ne voit que ses ventes', eh.status === 200 && eh.data.length > 0 && eh.data.every((x) => x.createdBy === eLogin.data.user.name))
    await call('POST', `/sales/${es.data._id}/cancel`, null, T)
  }
}
if (emp.data?._id) {
  await call('PATCH', `/users/${emp.data._id}`, { isActive: false }, T)
  check('Compte désactivé : accès immédiatement refusé', E ? (await call('GET', '/products', null, E)).status === 401 : false)
  check('Compte désactivé : nouvelle connexion refusée', (await call('POST', '/auth/login', { email: empEmail, password: empPass })).status === 403)
}

// 9. produit archivé non vendable
check('Archivage du produit', (await call('PATCH', `/products/${pid}/archive`, null, T)).status === 200)
const arch = await call('POST', '/sales', { items: [{ product: pid, size: 42, color: 'Noir', quantity: 1 }] }, T)
check('Produit archivé non vendable', arch.status === 404, `statut=${arch.status}`)

// 10. archives : restauration et suppression définitive
const archived = await call('GET', '/products?archived=true', null, T)
check('Liste des produits archivés', archived.status === 200 && archived.data.some((x) => x._id === pid))
check('Restauration d’un produit archivé', (await call('PATCH', `/products/${pid}/restore`, null, T)).status === 200)
check('Suppression refusée si le produit est actif', (await call('DELETE', `/products/${pid}`, null, T)).status === 409)
await call('PATCH', `/products/${pid}/archive`, null, T)
check('Suppression définitive refusée s’il y a un historique de ventes', (await call('DELETE', `/products/${pid}`, null, T)).status === 409)
const tmp = await call('POST', '/products', { ...body, name: '[TEST] Sans vente' }, T)
await call('PATCH', `/products/${tmp.data._id}/archive`, null, T)
check('Suppression définitive d’un produit jamais vendu', (await call('DELETE', `/products/${tmp.data._id}`, null, T)).status === 200)
check('Produit supprimé introuvable', (await call('GET', `/products/${tmp.data._id}`, null, T)).status === 404)

console.log(`\n${pass} réussis, ${fail} échec(s).`)
process.exit(fail ? 1 : 0)
