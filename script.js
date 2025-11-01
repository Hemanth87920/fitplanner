/* script.js — FitPlanner Frontend
   - BMI calculation + animated result
   - Daily calorie tracker with LocalStorage
   - Exercise recommendation cards
   - Canvas chart for weight progress (no external libs)
   - Motivational quotes with auto-rotate
   - Smooth scroll, responsive nav, and small UI animations
*/

/* ----------------- Helpers ----------------- */
const $ = (sel) => document.querySelector(sel);
const $$ = (sel) => Array.from(document.querySelectorAll(sel));
const todayKey = () => `meals_${new Date().toISOString().slice(0,10)}`;

// Smooth scroll for internal links
document.querySelectorAll('a[href^="#"]').forEach(a => {
  a.addEventListener('click', (e) => {
    e.preventDefault();
    const id = a.getAttribute('href');
    if (id === '#') return;
    const target = document.querySelector(id);
    if (target) target.scrollIntoView({ behavior: 'smooth', block: 'start' });

    // close mobile nav if open
    const nav = $('#nav-links');
    if (window.innerWidth <= 980 && nav.style.display === 'flex') nav.style.display = 'none';
  });
});

/* ----------------- Mobile Nav Toggle ----------------- */
const hamburger = $('#hamburger');
hamburger.addEventListener('click', () => {
  const nav = $('#nav-links');
  nav.style.display = (nav.style.display === 'flex') ? 'none' : 'flex';
  if (nav.style.display === 'flex') nav.style.flexDirection = 'column';
});

/* reveal on scroll */
const revealOnScroll = () => {
  document.querySelectorAll('.section-anim').forEach(el => {
    const rect = el.getBoundingClientRect();
    if (rect.top < window.innerHeight - 80) el.classList.add('visible');
  });
};
window.addEventListener('scroll', revealOnScroll);
window.addEventListener('load', () => {
  revealOnScroll();
  $('#year').innerText = new Date().getFullYear();
  // minor entry animations
  document.querySelectorAll('.card-ex, .btn').forEach((el, i) => {
    el.animate([{ opacity: 0, transform: 'translateY(8px)' }, { opacity: 1, transform: 'translateY(0)' }], { duration: 600, delay: 80 * i, fill: 'forwards' });
  });
});

/* ----------------- BMI Calculator ----------------- */
function calcBMI() {
  const w = parseFloat($('#weight').value);
  const hcm = parseFloat($('#height').value);
  if (!w || !hcm || w <= 0 || hcm <= 0) {
    $('#bmiValue').innerText = '—';
    $('#bmiCat').innerText = 'Please enter valid values';
    return;
  }
  const h = hcm / 100;
  const bmi = +(w / (h * h)).toFixed(1);
  $('#bmiValue').innerText = bmi;
  let cat = '';
  if (bmi < 18.5) cat = 'Underweight';
  else if (bmi < 25) cat = 'Normal weight';
  else if (bmi < 30) cat = 'Overweight';
  else cat = 'Obesity';
  $('#bmiCat').innerText = `${cat}`;

  // Animated pop
  const valueEl = $('#bmiValue');
  valueEl.animate([{ transform: 'scale(0.92)' }, { transform: 'scale(1.06)' }, { transform: 'scale(1)' }], { duration: 520, easing: 'cubic-bezier(.2,.7,0,1)' });
}
$('#calcBMI').addEventListener('click', calcBMI);

/* ----------------- Calories Tracker (LocalStorage) ----------------- */
function loadMeals() {
  return JSON.parse(localStorage.getItem(todayKey()) || '[]');
}
function saveMeals(arr) {
  localStorage.setItem(todayKey(), JSON.stringify(arr));
}

// Render meals list and update progress
function renderMeals() {
  const meals = loadMeals();
  const list = $('#mealList'); list.innerHTML = '';
  let total = 0;
  meals.forEach((m, idx) => {
    total += m.cals;
    const li = document.createElement('li');
    li.innerHTML = `
      <div>
        <strong>${escapeHtml(m.name)}</strong>
        <div class="muted small">${m.time}</div>
      </div>
      <div>
        <span class="muted">${m.cals} kcal</span>
        <button class="btn ghost small remove-meal" data-idx="${idx}" aria-label="Remove meal">✖</button>
      </div>`;
    list.appendChild(li);
  });
  // Animate consumed number
  animateCount($('#consumed'), parseInt($('#consumed').innerText || 0, 10), total, 500);
  const goal = Number($('#dailyGoal').innerText || 2000);
  const pct = Math.min(100, Math.round((total / goal) * 100));
  $('#progressFill').style.width = pct + '%';
}

// simple sanitizer for names
function escapeHtml(s) {
  return String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
}

// Add meal
$('#addMeal').addEventListener('click', () => {
  const name = $('#mealName').value.trim();
  const cals = parseInt($('#mealCals').value, 10);
  if (!name || !cals || cals <= 0) return alert('Enter meal name and calories');
  const meals = loadMeals();
  meals.unshift({ name, cals, time: new Date().toLocaleTimeString() });
  saveMeals(meals);
  $('#mealName').value = ''; $('#mealCals').value = '';
  renderMeals();
});

