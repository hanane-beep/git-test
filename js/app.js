/* Fakturyo — logique principale.
   Ajouter un thème : 1) l'ajouter dans THEMES ci-dessous, 2) styliser .t-<id> dans css/style.css. */
'use strict';
const $ = (s, r = document) => r.querySelector(s), $$ = (s, r = document) => [...r.querySelectorAll(s)];
const CUR = { FCFA: { s: 'FCFA', d: 0, w: 'francs CFA' }, EUR: { s: '€', d: 2, w: 'euros' }, USD: { s: '$', d: 2, w: 'dollars US' } };
const THEMES = {
  classique: { n: 'Classique', ac: '#111111', bg: '#fff', h: '2px' },
  moderne: { n: 'Moderne', ac: '#4f46e5', bg: '#fff', h: '14px' },
  creatif: { n: 'Créatif', ac: '#ff3d71', bg: '#fff', h: '20px' },
  elegant: { n: 'Élégant', ac: '#c9a24b', bg: '#15151a', h: '14px' },
  minimal: { n: 'Minimal', ac: '#222222', bg: '#fff', h: '1px' }
};
/* ---------- Utilitaires ---------- */
const LS = {
  get(k, d) { try { const v = localStorage.getItem('fk_' + k); return v ? JSON.parse(v) : d; } catch (e) { return d; } },
  set(k, v) { try { localStorage.setItem('fk_' + k, JSON.stringify(v)); return true; } catch (e) { return false; } }
};
const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const N = v => { const x = parseFloat(String(v).replace(/\s/g, '').replace(',', '.')); return isFinite(x) ? x : 0; };
const today = () => new Date().toISOString().slice(0, 10);
const fd = v => v ? v.split('-').reverse().join('/') : '';
const lum = h => { const n = parseInt(h.slice(1), 16); return (.299 * (n >> 16) + .587 * (n >> 8 & 255) + .114 * (n & 255)) / 255; };
const fmt = (n, c = S.doc.currency) => { const k = CUR[c]; return new Intl.NumberFormat('fr-FR', { minimumFractionDigits: k.d, maximumFractionDigits: k.d }).format(n).replace(/[\u202f\u00a0]/g, '\u00a0') + '\u00a0' + k.s; };
/* Montant en lettres (français) */
const U = ['zéro', 'un', 'deux', 'trois', 'quatre', 'cinq', 'six', 'sept', 'huit', 'neuf', 'dix', 'onze', 'douze', 'treize', 'quatorze', 'quinze', 'seize', 'dix-sept', 'dix-huit', 'dix-neuf'];
const TT = ['', '', 'vingt', 'trente', 'quarante', 'cinquante', 'soixante'];
function b100(n) {
  if (n < 20) return U[n];
  if (n < 70) { const t = n / 10 | 0, u = n % 10; return TT[t] + (u ? (u == 1 ? ' et un' : '-' + U[u]) : ''); }
  if (n < 80) { const r = n - 60; return 'soixante' + (r == 11 ? ' et onze' : '-' + U[r]); }
  const r = n - 80; return 'quatre-vingt' + (r ? '-' + U[r] : 's');
}
function b1000(n) {
  const c = n / 100 | 0, r = n % 100; let s = '';
  if (c) { s = (c > 1 ? U[c] + ' ' : '') + 'cent'; if (c > 1 && !r) s += 's'; if (r) s += ' '; }
  return s + (r ? b100(r) : '');
}
function words(n) {
  n = Math.floor(n); if (!n) return 'zéro'; let s = '';
  for (const [v, w] of [[1e9, 'milliard'], [1e6, 'million']]) { const q = Math.floor(n / v); if (q) { s += b1000(q) + ' ' + w + (q > 1 ? 's' : '') + ' '; n %= v; } }
  const k = n / 1000 | 0; if (k) { s += (k > 1 ? b1000(k) + ' ' : '') + 'mille '; n %= 1000; }
  if (n) s += b1000(n); return s.trim();
}
/* ---------- État ---------- */
const year = new Date().getFullYear();
let cnt = LS.get('cnt', {});
const pre = t => t === 'facture' ? 'FAC' : 'REC';
const nextNum = t => { const c = cnt[pre(t)]; return `${pre(t)}-${year}-${String((c && c.y === year ? c.n : 0) + 1).padStart(3, '0')}`; };
const blankDoc = type => ({ type, number: nextNum(type), date: today(), due: '', currency: 'FCFA', lines: [{ d: '', q: '1', p: '' }], discount: '', discType: '%', tax: '', terms: '', payInfo: '', status: 'À payer', obj: '', payMode: 'Espèces', received: '', notes: '' });
const th0 = LS.get('theme', 'moderne');
const S = {
  me: Object.assign({ logo: '', name: '', phone: '', email: '', addr: '', ifu: '' }, LS.get('me', {})),
  cl: { name: '', phone: '', email: '', addr: '', ifu: '' },
  doc: blankDoc('facture'),
  theme: THEMES[th0] ? th0 : 'moderne', accent: LS.get('accent', null), sig: LS.get('sig', false), numAuto: true, committed: false
};
if (!S.accent) S.accent = THEMES[S.theme].ac;
function commit() { // incrémente le compteur une seule fois par document
  if (S.committed) return; const p = pre(S.doc.type);
  if (S.doc.number === nextNum(S.doc.type)) { const c = cnt[p]; cnt[p] = { y: year, n: (c && c.y === year ? c.n : 0) + 1 }; LS.set('cnt', cnt); }
  S.committed = true;
}
const getP = p => p.split('.').reduce((o, k) => o[k], S);
const setP = (p, v) => { const a = p.split('.'), k = a.pop(); a.reduce((o, x) => o[x], S)[k] = v; };
function calc() {
  const d = S.doc, sub = d.lines.reduce((a, l) => a + N(l.q) * N(l.p), 0);
  const disc = d.discType === '%' ? sub * Math.min(N(d.discount), 100) / 100 : Math.min(N(d.discount), sub);
  const tax = (sub - disc) * N(d.tax) / 100, r = x => CUR[d.currency].d ? Math.round(x * 100) / 100 : Math.round(x);
  return { sub: r(sub), disc: r(disc), tax: r(tax), total: r(sub - disc + tax) };
}
/* ---------- Formulaire (construit en JS) ---------- */
const fld = (l, p, o = {}) => `<label class="f ${o.cls || ''}" ${o.f ? `data-for="${o.f}"` : ''}><span>${l}${o.req ? ' <i>*</i>' : ''}</span>${o.ta ? `<textarea rows="2" data-b="${p}" placeholder="${o.ph || ''}"></textarea>` : `<input data-b="${p}" ${o.num ? 'inputmode="decimal"' : ''} ${o.type ? `type="${o.type}"` : ''} placeholder="${o.ph || ''}" autocomplete="off">`}<em class="msg"></em></label>`;
const sel = (l, p, opts, f) => `<label class="f" ${f ? `data-for="${f}"` : ''}><span>${l}</span><select data-b="${p}">${opts.map(o => `<option>${o}</option>`).join('')}</select></label>`;
const box = (t, h, f) => `<fieldset class="card" ${f ? `data-for="${f}"` : ''}><legend>${t}</legend>${h}</fieldset>`;
function buildForm() {
  $('#form').innerHTML =
    `<div class="seg card" role="group" aria-label="Type de document"><button data-type="facture">Facture</button><button data-type="recu">Reçu</button></div>` +
    box('Émetteur (vous)', `<div class="logoBox"><button class="btn" id="logoBtn" type="button">Importer un logo</button><input id="logoIn" type="file" accept="image/png,image/jpeg,image/svg+xml" hidden><img id="logoPv" alt="Logo" hidden><button class="btn sm" id="logoDel" type="button" hidden>Supprimer</button></div>` +
      fld('Nom de l’entreprise ou de la marque', 'me.name', { req: 1, ph: 'Ex. Le Magicien des Pixels' }) +
      `<div class="row">${fld('Téléphone', 'me.phone', { type: 'tel' })}${fld('E-mail', 'me.email', { type: 'email' })}</div>` + fld('Adresse', 'me.addr') + fld('N° IFU', 'me.ifu')) +
    box('Client', fld('Nom du client', 'cl.name', { req: 1 }) + `<div class="row">${fld('Téléphone', 'cl.phone', { type: 'tel' })}${fld('E-mail', 'cl.email', { type: 'email' })}</div>` + fld('Adresse', 'cl.addr') + fld('N° IFU', 'cl.ifu')) +
    box('Document', `<div class="row">${fld('Numéro', 'doc.number')}${sel('Devise', 'doc.currency', Object.keys(CUR))}</div><div class="row">${fld('Date d’émission', 'doc.date', { type: 'date' })}${fld('Date d’échéance', 'doc.due', { type: 'date', f: 'facture' })}</div>`) +
    box('Lignes de prestation', `<div id="lines"></div><div id="linesMsg"></div><button class="btn pr" id="addLn" type="button">+ Ajouter une ligne</button>`) +
    box('Totaux', `<div class="row keep">${fld('Remise', 'doc.discount', { num: 1, ph: '0' })}${sel('Type', 'doc.discType', ['%', 'Montant'])}</div>${fld('Taxe / TVA (%)', 'doc.tax', { num: 1, ph: '0' })}<div class="sum" id="sum"></div>`) +
    box('Paiement', fld('Conditions de paiement', 'doc.terms', { ph: 'Ex. Paiement à 15 jours' }) + fld('Coordonnées de paiement', 'doc.payInfo', { ta: 1, ph: 'Mobile Money, banque…' }) + sel('Statut', 'doc.status', ['À payer', 'Payée']), 'facture') +
    box('Paiement', fld('Objet du paiement', 'doc.obj', { ph: 'Par défaut : les descriptions des lignes' }) + sel('Mode de paiement', 'doc.payMode', ['Espèces', 'Mobile Money', 'Virement', 'Autre']) + fld('Montant reçu', 'doc.received', { num: 1, ph: 'Par défaut : le total' }) + `<div class="sum"><div id="bal"></div></div>`, 'recu') +
    box('Notes', fld('Message de remerciement ou conditions', 'doc.notes', { ta: 1 })) +
    box('Thème du document', `<div class="themes">${Object.entries(THEMES).map(([k, t]) => `<button class="th" data-th="${k}" type="button"><div class="mini" style="--a:${t.ac};--b:${t.bg};--h:${t.h}"></div>${t.n}</button>`).join('')}</div><label class="accent f"><span>Couleur d’accent</span><input type="color" id="accent"></label><label class="chk"><input type="checkbox" id="sig"> Afficher « Créé par Hanane AHOUANDJINOU | Le Magicien des Pixels » sur le document</label>`) +
    `<button class="btn" id="newDoc" type="button" style="width:100%">Nouveau document</button>`;
}
function renderLines() {
  $('#lines').innerHTML = S.doc.lines.map((l, i) => `<div class="ln" data-i="${i}"><input class="d" data-l="d" placeholder="Description" value="${esc(l.d)}"><div class="r2"><label>Qté<input data-l="q" inputmode="decimal" value="${esc(l.q)}"></label><label>Prix unitaire<input data-l="p" inputmode="decimal" value="${esc(l.p)}"></label><output>${fmt(N(l.q) * N(l.p))}</output><button class="btn sm" data-del="${i}" type="button">Supprimer</button></div></div>`).join('');
}
function fill() {
  $$('[data-b]').forEach(el => el.value = getP(el.dataset.b) ?? '');
  document.body.dataset.type = S.doc.type;
  $$('[data-type]').forEach(b => b.classList.toggle('on', b.dataset.type === S.doc.type));
  $$('[data-th]').forEach(b => b.classList.toggle('on', b.dataset.th === S.theme));
  $('#accent').value = S.accent; $('#sig').checked = S.sig;
  const lg = $('#logoPv'); lg.hidden = $('#logoDel').hidden = !S.me.logo; if (S.me.logo) lg.src = S.me.logo;
  renderLines();
}
/* ---------- Document généré ---------- */
function docHTML() {
  const d = S.doc, m = S.me, c = S.cl, fac = d.type === 'facture', t = calc(), F = n => fmt(n);
  const ln = (v, p = '') => v ? `<div>${p}${esc(v)}</div>` : '';
  const head = `<div class="hd"><div>${m.logo ? `<img class="lg" src="${m.logo}" alt="">` : ''}<div class="nm">${esc(m.name || 'Votre entreprise')}</div><div class="sm">${ln(m.addr)}${ln(m.phone)}${ln(m.email)}${ln(m.ifu, 'IFU : ')}</div></div>` +
    `<div class="meta"><div class="ttl">${fac ? 'FACTURE' : 'REÇU DE PAIEMENT'}</div><div class="sm"><div>N° <b>${esc(d.number)}</b></div><div>Date : ${fd(d.date)}</div>${fac && d.due ? `<div>Échéance : ${fd(d.due)}</div>` : ''}</div>${fac && d.status === 'Payée' ? '<span class="stamp">PAYÉE</span>' : ''}</div></div>`;
  const to = `<div class="to"><div class="lb">${fac ? 'Facturé à' : 'Reçu de'}</div><b>${esc(c.name || 'Nom du client')}</b><div class="sm">${ln(c.addr)}${ln(c.phone)}${ln(c.email)}${ln(c.ifu, 'IFU : ')}</div></div>`;
  let body;
  if (fac) {
    const rows = d.lines.filter(l => l.d || N(l.p)).map(l => `<tr><td>${esc(l.d)}</td><td class="r">${esc(l.q)}</td><td class="r">${F(N(l.p))}</td><td class="r">${F(N(l.q) * N(l.p))}</td></tr>`).join('');
    body = `<table><thead><tr><th>Description</th><th class="r">Qté</th><th class="r">Prix unitaire</th><th class="r">Montant</th></tr></thead><tbody>${rows}</tbody></table>` +
      `<div class="tot"><div><span>Sous-total</span><span>${F(t.sub)}</span></div>${t.disc ? `<div><span>Remise${d.discType === '%' ? ' (' + N(d.discount) + ' %)' : ''}</span><span>− ${F(t.disc)}</span></div>` : ''}${t.tax ? `<div><span>TVA (${N(d.tax)} %)</span><span>${F(t.tax)}</span></div>` : ''}<div class="g"><span>Total</span><span>${F(t.total)}</span></div></div>` +
      (d.terms ? `<div class="pay"><div class="lb">Conditions de paiement</div>${esc(d.terms)}</div>` : '') + (d.payInfo ? `<div class="pay"><div class="lb">Coordonnées de paiement</div>${esc(d.payInfo)}</div>` : '');
  } else {
    const rec = d.received === '' ? t.total : N(d.received), bal = Math.max(0, Math.round((t.total - rec) * 100) / 100);
    const w = words(rec); const obj = d.obj || d.lines.map(l => l.d).filter(Boolean).join(', ') || '—';
    body = `<div class="obj"><div class="lb">Objet du paiement</div>${esc(obj)}</div><div class="amt"><div class="lb">Montant reçu</div><div class="big">${F(rec)}</div><div class="sm">Arrêté à la somme de : ${esc(w[0].toUpperCase() + w.slice(1))} ${CUR[d.currency].w}</div></div>` +
      `<div class="tot"><div><span>Total à payer</span><span>${F(t.total)}</span></div><div><span>Mode de paiement</span><span>${esc(d.payMode)}</span></div>${bal ? `<div class="g"><span>Solde restant</span><span>${F(bal)}</span></div>` : ''}</div><div class="thx">Merci pour votre confiance</div>`;
  }
  const notes = d.notes ? `<div class="pay"><div class="lb">Notes</div>${esc(d.notes)}</div>` : '';
  const foot = `<div class="foot"><div>${fac ? 'Facture générée sur Fakturyo' : 'Reçu généré sur Fakturyo'}</div>${S.sig ? '<div>Créé par Hanane AHOUANDJINOU | Le Magicien des Pixels</div>' : ''}</div>`;
  return `<div class="doc t-${S.theme}" style="--ac:${S.accent};--on:${lum(S.accent) > .62 ? '#111' : '#fff'}">${head}${to}${body}${notes}${foot}</div>`;
}
function render() {
  $('#pvBox').innerHTML = docHTML(); fit();
  const t = calc(), F = n => fmt(n);
  $('#sum').innerHTML = `<div><span>Sous-total</span><span>${F(t.sub)}</span></div>${t.disc ? `<div><span>Remise</span><span>− ${F(t.disc)}</span></div>` : ''}${t.tax ? `<div><span>Taxe</span><span>${F(t.tax)}</span></div>` : ''}<div class="g"><span>Total général</span><span>${F(t.total)}</span></div>`;
  const rec = S.doc.received === '' ? t.total : N(S.doc.received);
  $('#bal').innerHTML = `<span>Solde restant</span><span>${F(Math.max(0, t.total - rec))}</span>`;
}
function fit() { // met l'aperçu A4 à l'échelle de l'écran
  const h = $('#pvBox'), d = h.firstElementChild, w = h.clientWidth; if (!d || !w) return;
  const k = Math.min(1, w / 794); d.style.transform = `scale(${k})`; h.style.height = d.offsetHeight * k + 'px';
}
/* ---------- Événements ---------- */
const clean = el => { if (el.inputMode === 'decimal') el.value = el.value.replace(/[^0-9.,]/g, ''); };
function bind() {
  const f = $('#form');
  f.addEventListener('input', e => {
    const el = e.target;
    if (el.dataset.b) {
      clean(el); setP(el.dataset.b, el.value);
      if (el.dataset.b === 'doc.number') S.numAuto = false;
      if (el.dataset.b.startsWith('me.')) saveMe();
      if (el.dataset.b === 'doc.currency') renderLines();
      el.closest('.f')?.classList.remove('err'); render();
    } else if (el.dataset.l) {
      clean(el); const ln = el.closest('.ln'); S.doc.lines[ln.dataset.i][el.dataset.l] = el.value;
      const l = S.doc.lines[ln.dataset.i]; $('output', ln).textContent = fmt(N(l.q) * N(l.p)); $('#linesMsg').classList.remove('on'); render();
    } else if (el.id === 'accent') { S.accent = el.value; LS.set('accent', S.accent); render(); }
    else if (el.id === 'sig') { S.sig = el.checked; LS.set('sig', S.sig); render(); }
  });
  f.addEventListener('click', e => {
    const b = e.target.closest('button'); if (!b) return;
    if (b.dataset.type) { S.doc.type = b.dataset.type; if (S.numAuto) S.doc.number = nextNum(S.doc.type); S.committed = false; fill(); render(); }
    else if (b.dataset.th) { S.theme = b.dataset.th; S.accent = THEMES[S.theme].ac; LS.set('theme', S.theme); LS.set('accent', S.accent); fill(); render(); }
    else if (b.id === 'addLn') { S.doc.lines.push({ d: '', q: '1', p: '' }); renderLines(); render(); $$('.ln .d').pop().focus(); }
    else if (b.dataset.del !== undefined) { const i = +b.dataset.del; if (S.doc.lines.length > 1) S.doc.lines.splice(i, 1); else S.doc.lines[0] = { d: '', q: '1', p: '' }; renderLines(); render(); }
    else if (b.id === 'logoBtn') $('#logoIn').click();
    else if (b.id === 'logoDel') { S.me.logo = ''; saveMe(); fill(); render(); }
    else if (b.id === 'newDoc') newDoc();
  });
  $('#logoIn').onchange = e => {
    const file = e.target.files[0]; if (!file) return;
    if (file.size > 3e6) return toast('Logo trop lourd (3 Mo maximum).');
    const r = new FileReader();
    r.onload = () => {
      const set = u => { S.me.logo = u; saveMe(); fill(); render(); };
      if (file.type === 'image/svg+xml') return set(r.result);
      const im = new Image();
      im.onload = () => { const k = Math.min(1, 500 / Math.max(im.width, im.height)), c = document.createElement('canvas'); c.width = im.width * k; c.height = im.height * k; c.getContext('2d').drawImage(im, 0, 0, c.width, c.height); set(c.toDataURL(file.type === 'image/jpeg' ? 'image/jpeg' : 'image/png', .9)); };
      im.onerror = () => toast('Image illisible.'); im.src = r.result;
    };
    r.readAsDataURL(file); e.target.value = '';
  };
  $$('.tabs button').forEach(b => b.onclick = () => { document.body.dataset.tab = b.dataset.t; $$('.tabs button').forEach(x => x.classList.toggle('on', x === b)); scrollTo(0, 0); fit(); });
  $('#modeBtn').onclick = () => { const m = document.documentElement.dataset.mode === 'dark' ? 'light' : 'dark'; document.documentElement.dataset.mode = m; LS.set('mode', m); };
  $$('.bar [data-act]').forEach(b => b.onclick = () => act(b.dataset.act));
  new ResizeObserver(fit).observe($('#pvBox'));
}
function saveMe() { if (!LS.set('me', S.me)) toast('Stockage plein : le logo n’a pas pu être mémorisé.'); }
function newDoc() {
  if (!confirm('Créer un nouveau document ? Le client et les lignes seront effacés.')) return;
  S.cl = { name: '', phone: '', email: '', addr: '', ifu: '' }; S.doc = blankDoc(S.doc.type); S.numAuto = true; S.committed = false; fill(); render(); scrollTo(0, 0);
}
/* ---------- Validation ---------- */
function validate() {
  $$('.err').forEach(x => x.classList.remove('err')); $('#linesMsg').classList.remove('on');
  const errs = [];
  if (!S.me.name.trim()) errs.push(['me.name', 'Indiquez le nom de l’émetteur.']);
  if (!S.cl.name.trim()) errs.push(['cl.name', 'Indiquez le nom du client.']);
  if (!S.doc.lines.some(l => N(l.q) * N(l.p) > 0)) errs.push(['lines', 'Ajoutez au moins une ligne avec un montant.']);
  if (!errs.length) return true;
  document.body.dataset.tab = 'saisie'; $$('.tabs button').forEach(x => x.classList.toggle('on', x.dataset.t === 'saisie'));
  let first;
  errs.forEach(([p, m]) => {
    if (p === 'lines') { const e = $('#linesMsg'); e.textContent = m; e.classList.add('on'); first = first || e; }
    else { const el = $(`[data-b="${p}"]`).closest('.f'); el.classList.add('err'); $('.msg', el).textContent = m; first = first || el; }
  });
  first.scrollIntoView({ block: 'center', behavior: 'smooth' }); toast(errs[0][1]); return false;
}
/* ---------- Export ---------- */
const fname = ext => (S.doc.number || 'document').replace(/[^\w-]+/g, '_') + '.' + ext;
async function snap() {
  await document.fonts.ready;
  const n = document.createElement('div'); n.style.cssText = 'position:fixed;left:-9999px;top:0;width:794px'; n.innerHTML = docHTML(); document.body.appendChild(n);
  try {
    const d = n.firstElementChild, pages = Math.max(1, Math.ceil((d.offsetHeight - 2) / 1123)); d.style.minHeight = pages * 1123 + 'px';
    const c = await html2canvas(d, { scale: 2, backgroundColor: '#ffffff', useCORS: true, logging: false }); return { c, pages };
  } finally { n.remove(); }
}
async function mkPDF() {
  const { c, pages } = await snap(), pdf = new window.jspdf.jsPDF({ unit: 'pt', format: 'a4', compress: true }), W = 595.28, H = 841.89, img = c.toDataURL('image/jpeg', .95);
  for (let i = 0; i < pages; i++) { if (i) pdf.addPage(); pdf.addImage(img, 'JPEG', 0, -i * H, W, H * pages); }
  return pdf;
}
const dl = (url, name) => { const a = document.createElement('a'); a.href = url; a.download = name; document.body.appendChild(a); a.click(); a.remove(); };
async function act(kind) {
  if (!validate()) return;
  const btns = $$('.bar button'); btns.forEach(b => b.disabled = true); toast('Génération en cours…');
  try {
    if (kind === 'pdf') (await mkPDF()).save(fname('pdf'));
    else if (kind === 'png') dl((await snap()).c.toDataURL('image/png'), fname('png'));
    else if (kind === 'print') { $('#printRoot').innerHTML = docHTML(); await document.fonts.ready; window.print(); }
    else if (kind === 'share') {
      const pdf = await mkPDF(), file = new File([pdf.output('blob')], fname('pdf'), { type: 'application/pdf' });
      if (navigator.canShare && navigator.canShare({ files: [file] })) await navigator.share({ files: [file], title: S.doc.number });
      else { pdf.save(fname('pdf')); toast('Partage indisponible sur cet appareil : PDF téléchargé.'); return; }
    }
    commit(); hideToast();
  } catch (e) { if (e && e.name === 'AbortError') hideToast(); else toast('Une erreur est survenue. Réessayez.'); }
  finally { btns.forEach(b => b.disabled = false); }
}
addEventListener('afterprint', () => $('#printRoot').innerHTML = '');
/* ---------- Messages ---------- */
let tt;
function toast(msg, a) {
  const t = $('#toast'); t.textContent = msg; t.classList.add('on'); clearTimeout(tt);
  if (a) { const b = document.createElement('button'); b.textContent = a.label; b.onclick = a.fn; t.appendChild(b); } else tt = setTimeout(hideToast, 4000);
}
const hideToast = () => $('#toast').classList.remove('on');
/* ---------- Démarrage, hors ligne, mise à jour ---------- */
document.documentElement.dataset.mode = LS.get('mode', matchMedia('(prefers-color-scheme:dark)').matches ? 'dark' : 'light');
buildForm(); bind(); fill(); render();
const off = () => $('#off').hidden = navigator.onLine; addEventListener('online', off); addEventListener('offline', off); off();
if ('serviceWorker' in navigator) {
  const had = !!navigator.serviceWorker.controller; let rl;
  navigator.serviceWorker.addEventListener('controllerchange', () => { if (had && !rl) { rl = 1; location.reload(); } });
  addEventListener('load', () => navigator.serviceWorker.register('sw.js').then(r => r.addEventListener('updatefound', () => {
    const w = r.installing; w && w.addEventListener('statechange', () => { if (w.state === 'installed' && navigator.serviceWorker.controller) toast('Nouvelle version disponible', { label: 'Actualiser', fn: () => w.postMessage('skip') }); });
  })).catch(() => { }));
}
