import './style.css';

const canvas = document.querySelector('#sea');
const ctx = canvas.getContext('2d');
const $ = (selector) => document.querySelector(selector);
const ui = {
  area: $('#area-name'), level: $('#level-label'), hud: $('#hud'), score: $('#score'), target: $('#target-score'),
  progress: $('#score-progress'), timer: $('#timer'), intro: $('#intro'), pause: $('#pause-screen'), result: $('#result-screen'),
  netName: $('#net-name'), netIndicator: $('#net-indicator'), toast: $('#toast'), finalScore: $('#final-score'),
  resultTitle: $('#result-title'), resultCopy: $('#result-copy'), resultEmoji: $('#result-emoji'), resultEyebrow: $('#result-eyebrow'),
  stars: $('#stars'), next: $('#next-button'), retry: $('#retry-button'),
};

const nets = [
  { name: '轻巧小网', power: 1, radius: 34, speed: 1000, color: '#54bca7', label: '小网' },
  { name: '珊瑚中网', power: 3, radius: 61, speed: 1450, color: '#e9b75c', label: '中网' },
  { name: '深海大网', power: 6, radius: 94, speed: 2050, color: '#ee8c68', label: '大网' },
];
const fishTypes = [
  { id: 'sardine', name: '沙丁鱼', emoji: '🐟', size: 20, resistance: 1, points: 25, speed: 48, pattern: 'school', color: '#75c6c6' },
  { id: 'clown', name: '小丑鱼', emoji: '🐠', size: 23, resistance: 2, points: 40, speed: 42, pattern: 'dart', color: '#f49665' },
  { id: 'butterfly', name: '蝶鱼', emoji: '🐟', size: 28, resistance: 3, points: 60, speed: 37, pattern: 'weave', color: '#f2cb62' },
  { id: 'puffer', name: '河豚', emoji: '🐡', size: 31, resistance: 4, points: 85, speed: 25, pattern: 'drift', color: '#f1b861' },
  { id: 'lionfish', name: '狮子鱼', emoji: '🐠', size: 35, resistance: 5, points: 110, speed: 32, pattern: 'weave', color: '#e98968' },
  { id: 'snapper', name: '红鲷鱼', emoji: '🐟', size: 39, resistance: 6, points: 140, speed: 39, pattern: 'dart', color: '#ef896e' },
  { id: 'ray', name: '魔鬼鱼', emoji: '🦈', size: 50, resistance: 8, points: 210, speed: 34, pattern: 'glide', color: '#938ec4' },
  { id: 'tuna', name: '蓝鳍金枪鱼', emoji: '🐟', size: 55, resistance: 10, points: 280, speed: 56, pattern: 'dash', color: '#568fc0' },
  { id: 'shark', name: '柠檬鲨', emoji: '🦈', size: 63, resistance: 12, points: 360, speed: 43, pattern: 'glide', color: '#7d9db6' },
];
const levels = [
  { area: '珊瑚浅湾', target: 450, time: 90, pool: [0, 1, 2, 3, 4], quota: 14 },
  { area: '海草牧场', target: 780, time: 95, pool: [0, 1, 2, 3, 4, 5], quota: 16 },
  { area: '珍珠潟湖', target: 1050, time: 100, pool: [0, 1, 2, 3, 4, 5, 6], quota: 18 },
  { area: '泡泡珊瑚礁', target: 1250, time: 105, pool: [1, 2, 3, 4, 5, 6], quota: 19 },
  { area: '海星花园', target: 1500, time: 110, pool: [1, 2, 3, 4, 5, 6, 7], quota: 21 },
  { area: '蓝洞回廊', target: 1850, time: 115, pool: [2, 3, 4, 5, 6, 7], quota: 22 },
  { area: '月光海沟', target: 2100, time: 120, pool: [2, 3, 4, 5, 6, 7, 8], quota: 23 },
  { area: '鲸歌深海', target: 2450, time: 125, pool: [3, 4, 5, 6, 7, 8], quota: 24 },
  { area: '星砂秘境', target: 2800, time: 130, pool: [3, 4, 5, 6, 7, 8], quota: 25 },
];
const saveKey = 'ocean-catch-progress-v1';
let saved = readSave();
let unlocked = saved.unlocked;
let best = saved.best;
let levelIndex = saved.unlocked;
let score = 0;
let timeLeft = 0;
let state = 'ready';
let netIndex = 0;
let fish = [];
let shots = [];
let netsOnWater = [];
let sparkles = [];
let bubbles = [];
let lastShotAt = 0;
let lastSpawnAt = 0;
let lastFrame = 0;
let elapsed = 0;
let pointer = { x: 0, y: 0, inside: false };
let toastTimer = 0;
let muted = false;
let audioContext;
let width = 0;
let height = 0;
let dpr = 1;

