const root = document.documentElement;
const themeBtn = document.getElementById('theme');
const menuBtn = document.getElementById('menu');
const nav = document.querySelector('nav');

function setTheme(mode) {
  root.dataset.theme = mode;
  themeBtn.textContent = mode === 'light' ? '🌙' : '☀️';
  themeBtn.setAttribute('aria-label', mode === 'light' ? 'Ganti ke mode gelap' : 'Ganti ke mode terang');
  try { localStorage.setItem('theme', mode); } catch {}
}
setTheme(root.dataset.theme || 'dark');
themeBtn.onclick = () => setTheme(root.dataset.theme === 'light' ? 'dark' : 'light');

menuBtn.onclick = () => {
  const open = nav.classList.toggle('open');
  menuBtn.setAttribute('aria-expanded', open);
};
