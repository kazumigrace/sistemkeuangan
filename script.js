const KEY = 'catatan-keuangan-mhs-v1';
const CO = [['Makan & minum','🍜'],['Transport','🚌'],['Kos & sewa','🏠'],['Kuliah & buku','📚'],['Pulsa & internet','📱'],['Hiburan','🎮'],['Belanja','🛍️'],['Kesehatan','💊'],['Lainnya','✨']];
const CI = [['Kiriman orang tua','💌'],['Beasiswa','🎓'],['Kerja paruh waktu','💼'],['Lainnya','🎁']];
const V = { day: 'Harian', week: 'Mingguan', month: 'Bulanan' };
const TONES = ['lav', 'mint', 'peach', 'pink', 'sky', 'lemon'];

let state = { tx: [], budget: 0 }, view = 'day', anchor = new Date(), editId = null;

const $ = i => document.getElementById(i);
const pad = n => String(n).padStart(2, '0');
const ds = d => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
const pd = s => { const [a, b, c] = s.split('-'); return new Date(+a, +b - 1, +c); };
const rp = n => 'Rp ' + new Intl.NumberFormat('id-ID').format(n);
const esc = s => String(s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
const info = (type, cat) => {
  const l = type === 'in' ? CI : CO;
  let i = l.findIndex(x => x[0] === cat); if (i < 0) i = l.length - 1;
  return { e: l[i][1], t: TONES[(i + (type === 'in' ? 1 : 0)) % 6] };
};

/* ---------- Penyimpanan (otomatis setiap ada perubahan) ---------- */
function load() {
  try {
    const o = JSON.parse(localStorage.getItem(KEY));
    if (o && Array.isArray(o.tx)) state = { tx: o.tx, budget: +o.budget || 0 };
  } catch (e) {}
}
function save() {
  try {
    localStorage.setItem(KEY, JSON.stringify(state));
    const n = new Date();
    $('st').textContent = `✓ Tersimpan ${pad(n.getHours())}:${pad(n.getMinutes())}`;
  } catch (e) { $('st').textContent = 'Gagal menyimpan, pakai cadangan'; }
}

/* ---------- Periode ---------- */
function range() {
  const a = new Date(anchor.getFullYear(), anchor.getMonth(), anchor.getDate());
  let s = a, e = a;
  if (view === 'week') { s = new Date(a); s.setDate(a.getDate() - ((a.getDay() + 6) % 7)); e = new Date(s); e.setDate(s.getDate() + 6); }
  if (view === 'month') { s = new Date(a.getFullYear(), a.getMonth(), 1); e = new Date(a.getFullYear(), a.getMonth() + 1, 0); }
  return [s, e];
}
function shift(n) {
  if (view === 'day') anchor.setDate(anchor.getDate() + n);
  else if (view === 'week') anchor.setDate(anchor.getDate() + 7 * n);
  else { anchor.setDate(1); anchor.setMonth(anchor.getMonth() + n); }
  render();
}

/* ---------- Form ---------- */
function cats(sel) {
  const l = $('f-type').value === 'out' ? CO : CI;
  $('f-cat').innerHTML = l.map(c => `<option value="${c[0]}">${c[1]} ${c[0]}</option>`).join('');
  if (sel) $('f-cat').value = sel;
}
function resetForm() {
  editId = null; $('f-amt').value = ''; $('f-note').value = '';
  $('ft').textContent = '🌸 Tambah transaksi'; $('f-ok').textContent = 'Simpan'; $('f-cx').hidden = true;
}
function add(ev) {
  ev.preventDefault();
  const amt = parseInt($('f-amt').value.replace(/\D/g, ''), 10);
  if (!amt) return false;
  const t = { id: editId || Date.now(), type: $('f-type').value, d: $('f-date').value, cat: $('f-cat').value, amt, note: $('f-note').value.trim() };
  if (editId) state.tx = state.tx.map(x => x.id == editId ? t : x); else state.tx.push(t);
  anchor = pd(t.d); resetForm(); save(); render();
  return false;
}
function edit(id) {
  const t = state.tx.find(x => x.id == id); if (!t) return;
  editId = id; $('f-type').value = t.type; cats(t.cat);
  $('f-date').value = t.d; $('f-amt').value = t.amt; $('f-note').value = t.note;
  $('ft').textContent = '✏️ Ubah transaksi'; $('f-ok').textContent = 'Simpan perubahan'; $('f-cx').hidden = false;
  window.scrollTo(0, 0);
}
function del(id) {
  state.tx = state.tx.filter(x => x.id != id);
  if (editId == id) resetForm();
  save(); render();
}
function setBudget() {
  state.budget = parseInt($('bud').value.replace(/\D/g, ''), 10) || 0;
  save(); render(true);
}

/* ---------- Tampilan ---------- */
function render(keepBudgetInput) {
  const [rs, re] = range(), s = ds(rs), e = ds(re);
  $('tabs').innerHTML = Object.keys(V).map(k => `<button class="${k === view ? 'on' : ''}" onclick="view='${k}';render()">${V[k]}</button>`).join('');
  $('lbl').textContent = view === 'week'
    ? `${rs.toLocaleDateString('id-ID', { day: 'numeric', month: 'short' })} – ${re.toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' })}`
    : anchor.toLocaleDateString('id-ID', view === 'day' ? { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' } : { month: 'long', year: 'numeric' });

  const L = state.tx.filter(t => t.d >= s && t.d <= e).sort((a, b) => a.d < b.d ? 1 : a.d > b.d ? -1 : b.id - a.id);
  let tin = 0, tout = 0; const by = {}, days = {};
  L.forEach(t => {
    if (t.type === 'in') tin += t.amt;
    else { tout += t.amt; by[t.cat] = (by[t.cat] || 0) + t.amt; days[t.d] = (days[t.d] || 0) + t.amt; }
  });
  $('s-in').textContent = rp(tin); $('s-out').textContent = rp(tout);
  const bal = tin - tout; $('s-bal').textContent = (bal < 0 ? '-' : '') + rp(Math.abs(bal));

  // anggaran (bulan dari tanggal acuan)
  const ms = ds(new Date(anchor.getFullYear(), anchor.getMonth(), 1)), me = ds(new Date(anchor.getFullYear(), anchor.getMonth() + 1, 0));
  const mo = state.tx.reduce((a, t) => a + (t.type === 'out' && t.d >= ms && t.d <= me ? t.amt : 0), 0);
  if (!keepBudgetInput) $('bud').value = state.budget ? new Intl.NumberFormat('id-ID').format(state.budget) : '';
  const bn = anchor.toLocaleDateString('id-ID', { month: 'long' });
  if (state.budget) {
    const p = Math.min(100, mo / state.budget * 100), left = state.budget - mo;
    $('bud-info').innerHTML = `<div class="bar"><i style="width:${p}%;background:var(${mo > state.budget ? '--warn' : '--b-mint'})"></i></div>
      <div style="margin-top:6px">Terpakai bulan ${bn}: ${rp(mo)} dari ${rp(state.budget)}. ${left >= 0 ? `Sisa ${rp(left)} 🎉` : `<b style="color:var(--warn)">Melebihi anggaran ${rp(-left)}</b>`}</div>`;
  } else $('bud-info').textContent = `Isi batas per bulan untuk memantau sisa anggaran. Terpakai bulan ${bn}: ${rp(mo)}.`;

  // grafik per hari
  $('chart-card').hidden = view === 'day';
  if (view !== 'day') {
    const arr = []; const d = new Date(rs);
    while (ds(d) <= e) { arr.push(days[ds(d)] || 0); d.setDate(d.getDate() + 1); }
    const mx = Math.max(1, ...arr);
    $('chart').innerHTML = arr.map(v => `<div style="height:${v / mx * 100}%" title="${rp(v)}"></div>`).join('');
    $('c1').textContent = `${rs.getDate()} ${rs.toLocaleDateString('id-ID', { month: 'short' })}`;
    $('c2').textContent = `${re.getDate()} ${re.toLocaleDateString('id-ID', { month: 'short' })}`;
  }

  // per kategori
  const ks = Object.keys(by).sort((a, b) => by[b] - by[a]);
  $('cat').innerHTML = ks.length ? ks.map(k => {
    const p = by[k] / tout * 100, f = info('out', k);
    return `<div class="row"><span>${f.e} ${esc(k)}</span><span>${rp(by[k])} · ${Math.round(p)}%</span></div>
      <div class="bar"><i style="width:${p}%;background:var(--b-${f.t})"></i></div>`;
  }).join('') : '<div class="empty">🌤️ Belum ada pengeluaran di periode ini</div>';

  // daftar
  $('list').innerHTML = L.length ? L.map(t => {
    const f = info(t.type, t.cat);
    return `<div class="tx"><div class="ico" style="background:var(--${f.t})">${f.e}</div>
      <div class="m"><b>${esc(t.cat)}</b><small>${pd(t.d).toLocaleDateString('id-ID', { day: 'numeric', month: 'short' })}${t.note ? ' · ' + esc(t.note) : ''}</small></div>
      <span class="amt ${t.type}">${t.type === 'in' ? '+' : '-'}${rp(t.amt)}</span>
      <button onclick="edit(${t.id})">Ubah</button><button onclick="del(${t.id})">Hapus</button></div>`;
  }).join('') : '<div class="empty">🫧 Belum ada transaksi</div>';
}

/* ---------- Cadangan ---------- */
function backup() {
  const j = JSON.stringify(state); $('bk').value = j; $('bk').select();
  const ok = () => $('bk-msg').textContent = 'Cadangan disalin ke clipboard 💜';
  const no = () => $('bk-msg').textContent = 'Salin teks di atas secara manual.';
  try { navigator.clipboard.writeText(j).then(ok, no); } catch (e) { no(); }
}
function restore() {
  try {
    const o = JSON.parse($('bk').value);
    if (!o || !Array.isArray(o.tx)) throw 0;
    state = { tx: o.tx, budget: +o.budget || 0 }; save(); render();
    $('bk-msg').textContent = 'Data berhasil dipulihkan ✅';
  } catch (e) { $('bk-msg').textContent = 'Teks cadangan tidak valid.'; }
}

load(); $('f-date').value = ds(new Date()); cats(); render();