// Remove meal (delegate)
$('#mealList').addEventListener('click', (e) => {
  const btn = e.target.closest('.remove-meal');
  if (!btn) return;
  const idx = Number(btn.dataset.idx);
  const meals = loadMeals();
  meals.splice(idx, 1);
  saveMeals(meals);
  renderMeals();
});

/* Edit daily goal inline */
$('#dailyGoal').addEventListener('click', (e) => {
  const cur = $('#dailyGoal').innerText;
  const input = document.createElement('input');
  input.value = cur; input.style.width = '90px';
  $('#dailyGoal').innerText = '';
  $('#dailyGoal').appendChild(input);
  input.focus();
  input.select();
  input.addEventListener('keydown', (ev) => {
    if (ev.key === 'Enter') {
      const v = Number(input.value) || 2000;
      $('#dailyGoal').innerText = v;
      localStorage.setItem('dailyGoal', v);
      renderMeals();
    }
    if (ev.key === 'Escape') {
      $('#dailyGoal').innerText = cur;
    }
  });
});

/* Persist dailyGoal from localStorage */
(function () {
  const savedGoal = localStorage.getItem('dailyGoal');
  if (savedGoal) $('#dailyGoal').innerText = savedGoal;
  const observer = new MutationObserver(() => { localStorage.setItem('dailyGoal', $('#dailyGoal').innerText); });
  observer.observe($('#dailyGoal'), { childList: true, characterData: true, subtree: true });
})();

/* Init meals render */
renderMeals();

/* ----------------- Exercise recommendations ----------------- */
const exercises = [
  { title: 'Full Body Strength', desc: 'Compound lifts, 3 sets x 8–10. Focus: strength & hypertrophy.', icon: '🏋️' },
  { title: 'Cardio Blast', desc: '20–30 min HIIT or steady-state cardio for endurance and burn.', icon: '🏃' },
  { title: 'Core & Mobility', desc: 'Planks, leg raises, dynamic stretches — mobility focus.', icon: '🤸' },
  { title: 'Upper Body Push', desc: 'Push-ups, presses, shoulder work. Progressive overload.', icon: '💪' },
  { title: 'Lower Body Power', desc: 'Squats, lunges, deadlifts — build leg strength.', icon: '🦵' },
];
const exWrap = $('#exerciseCards');
exercises.forEach((e, i) => {
  const c = document.createElement('div'); c.className = 'card-ex';
  c.innerHTML = `<div class="icon-circle">${e.icon}</div><h3>${e.title}</h3><p>${e.desc}</p>`;
  // mobile tap to toggle
  c.addEventListener('click', () => {
    c.classList.toggle('expanded');
    c.animate([{ transform: 'scale(1)' }, { transform: 'scale(1.03)' }, { transform: 'scale(1)' }], { duration: 300 });
  });
  exWrap.appendChild(c);
});

/* ----------------- Progress Chart (Canvas) ----------------- */
const chartCanvas = document.getElementById('progressChart');
const ctx = chartCanvas.getContext('2d');

function loadWeights() {
  return JSON.parse(localStorage.getItem('weights') || '[]');
}
function saveWeights(arr) { localStorage.setItem('weights', JSON.stringify(arr)); }

function addWeightEntry(v) {
  if (!v || v <= 0) return;
  const arr = loadWeights();
  arr.push({ date: new Date().toISOString(), weight: +v });
  while (arr.length > 14) arr.shift();
  saveWeights(arr);
  renderChart();
}

$('#addWeight').addEventListener('click', () => {
  const v = Number($('#weightEntry').value);
  if (!v || v <= 0) return alert('Enter a weight value');
  addWeightEntry(v);
  $('#weightEntry').value = '';
});

$('#clearWeights').addEventListener('click', () => {
  if (!confirm('Clear all saved weight entries?')) return;
  localStorage.removeItem('weights');
  renderChart();
});