function readSave() {
  try {
    const value = JSON.parse(localStorage.getItem(saveKey) || '{}');
    return { unlocked: Math.max(0, Math.min(levels.length - 1, Number(value.unlocked) || 0)), best: Math.max(0, Number(value.best) || 0) };
  } catch { return { unlocked: 0, best: 0 }; }
}
function saveProgress() {
  try { localStorage.setItem(saveKey, JSON.stringify({ unlocked, best })); } catch { showToast('浏览器未能保存进度'); }
}
function resize() {
  const rect = canvas.getBoundingClientRect();
  width = rect.width; height = rect.height; dpr = Math.min(window.devicePixelRatio || 1, 2);
  canvas.width = Math.round(width * dpr); canvas.height = Math.round(height * dpr);
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  if (!pointer.inside) pointer = { x: width / 2, y: height / 2, inside: false };
}
window.addEventListener('resize', resize);
resize();

function random(min, max) { return min + Math.random() * (max - min); }
function clamp(value, min, max) { return Math.max(min, Math.min(max, value)); }
function formatTime(seconds) { const safe = Math.max(0, Math.ceil(seconds)); return `${String(Math.floor(safe / 60)).padStart(2, '0')}:${String(safe % 60).padStart(2, '0')}`; }
function level() { return levels[levelIndex]; }
function boatOrigin() { return { x: width / 2, y: height - (height < 650 ? 75 : 94) }; }
function showToast(message) {
  ui.toast.textContent = message; ui.toast.classList.add('visible'); clearTimeout(toastTimer);
  toastTimer = setTimeout(() => ui.toast.classList.remove('visible'), 1150);
}
function updateHud() {
  ui.area.textContent = level().area;
  ui.level.textContent = `${String(levelIndex + 1).padStart(2, '0')} / ${String(levels.length).padStart(2, '0')}`;
  ui.score.textContent = score.toLocaleString('zh-CN'); ui.target.textContent = level().target.toLocaleString('zh-CN');
  ui.progress.style.width = `${Math.min(100, score / level().target * 100)}%`;
  ui.timer.textContent = formatTime(timeLeft); ui.timer.parentElement.classList.toggle('urgent', timeLeft <= 15);
  ui.netName.textContent = nets[netIndex].name;
}
function startLevel(index = levelIndex) {
  levelIndex = clamp(index, 0, unlocked);
  score = 0; timeLeft = levels[levelIndex].time; state = 'playing'; elapsed = 0;
  fish = []; shots = []; netsOnWater = []; sparkles = []; lastShotAt = 0; lastSpawnAt = 0;
  ui.intro.classList.add('hidden'); ui.pause.classList.add('hidden'); ui.result.classList.add('hidden'); ui.hud.classList.remove('hidden');
  updateHud(); spawnInitialFish();
}
function spawnInitialFish() {
  const count = Math.min(13, level().quota);
  for (let i = 0; i < count; i++) spawnFish(random(0, width), random(180, Math.max(220, height - 170)), Math.random() < .5 ? -1 : 1);
}
function spawnFish(x = Math.random() < .5 ? -60 : width + 60, y = random(145, height - 140), direction, forcedType) {
  const pool = level().pool;
  const typeIndex = forcedType ?? pool[Math.floor(Math.random() * pool.length)];
  const type = fishTypes[typeIndex];
  const dir = direction ?? (x < 0 ? 1 : -1);
  fish.push({ typeIndex, x, y: clamp(y, 132, height - 130), dir, baseY: y, phase: random(0, Math.PI * 2), speed: type.speed * random(.74, 1.24), progress: 0, alive: true, scale: random(.9, 1.12), flash: 0, drift: random(-.25, .25) });
}
function setNet(nextIndex) {
  netIndex = (nextIndex + nets.length) % nets.length;
  updateHud(); ui.netIndicator.classList.remove('pulse'); void ui.netIndicator.offsetWidth; ui.netIndicator.classList.add('pulse');
  showToast(`${nets[netIndex].name}已就绪`);
  window.setTimeout(() => ui.netIndicator.classList.remove('pulse'), 190);
}
function shoot(x, y) {
  if (state !== 'playing') return;
  const now = performance.now(); const net = nets[netIndex];
  if (now - lastShotAt < net.speed) return;
  lastShotAt = now;
  const origin = boatOrigin(); const dx = x - origin.x; const dy = y - origin.y;
  const distance = Math.hypot(dx, dy); const flight = clamp(distance / 670, .16, .6);
  shots.push({ x: origin.x, y: origin.y, tx: x, ty: y, life: 0, duration: flight, color: net.color, netIndex });
  playSound('shoot');
}
function impact(shot) {
  const net = nets[shot.netIndex];
  netsOnWater.push({ x: shot.tx, y: shot.ty, radius: 3, targetRadius: net.radius, life: 0, duration: .6, color: net.color, power: net.power });
  let caught = 0;
  for (const f of fish) {
    if (!f.alive) continue;
    const type = fishTypes[f.typeIndex]; const distance = Math.hypot(f.x - shot.tx, f.y - shot.ty);
    if (distance > net.radius + type.size * .45) continue;
    f.progress = Math.min(type.resistance, f.progress + net.power); f.flash = .23; caught++;
    if (f.progress >= type.resistance) {
      f.alive = false; score += type.points; burst(f.x, f.y, net.color, 12 + Math.round(type.size / 8));
      playSound('catch');
    } else {
      burst(f.x, f.y, '#fff5c8', 4);
    }
  }
  if (caught) {
    const caughtNames = caught > 1 ? `网住 ${caught} 条鱼` : '命中鱼群';
    showToast(`${caughtNames} · +${score - Number(ui.score.textContent.replaceAll(',', '') || 0)} 分`);
    updateHud();
    if (score >= level().target) finishLevel(true);
  } else {
    playSound('splash');
  }
}
function burst(x, y, color, count) {
  for (let i = 0; i < count; i++) {
    const angle = Math.random() * Math.PI * 2; const speed = random(22, 110);
    sparkles.push({ x, y, vx: Math.cos(angle) * speed, vy: Math.sin(angle) * speed, life: random(.25, .65), maxLife: .65, size: random(2, 5), color });
  }
}
function finishLevel(won) {
  if (state !== 'playing') return;
  state = won ? 'won' : 'lost'; ui.hud.classList.add('hidden'); ui.result.classList.remove('hidden');
  ui.finalScore.textContent = score.toLocaleString('zh-CN');
  if (won) {
    const stars = timeLeft > level().time * .45 ? 3 : timeLeft > level().time * .18 ? 2 : 1;
    unlocked = Math.max(unlocked, Math.min(levels.length - 1, levelIndex + 1));
    best = Math.max(best, score); saveProgress();
    ui.resultEmoji.textContent = '✦'; ui.resultEyebrow.textContent = 'SEA TREASURE FOUND';
    ui.resultTitle.textContent = levelIndex === levels.length - 1 ? '渔场大丰收！' : '满载而归！';
    ui.resultCopy.textContent = levelIndex === levels.length - 1 ? '你已经探索完全部海域。' : `${level().area}的鱼儿们都记住你啦。`;
    ui.stars.textContent = `${'★ '.repeat(stars)}${'☆ '.repeat(3 - stars)}`.trim();
    ui.next.classList.toggle('hidden', levelIndex >= levels.length - 1);
    ui.retry.classList.add('hidden');
  } else {
    best = Math.max(best, score); saveProgress();
    ui.resultEmoji.textContent = '◌'; ui.resultEyebrow.textContent = 'TIME TO CATCH YOUR BREATH';
    ui.resultTitle.textContent = '潮水退啦'; ui.resultCopy.textContent = '差一点点就能完成目标，再试一次吧。';
    ui.stars.textContent = '☆☆☆'; ui.next.classList.add('hidden'); ui.retry.classList.remove('hidden');
  }
  playSound(won ? 'win' : 'lose');
}
function pauseGame() { if (state !== 'playing') return; state = 'paused'; ui.pause.classList.remove('hidden'); }
function resumeGame() { if (state !== 'paused') return; state = 'playing'; ui.pause.classList.add('hidden'); lastFrame = performance.now(); }
function goHome() {
  state = 'ready'; ui.hud.classList.add('hidden'); ui.pause.classList.add('hidden'); ui.result.classList.add('hidden'); ui.intro.classList.remove('hidden');
  levelIndex = unlocked; updateHud();
}
function playSound(kind) {
  if (muted) return;
  try {
    audioContext ||= new window.AudioContext();
    if (audioContext.state === 'suspended') audioContext.resume();
    const oscillator = audioContext.createOscillator(); const gain = audioContext.createGain();
    const now = audioContext.currentTime;
    const presets = { shoot: [520, 360, .07, 'sine'], catch: [660, 880, .16, 'sine'], splash: [260, 190, .12, 'triangle'], win: [560, 960, .32, 'sine'], lose: [300, 180, .25, 'triangle'] };
    const [from, to, duration, wave] = presets[kind]; oscillator.type = wave; oscillator.frequency.setValueAtTime(from, now); oscillator.frequency.exponentialRampToValueAtTime(to, now + duration);
    gain.gain.setValueAtTime(.0001, now); gain.gain.exponentialRampToValueAtTime(kind === 'catch' ? .055 : .026, now + .018); gain.gain.exponentialRampToValueAtTime(.0001, now + duration);
    oscillator.connect(gain); gain.connect(audioContext.destination); oscillator.start(now); oscillator.stop(now + duration + .02);
  } catch { /* Audio is an optional enhancement. */ }
}

