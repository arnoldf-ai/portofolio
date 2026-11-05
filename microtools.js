const $ = id => document.getElementById(id);
const load = (k, d) => { try { const v = JSON.parse(localStorage.getItem(k)); return Array.isArray(v) ? v : d; } catch { return d; } };
const save = (k, v) => { try { localStorage.setItem(k, JSON.stringify(v)); } catch {} };

/* ---------- Tab ---------- */
const tabs = [...document.querySelectorAll('[role=tab]')];
function showTab(t) {
  tabs.forEach(x => {
    const on = x === t;
    x.setAttribute('aria-selected', on);
    x.tabIndex = on ? 0 : -1;
    $(x.getAttribute('aria-controls')).hidden = !on;
  });
}
tabs.forEach((t, i) => {
  t.addEventListener('click', () => showTab(t));
  t.addEventListener('keydown', e => {
    const d = { ArrowRight: 1, ArrowLeft: -1 }[e.key];
    if (!d) return;
    const n = tabs[(i + d + tabs.length) % tabs.length];
    showTab(n); n.focus();
  });
});

/* ---------- Daftar tugas ---------- */
let todos = load('microtools_todos', []);
const todoMsg = $('todoMsg');
function renderTodos() {
  const ul = $('todoList');
  ul.replaceChildren();
  if (!todos.length) {
    const li = document.createElement('li');
    li.textContent = 'Belum ada tugas. Tulis satu di atas.';
    ul.append(li);
    return;
  }
  todos.forEach((t, i) => {
    const li = document.createElement('li');
    li.className = t.done ? 'done' : '';
    const cb = document.createElement('input');
    cb.type = 'checkbox'; cb.checked = !!t.done;
    cb.setAttribute('aria-label', 'Selesai: ' + t.text);
    cb.onchange = () => { todos[i].done = cb.checked; save('microtools_todos', todos); renderTodos(); };
    const sp = document.createElement('span');
    sp.textContent = t.text;
    const del = document.createElement('button');
    del.className = 'small del'; del.textContent = 'Hapus';
    del.setAttribute('aria-label', 'Hapus: ' + t.text);
    del.onclick = () => { todos.splice(i, 1); save('microtools_todos', todos); renderTodos(); };
    li.append(cb, sp, del);
    ul.append(li);
  });
}
$('todoForm').addEventListener('submit', e => {
  e.preventDefault();
  const input = $('todoInput');
  const text = input.value.trim();
  if (!text) { todoMsg.textContent = 'Tulis tugas dulu.'; return; }
  todos.push({ text, done: false });
  save('microtools_todos', todos);
  input.value = ''; todoMsg.textContent = '';
  renderTodos();
});
$('todoDl').onclick = () => {
  if (!todos.length) { todoMsg.textContent = 'Belum ada tugas untuk diunduh.'; return; }
  const txt = 'DAFTAR TUGAS\n============\n' +
    todos.map((t, i) => `${i + 1}. [${t.done ? 'x' : ' '}] ${t.text}`).join('\n') + '\n';
  const url = URL.createObjectURL(new Blob([txt], { type: 'text/plain' }));
  const a = document.createElement('a');
  a.href = url; a.download = 'daftar_tugas.txt'; a.click();
  URL.revokeObjectURL(url);
  todoMsg.textContent = '';
};
renderTodos();

/* ---------- Penerjemah ---------- */
const LANGS = { id: 'Indonesia', en: 'Inggris', ja: 'Jepang', ko: 'Korea', 'zh-CN': 'Mandarin', ar: 'Arab', es: 'Spanyol', fr: 'Prancis' };
const from = $('from'), to = $('to'), trIn = $('trIn'), trOut = $('trOut'), trMsg = $('trMsg');
for (const [code, name] of Object.entries(LANGS)) {
  from.add(new Option(name, code));
  to.add(new Option(name, code));
}
from.value = 'id'; to.value = 'en';
trIn.addEventListener('input', () => { $('count').textContent = trIn.value.length + '/500'; });
$('swap').onclick = () => {
  [from.value, to.value] = [to.value, from.value];
  [trIn.value, trOut.value] = [trOut.value, trIn.value];
  trIn.dispatchEvent(new Event('input'));
};
const decode = s => { const t = document.createElement('textarea'); t.innerHTML = s; return t.value; };
$('trGo').onclick = async () => {
  const q = trIn.value.trim();
  if (!q) { trMsg.textContent = 'Tulis teks yang ingin diterjemahkan.'; return; }
  if (from.value === to.value) { trMsg.textContent = 'Bahasa asal dan tujuan sama.'; return; }
  const btn = $('trGo');
  btn.disabled = true; trOut.value = ''; trMsg.textContent = 'Menerjemahkan...';
  try {
    const url = 'https://api.mymemory.translated.net/get?q=' + encodeURIComponent(q) +
      '&langpair=' + encodeURIComponent(from.value + '|' + to.value);
    const res = await fetch(url);
    if (!res.ok) throw new Error('http');
    const data = await res.json();
    if (Number(data.responseStatus) !== 200) throw new Error('api');
    trOut.value = decode(data.responseData.translatedText);
    trMsg.textContent = '';
  } catch {
    trMsg.textContent = 'Gagal menerjemahkan. Periksa koneksi, atau batas harian layanan gratis mungkin tercapai.';
  } finally {
    btn.disabled = false;
  }
};
$('trCopy').onclick = async () => {
  if (!trOut.value) { trMsg.textContent = 'Belum ada hasil untuk disalin.'; return; }
  try { await navigator.clipboard.writeText(trOut.value); trMsg.textContent = 'Hasil tersalin.'; }
  catch { trMsg.textContent = 'Tidak bisa menyalin. Salin manual dari kotak hasil.'; }
};