// Draw chart, DPR aware
function renderChart() {
  const dpr = window.devicePixelRatio || 1;
  const rect = chartCanvas.getBoundingClientRect();

  // set pixel-perfect canvas
  chartCanvas.width = Math.round(rect.width * dpr);
  chartCanvas.height = Math.round(rect.height * dpr);
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0); // reset transform to DPR scale

  // logical width/height
  const W = rect.width;
  const H = rect.height;
  ctx.clearRect(0, 0, W, H);

  const data = loadWeights();
  if (!data.length) {
    ctx.fillStyle = 'rgba(200,255,220,0.9)';
    ctx.font = '14px system-ui, sans-serif';
    ctx.fillText('No entries yet — add weight to see progress', 16, 36);
    return;
  }

  // margins
  const pad = 42;
  const left = pad, top = pad, right = pad, bottom = 42;
  const w = W - left - right;
  const h = H - top - bottom;

  // values
  const vals = data.map(d => d.weight);
  const max = Math.max(...vals) + 1;
  const min = Math.min(...vals) - 1;
  const range = Math.max(1, max - min);

  // draw grid
  ctx.strokeStyle = 'rgba(255,255,255,0.06)';
  ctx.lineWidth = 1;
  ctx.beginPath();
  for (let i = 0; i <= 4; i++) {
    const y = top + (h / 4) * i;
    ctx.moveTo(left, y); ctx.lineTo(left + w, y);
  }
  ctx.stroke();

  // draw area gradient and line
  const points = data.map((pt, i) => {
    const x = left + (w / Math.max(1, data.length - 1)) * i;
    const y = top + h - ((pt.weight - min) / range) * h;
    return { x, y, label: pt.date };
  });

  // area fill
  ctx.beginPath();
  ctx.moveTo(points[0].x, top + h);
  points.forEach(p => ctx.lineTo(p.x, p.y));
  ctx.lineTo(points[points.length - 1].x, top + h);
  ctx.closePath();
  const grad = ctx.createLinearGradient(0, top, 0, top + h);
  grad.addColorStop(0, 'rgba(24,210,110,0.18)');
  grad.addColorStop(1, 'rgba(24,210,110,0.02)');
  ctx.fillStyle = grad;
  ctx.fill();

  // line
  ctx.beginPath();
  ctx.lineWidth = 2.6;
  ctx.strokeStyle = '#18d26e';
  points.forEach((p, i) => {
    if (i === 0) ctx.moveTo(p.x, p.y); else ctx.lineTo(p.x, p.y);
  });
  ctx.stroke();

  // points
  points.forEach(p => {
    ctx.beginPath();
    ctx.fillStyle = '#fff';
    ctx.arc(p.x, p.y, 3.6, 0, Math.PI * 2);
    ctx.fill();
  });

  // labels
  ctx.fillStyle = '#dfffe8';
  ctx.font = '13px system-ui, sans-serif';
  points.forEach((p, i) => {
    const txt = new Date(p.label).toISOString().slice(5, 10); // MM-DD
    ctx.fillText(txt, p.x - 18, top + h + 18);
  });

  // latest text
  const latest = data[data.length - 1].weight;
  ctx.fillStyle = '#fff';
  ctx.font = '16px system-ui, sans-serif';
  ctx.fillText(`Latest: ${latest} kg`, left, 22);
}

// re-render on resize (debounced)
let _resizeTimer = null;
window.addEventListener('resize', () => {
  clearTimeout(_resizeTimer);
  _resizeTimer = setTimeout(renderChart, 180);
});
renderChart();

/* ----------------- Motivational Quotes ----------------- */
const quotes = [
  { q: "The only bad workout is the one that didn’t happen.", a: "Unknown" },
  { q: "Sweat is just fat crying.", a: "Unknown" },
  { q: "Don’t limit your challenges — challenge your limits.", a: "Jerry Dunn" },
  { q: "You are one workout away from a good mood.", a: "Unknown" },
  { q: "Discipline is doing what needs to be done even if you don’t want to.", a: "Unknown" },
  { q: "Progress, not perfection.", a: "Unknown" }
];
let quoteIndex = 0;
function showQuote(i) {
  quoteIndex = (i + quotes.length) % quotes.length;
  const box = $('#quoteBox');
  const txt = $('#quoteText'), auth = $('#quoteAuthor');
  // fade animation
  box.animate([{ opacity: 0.2 }, { opacity: 1 }], { duration: 520, easing: 'ease-in-out' });
  txt.innerText = `"${quotes[quoteIndex].q}"`;
  auth.innerText = `— ${quotes[quoteIndex].a}`;
}
$('#newQuote').addEventListener('click', () => showQuote(Math.floor(Math.random() * quotes.length)));
$('#nextQuote').addEventListener('click', () => showQuote(quoteIndex + 1));
$('#prevQuote').addEventListener('click', () => showQuote(quoteIndex - 1));
setInterval(() => showQuote(quoteIndex + 1), 9000);
showQuote(0);

/* ----------------- Small Utilities ----------------- */

// simple count animation
function animateCount(el, start, end, duration = 700) {
  const startTime = performance.now();
  function tick(now) {
    const t = Math.min(1, (now - startTime) / duration);
    const val = Math.round(start + (end - start) * t);
    el.innerText = val;
    if (t < 1) requestAnimationFrame(tick);
  }
  requestAnimationFrame(tick);
}
animateCount($('#consumed'), 0, Number($('#consumed').innerText || 0));

// ensure chart updates when weights change (observe localStorage)
window.addEventListener('storage', (e) => {
  if (e.key === 'weights' || e.key === null) renderChart();
});

// Basic keyboard accessibility: Enter to calculate BMI when in inputs
['#weight', '#height'].forEach(sel => {
  const el = document.querySelector(sel);
  if (!el) return;
  el.addEventListener('keydown', (ev) => {
    if (ev.key === 'Enter') calcBMI();
  });
});