function roundedRect(x, y, w, h, r) {
  ctx.beginPath(); ctx.roundRect(x, y, w, h, r);
}
function drawBackground(time) {
  const sky = ctx.createLinearGradient(0, 0, 0, height);
  sky.addColorStop(0, '#a8eaf0'); sky.addColorStop(.38, '#7edbe2'); sky.addColorStop(.72, '#51c2cf'); sky.addColorStop(1, '#36aab9');
  ctx.fillStyle = sky; ctx.fillRect(0, 0, width, height);
  const light = ctx.createRadialGradient(width * .53, height * .04, 2, width * .53, height * .04, height * .78);
  light.addColorStop(0, 'rgba(255,250,211,.44)'); light.addColorStop(1, 'rgba(255,250,211,0)'); ctx.fillStyle = light; ctx.fillRect(0, 0, width, height);
  ctx.save(); ctx.globalAlpha = .16; ctx.strokeStyle = '#f6fff0'; ctx.lineWidth = 2;
  for (let i = 0; i < 9; i++) {
    const x = ((i * 171 + time * (8 + i)) % (width + 240)) - 120;
    ctx.beginPath(); ctx.moveTo(x, 80); ctx.bezierCurveTo(x + 50, height * .3, x - 75, height * .66, x + 20, height + 20); ctx.stroke();
  }
  ctx.restore();
  ctx.fillStyle = 'rgba(18,125,140,.08)'; ctx.beginPath(); ctx.ellipse(width * .5, height + 20, width * .62, 96, 0, Math.PI, 0); ctx.fill();
  drawCoral(time); drawBubbles(time);
}
function drawCoral(time) {
  const floor = height - 18;
  for (let group = 0; group < Math.ceil(width / 170) + 1; group++) {
    const x = group * 170 - ((time * 4) % 170); const sway = Math.sin(time * .9 + group) * 3;
    const colors = ['#78c69f', '#efa477', '#efc66e'];
    ctx.save(); ctx.translate(x, floor); ctx.lineCap = 'round';
    for (let i = 0; i < 4; i++) {
      const h = 24 + ((group * 7 + i * 13) % 26); const bx = (i - 1.5) * 17;
      ctx.strokeStyle = colors[(group + i) % colors.length]; ctx.lineWidth = 6 + (i % 2) * 2;
      ctx.beginPath(); ctx.moveTo(bx, 4); ctx.quadraticCurveTo(bx + sway, -h * .55, bx + sway * 1.5, -h); ctx.stroke();
      ctx.fillStyle = colors[(group + i) % colors.length]; ctx.beginPath(); ctx.arc(bx + sway * 1.5, -h, 4.3, 0, Math.PI * 2); ctx.fill();
    }
    ctx.fillStyle = group % 2 ? '#d7bd7c' : '#ead39a'; ctx.beginPath(); ctx.ellipse(16, -2, 24, 5, 0, 0, Math.PI * 2); ctx.fill(); ctx.restore();
  }
}
function drawBubbles(time) {
  for (const bubble of bubbles) {
    bubble.y -= bubble.speed * .016; bubble.phase += .02;
    ctx.globalAlpha = bubble.alpha; ctx.strokeStyle = '#e7ffff'; ctx.lineWidth = 1.4;
    ctx.beginPath(); ctx.arc(bubble.x + Math.sin(bubble.phase) * 5, bubble.y, bubble.r, 0, Math.PI * 2); ctx.stroke();
    ctx.globalAlpha = .4 * bubble.alpha; ctx.fillStyle = '#efffff'; ctx.beginPath(); ctx.arc(bubble.x - bubble.r * .27, bubble.y - bubble.r * .28, Math.max(1, bubble.r * .18), 0, Math.PI * 2); ctx.fill();
    ctx.globalAlpha = 1;
    if (bubble.y < -12) { bubble.y = height + random(10, 80); bubble.x = random(0, width); }
  }
}
function drawFish(f, time) {
  const type = fishTypes[f.typeIndex]; const size = type.size * f.scale;
  const bob = Math.sin(time * (f.typeIndex < 3 ? 2.1 : 1.45) + f.phase) * (f.typeIndex > 5 ? 7 : 4);
  let x = f.x; let y = f.y + bob;
  if (f.typeIndex === 2 || f.typeIndex === 4) y += Math.sin(time * 1.5 + f.phase) * 12;
  ctx.save(); ctx.translate(x, y); ctx.scale(f.dir, 1);
  if (f.flash > 0) ctx.globalAlpha = .58 + Math.sin(time * 45) * .2;
  const c = type.color;
  if (f.typeIndex === 6) {
    ctx.fillStyle = c; ctx.beginPath(); ctx.moveTo(-size * .85, 0); ctx.quadraticCurveTo(-size * .38, -size * .73, size * .3, -size * .48); ctx.quadraticCurveTo(size * .8, -.1, size * .92, 0); ctx.quadraticCurveTo(size * .8, .1, size * .3, size * .48); ctx.quadraticCurveTo(-size * .38, size * .73, -size * .85, 0); ctx.fill();
    ctx.beginPath(); ctx.moveTo(-size * .7, 0); ctx.lineTo(-size * 1.12, -size * .28); ctx.lineTo(-size * .98, 0); ctx.lineTo(-size * 1.12, size * .28); ctx.closePath(); ctx.fill();
    ctx.fillStyle = '#fff2cf'; ctx.beginPath(); ctx.arc(size * .35, -size * .1, 2.4, 0, Math.PI * 2); ctx.fill();
  } else if (f.typeIndex === 8) {
    ctx.fillStyle = c; ctx.beginPath(); ctx.moveTo(-size * .76, 0); ctx.quadraticCurveTo(-size * .37, -size * .62, size * .49, -size * .35); ctx.quadraticCurveTo(size * .94, -.14, size * .98, 0); ctx.quadraticCurveTo(size * .94, .14, size * .49, size * .35); ctx.quadraticCurveTo(-size * .37, size * .62, -size * .76, 0); ctx.fill();
    ctx.beginPath(); ctx.moveTo(-size * .55, -size * .08); ctx.lineTo(-size * 1.06, -size * .62); ctx.lineTo(-size * .89, 0); ctx.lineTo(-size * 1.06, size * .62); ctx.closePath(); ctx.fill();
    ctx.fillStyle = 'rgba(255,244,216,.64)'; ctx.beginPath(); ctx.moveTo(-size * .3, 0); ctx.quadraticCurveTo(-size * .43, size * .26, -size * .02, size * .49); ctx.quadraticCurveTo(size * .32, size * .29, size * .45, 0); ctx.fill();
  } else {
    ctx.fillStyle = c; ctx.beginPath(); ctx.ellipse(0, 0, size * .82, size * .48, 0, 0, Math.PI * 2); ctx.fill();
    const tailWag = Math.sin(time * 9 + f.phase) * size * .1;
    ctx.beginPath(); ctx.moveTo(-size * .66, 0); ctx.lineTo(-size * 1.13, -size * .36 + tailWag); ctx.lineTo(-size * 1.07, 0); ctx.lineTo(-size * 1.13, size * .36 + tailWag); ctx.closePath(); ctx.fill();
    ctx.fillStyle = 'rgba(255,247,219,.52)'; ctx.beginPath(); ctx.moveTo(-size * .22, -size * .14); ctx.quadraticCurveTo(size * .06, -size * .68, size * .42, -size * .18); ctx.closePath(); ctx.fill();
    ctx.beginPath(); ctx.moveTo(-size * .18, size * .18); ctx.quadraticCurveTo(size * .11, size * .57, size * .42, size * .2); ctx.closePath(); ctx.fill();
    if (f.typeIndex === 1 || f.typeIndex === 2) {
      ctx.strokeStyle = f.typeIndex === 1 ? '#fff2d3' : '#f07f57'; ctx.lineWidth = size * .12;
      for (let stripe = 0; stripe < 2; stripe++) { const sx = -size * .02 + stripe * size * .29; ctx.beginPath(); ctx.moveTo(sx, -size * .36); ctx.quadraticCurveTo(sx - size * .07, 0, sx, size * .36); ctx.stroke(); }
    }
    if (f.typeIndex === 3) { ctx.strokeStyle = '#f8e4bc'; ctx.lineWidth = 2; for (let p = 0; p < 5; p++) { const a = p * Math.PI / 2.5; ctx.beginPath(); ctx.arc(Math.cos(a) * size * .57, Math.sin(a) * size * .35, 1.7, 0, Math.PI * 2); ctx.stroke(); } }
  }
  ctx.fillStyle = '#fff8dc'; ctx.beginPath(); ctx.arc(size * .48, -size * .09, Math.max(2.5, size * .085), 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = '#245963'; ctx.beginPath(); ctx.arc(size * .51, -size * .09, Math.max(1.3, size * .04), 0, Math.PI * 2); ctx.fill();
  ctx.strokeStyle = 'rgba(31,91,99,.45)'; ctx.lineWidth = Math.max(1, size * .035); ctx.beginPath(); ctx.moveTo(size * .72, size * .11); ctx.quadraticCurveTo(size * .58, size * .2, size * .47, size * .16); ctx.stroke();
  ctx.restore();
  if (f.progress > 0 && f.alive) {
    const ratio = f.progress / type.resistance; const barW = Math.max(34, size * 1.45);
    ctx.fillStyle = 'rgba(255,251,236,.78)'; roundedRect(x - barW / 2, y - size * .72, barW, 5, 3); ctx.fill();
    ctx.fillStyle = '#f1bc5c'; roundedRect(x - barW / 2, y - size * .72, barW * ratio, 5, 3); ctx.fill();
  }
}
function drawShots(dt) {
  for (let i = shots.length - 1; i >= 0; i--) {
    const shot = shots[i]; shot.life += dt; const progress = Math.min(1, shot.life / shot.duration); const ease = 1 - (1 - progress) ** 3;
    shot.x = boatOrigin().x + (shot.tx - boatOrigin().x) * ease; shot.y = boatOrigin().y + (shot.ty - boatOrigin().y) * ease;
    const net = nets[shot.netIndex];
    ctx.save(); ctx.strokeStyle = net.color; ctx.fillStyle = 'rgba(255,255,255,.4)'; ctx.lineWidth = 2;
    ctx.beginPath(); ctx.arc(shot.x, shot.y, 5 + progress * 6, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(shot.x - 8, shot.y); ctx.lineTo(shot.x + 8, shot.y); ctx.moveTo(shot.x, shot.y - 8); ctx.lineTo(shot.x, shot.y + 8); ctx.stroke(); ctx.restore();
    if (progress >= 1) { impact(shot); shots.splice(i, 1); }
  }
}
function drawNets(dt) {
  for (let i = netsOnWater.length - 1; i >= 0; i--) {
    const net = netsOnWater[i]; net.life += dt; const p = Math.min(1, net.life / net.duration);
    net.radius = net.targetRadius * (p < .48 ? p / .48 : 1 - (p - .48) / .52 * .18);
    const fade = p > .65 ? 1 - (p - .65) / .35 : 1;
    ctx.save(); ctx.globalAlpha = fade * .62; ctx.strokeStyle = net.color; ctx.lineWidth = 2.2; ctx.fillStyle = `${net.color}19`;
    ctx.beginPath(); ctx.arc(net.x, net.y, net.radius, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
    ctx.globalAlpha = fade * .44; ctx.lineWidth = 1;
    for (let r = net.radius / 4; r < net.radius; r += net.radius / 4) { ctx.beginPath(); ctx.arc(net.x, net.y, r, 0, Math.PI * 2); ctx.stroke(); }
    const spokes = Math.max(8, Math.round(net.radius / 6));
    for (let a = 0; a < spokes; a++) { const angle = a * Math.PI * 2 / spokes; ctx.beginPath(); ctx.moveTo(net.x, net.y); ctx.lineTo(net.x + Math.cos(angle) * net.radius, net.y + Math.sin(angle) * net.radius); ctx.stroke(); }
    ctx.restore(); if (p >= 1) netsOnWater.splice(i, 1);
  }
}
function drawEffects(dt) {
  for (let i = sparkles.length - 1; i >= 0; i--) {
    const p = sparkles[i]; p.life -= dt; p.x += p.vx * dt; p.y += p.vy * dt; p.vx *= .985; p.vy = p.vy * .985 - 8 * dt;
    ctx.globalAlpha = clamp(p.life / p.maxLife, 0, 1); ctx.fillStyle = p.color; ctx.beginPath(); ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2); ctx.fill(); ctx.globalAlpha = 1;
    if (p.life <= 0) sparkles.splice(i, 1);
  }
}
function drawReticle() {
  if (!pointer.inside || state !== 'playing') return;
  const net = nets[netIndex]; ctx.save(); ctx.globalAlpha = .72; ctx.strokeStyle = net.color; ctx.lineWidth = 1.5;
  ctx.beginPath(); ctx.arc(pointer.x, pointer.y, 12, 0, Math.PI * 2); ctx.stroke();
  ctx.beginPath(); ctx.moveTo(pointer.x - 18, pointer.y); ctx.lineTo(pointer.x - 8, pointer.y); ctx.moveTo(pointer.x + 8, pointer.y); ctx.lineTo(pointer.x + 18, pointer.y); ctx.moveTo(pointer.x, pointer.y - 18); ctx.lineTo(pointer.x, pointer.y - 8); ctx.moveTo(pointer.x, pointer.y + 8); ctx.lineTo(pointer.x, pointer.y + 18); ctx.stroke(); ctx.restore();
}
function frame(now) {
  const dt = Math.min(.05, (now - (lastFrame || now)) / 1000); lastFrame = now; elapsed += dt;
  ctx.clearRect(0, 0, width, height); drawBackground(elapsed);
  if (state === 'playing') {
    timeLeft -= dt;
    if (timeLeft <= 0 && score < level().target) finishLevel(false);
    if (state === 'playing') {
      if (now - lastSpawnAt > 1100 && fish.filter((f) => f.alive).length < level().quota) { spawnFish(); lastSpawnAt = now; }
      for (const f of fish) {
        const type = fishTypes[f.typeIndex]; f.flash = Math.max(0, f.flash - dt);
        const speedMult = type.pattern === 'dash' && Math.sin(elapsed * 1.1 + f.phase) > .83 ? 2.6 : 1;
        f.x += f.dir * f.speed * speedMult * dt;
        if (type.pattern === 'weave') f.y += Math.sin(elapsed * 2.1 + f.phase) * 16 * dt;
        if (type.pattern === 'dart' && Math.sin(elapsed * .72 + f.phase) > .96) { f.dir *= -1; f.y += random(-20, 20); }
        if (type.pattern === 'school') f.y += Math.sin(elapsed * 2.6 + f.phase) * 9 * dt;
        if (type.pattern === 'drift') f.y += f.drift * 9;
        f.y = clamp(f.y, 145, height - 140);
        if (f.x < -100 || f.x > width + 100) { f.alive = false; }
      }
      fish = fish.filter((f) => f.alive);
      drawNets(dt);
    }
  }
  for (const f of fish) if (f.alive) drawFish(f, elapsed);
  if (state === 'playing') drawShots(dt);
  drawEffects(dt); drawReticle();
  if (bubbles.length < 17 && Math.random() < .08) bubbles.push({ x: random(0, width), y: height + 10, r: random(2, 8), speed: random(13, 31), phase: random(0, 6), alpha: random(.18, .53) });
  if (state === 'playing') updateHud();
  requestAnimationFrame(frame);
}
requestAnimationFrame(frame);

canvas.addEventListener('pointermove', (event) => {
  const rect = canvas.getBoundingClientRect(); pointer.x = event.clientX - rect.left; pointer.y = event.clientY - rect.top; pointer.inside = true;
});
canvas.addEventListener('pointerleave', () => { pointer.inside = false; });
canvas.addEventListener('pointerdown', (event) => {
  event.preventDefault();
  if (event.button === 2) { setNet(netIndex + 1); return; }
  if (event.button === 0 && state === 'playing') { const rect = canvas.getBoundingClientRect(); shoot(event.clientX - rect.left, event.clientY - rect.top); }
});
canvas.addEventListener('contextmenu', (event) => event.preventDefault());
$('#start-button').addEventListener('click', () => startLevel(Math.min(levelIndex, unlocked)));
$('#pause-button').addEventListener('click', pauseGame);
$('#resume-button').addEventListener('click', resumeGame);
$('#pause-home-button').addEventListener('click', goHome);
$('#next-button').addEventListener('click', () => startLevel(Math.min(levelIndex + 1, unlocked)));
$('#retry-button').addEventListener('click', () => startLevel(levelIndex));
$('#home-button').addEventListener('click', goHome);
$('#howto-button').addEventListener('click', () => $('#howto-dialog').showModal());
$('#close-howto').addEventListener('click', () => $('#howto-dialog').close());
$('#got-it').addEventListener('click', () => $('#howto-dialog').close());
$('#sound-toggle').addEventListener('click', (event) => {
  muted = !muted; event.currentTarget.textContent = muted ? '♫̸' : '♫'; event.currentTarget.setAttribute('aria-label', muted ? '开启音效' : '关闭音效');
  if (!muted) playSound('shoot');
});
window.addEventListener('keydown', (event) => {
  if (event.code === 'Escape') {
    if ($('#howto-dialog').open) { $('#howto-dialog').close(); return; }
    if (state === 'playing') pauseGame(); else if (state === 'paused') resumeGame();
  }
  if (event.code === 'Space' && state === 'playing') { event.preventDefault(); shoot(pointer.inside ? pointer.x : width / 2, pointer.inside ? pointer.y : height * .55); }
  if ((event.code === 'KeyN' || event.code === 'ArrowUp') && state === 'playing') setNet(netIndex + 1);
});

updateHud();