/* ---------- Kalkulator ---------- */
const OPS = '+-*/';
const SHOW = { '*': '×', '/': '÷', '-': '−' };
let expr = '', fresh = false;
let hist = load('microtools_calc_history_v2', []);

function calc(s) {
  const t = s.match(/\d+\.?\d*|\.\d+|[+\-*/]/g) || [];
  if (t[0] === '-') { t.shift(); if (!t.length) return NaN; t[0] = '-' + t[0]; }
  if (!t.length || OPS.includes(t[t.length - 1])) return NaN;
  const out = [Number(t[0])];
  for (let i = 1; i < t.length; i += 2) {
    const op = t[i], n = Number(t[i + 1]);
    if (Number.isNaN(n)) return NaN;
    if (op === '*') out.push(out.pop() * n);
    else if (op === '/') out.push(out.pop() / n);
    else out.push(op, n);
  }
  let r = out[0];
  for (let i = 1; i < out.length; i += 2) r = out[i] === '+' ? r + out[i + 1] : r - out[i + 1];
  return r;
}
const pretty = s => s.replace(/[*\/-]/g, c => SHOW[c]);
function draw(text) { $('disp').textContent = text ?? (pretty(expr) || '0'); }
function renderHist() {
  const ol = $('hist');
  ol.replaceChildren();
  hist.forEach(h => { const li = document.createElement('li'); li.textContent = `${pretty(h.e)} = ${h.r}`; ol.append(li); });
}
function press(k) {
  const last = expr.slice(-1);
  if (k === 'clear') { expr = ''; fresh = false; return draw(); }
  if (k === 'back') { expr = expr.slice(0, -1); fresh = false; return draw(); }
  if (k === '=') {
    if (!expr) return;
    const r = calc(expr);
    if (Number.isNaN(r)) { expr = ''; return draw('Format salah'); }
    if (!Number.isFinite(r)) { expr = ''; return draw('Tidak bisa dibagi nol'); }
    const res = String(Number(r.toFixed(10)));
    hist.unshift({ e: expr, r: res });
    hist = hist.slice(0, 10);
    save('microtools_calc_history_v2', hist);
    renderHist();
    expr = /e/i.test(res) ? '' : res;
    fresh = true;
    return draw(res);
  }
  if (OPS.includes(k)) {
    if (!expr) { if (k !== '-') return; }
    else if (OPS.includes(last)) expr = expr.slice(0, -1);
    fresh = false; expr += k; return draw();
  }
  if (fresh) { expr = ''; fresh = false; }
  if (k === '.') {
    const cur = expr.split(/[+\-*/]/).pop();
    if (cur.includes('.')) return;
    if (!cur) expr += '0';
  }
  if (expr.length >= 30) return;
  expr += k; draw();
}
$('keys').addEventListener('click', e => { const b = e.target.closest('[data-k]'); if (b) press(b.dataset.k); });
document.addEventListener('keydown', e => {
  if ($('p-calc').hidden) return;
  const tag = e.target.tagName;
  if (/INPUT|TEXTAREA|SELECT/.test(tag)) return;
  if (tag === 'BUTTON' && (e.key === 'Enter' || e.key === ' ')) return;
  if (/^[0-9.+\-*/]$/.test(e.key)) press(e.key);
  else if (e.key === 'Enter' || e.key === '=') { e.preventDefault(); press('='); }
  else if (e.key === 'Backspace') press('back');
  else if (e.key === 'Escape') press('clear');
});
$('histClear').onclick = () => { hist = []; save('microtools_calc_history_v2', hist); renderHist(); };
renderHist();
