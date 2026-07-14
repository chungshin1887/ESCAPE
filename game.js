// ============================================================
// ESCAPE - 인터넷 중독 탈출기
// ============================================================

const canvas = document.getElementById('game-canvas');
const ctx = canvas.getContext('2d');
const W = canvas.width;
const H = canvas.height;
const GROUND_Y = 360;

// ---------- DOM ----------
const introScreen = document.getElementById('intro-screen');
const gameScreen = document.getElementById('game-screen');
const gameoverScreen = document.getElementById('gameover-screen');
const winScreen = document.getElementById('win-screen');
const dialogueBox = document.getElementById('dialogue-box');
const dialogueText = document.getElementById('dialogue-text');
const dialogueHint = document.getElementById('dialogue-next-hint');
const startBtn = document.getElementById('start-btn');
const retryBtn = document.getElementById('retry-btn');
const winRetryBtn = document.getElementById('win-retry-btn');
const livesEl = document.getElementById('lives');
const phaseLabelEl = document.getElementById('phase-label');
const scoreEl = document.getElementById('score');
const progressInner = document.getElementById('progress-bar-inner');
const progressText = document.getElementById('progress-text');
const statusBanner = document.getElementById('status-banner');
const gameoverScoreEl = document.getElementById('gameover-score');
const btnJumpTouch = document.getElementById('btn-jump');
const btnSlideTouch = document.getElementById('btn-slide');
const infoBtn = document.getElementById('info-btn');
const infoModal = document.getElementById('item-info-modal');
const infoCloseBtn = document.getElementById('item-info-close');
const infoGoodList = document.getElementById('info-good-list');
const infoBadList = document.getElementById('info-bad-list');
const infoExtraList = document.getElementById('info-extra-list');

// ---------- 스토리 대사 ----------
const dialogueLines = [
  "새벽 3시... \"딱 5분만 더 보고 자야지...\"",
  "정신을 차려보니 창밖이 환해져 있었다.",
  "핸드폰 속으로 정신이 빨려 들어가는 것 같아...",
  "이렇게 살 순 없어!! 오늘 시험에서\n100점을 맞아서 인터넷 중독에서 벗어나자!",
  "골드(책)를 모으고 장애물을 피하면서\n디지털 세상을 지나 현실 세계로 탈출하라!"
];
let dialogueIndex = 0;

function showDialogue(i) {
  if (i >= dialogueLines.length) {
    dialogueHint.classList.add('hidden');
    startBtn.classList.remove('hidden');
    infoBtn.classList.remove('hidden');
    dialogueText.textContent = "준비됐다면 아래 버튼을 눌러 시작하자!";
    return;
  }
  dialogueText.textContent = dialogueLines[i];
}
showDialogue(0);
dialogueBox.addEventListener('click', () => {
  if (dialogueIndex < dialogueLines.length) {
    dialogueIndex++;
    showDialogue(dialogueIndex);
  }
});

// ============================================================
// 게임 상수
// ============================================================
const WIN_SCORE = 100000;
const PHASE_SWITCH_SCORE = 50000;
const GRAVITY = 0.85;
const JUMP_FORCE = -15.5;
const SLIDE_HEIGHT_RATIO = 0.5;

// ============================================================
// 상태
// ============================================================
let state = null;

function freshState() {
  return {
    running: false,
    phase: 'digital', // 'digital' | 'real'
    score: 0,
    lives: 3,
    baseSpeed: 6.5,
    frame: 0,
    nextSpawnAt: 60,
    nextZombiePassiveCheck: 0,
    entities: [], // obstacles + items
    zombies: [],
    particles: [],
    player: {
      x: 120,
      y: GROUND_Y,
      w: 42,
      h: 58,
      vy: 0,
      onGround: true,
      mode: 'run', // run | jump | slide
      trappedTimer: 0,
      trapMash: 0,
      confuseTimer: 0,
      slowTimer: 0,
      slowFactor: 1,
      invulnTimer: 0,
      phoneZombieTimer: 0,
    },
    bgScrollX: 0,
    transitionFlash: 0,
    bannerTimer: 0,
    ended: false,
  };
}

// ============================================================
// 장애물 / 아이템 정의
// ============================================================
// kind: 'good' (이득), 'bad_item' (점수 감소만), 'obstacle' (생명 감소 + 스좀비 유발),
//       'hazard_zone' (밟으면 감속), 'pit' (스마트폰 좀비화 + 스좀비 무리)
const DIGITAL_OBSTACLES = [
  { id: 'popup', name: '팝업 광고', emoji: '🪟', type: 'ground', kind: 'obstacle', w: 46, h: 50 },
  { id: 'notice', name: '알림창 스패머', emoji: '🔔', type: 'air', kind: 'obstacle', w: 40, h: 40 },
  { id: 'like_terror', name: '좋아요 테러', emoji: '👎', type: 'ground', kind: 'obstacle', w: 42, h: 46 },
  { id: 'wifi_lag', name: '끊기는 와이파이', emoji: '📶', type: 'zone', kind: 'hazard_zone', w: 90, h: 14 },
];
const REAL_OBSTACLES = [
  { id: 'bed', name: '포근한 침대', emoji: '🛏️', type: 'ground', kind: 'trap', w: 70, h: 46 },
  { id: 'noise', name: '소음 유발자', emoji: '📢', type: 'air', kind: 'confuse', w: 42, h: 40 },
  { id: 'junk', name: '빈둥거리기 템', emoji: '🎮', type: 'ground', kind: 'obstacle', w: 40, h: 40 },
  { id: 'worksheet', name: '밀린 학습지', emoji: '📄', type: 'ground', kind: 'obstacle', w: 40, h: 40 },
  { id: 'sleepy', name: '잠귀신', emoji: '💤', type: 'air', kind: 'obstacle', w: 40, h: 40 },
  { id: 'clock', name: '째깍거리는 시계', emoji: '⏰', type: 'ground', kind: 'obstacle', w: 40, h: 44 },
];
const SPECIAL_OBSTACLES = [
  { id: 'blackhole', name: '무한 스크롤 블랙홀', emoji: '🌀', type: 'zone', kind: 'pit', w: 90, h: 16 },
  { id: 'charger_vine', name: '충전선 덩굴', emoji: '🔌', type: 'air', kind: 'trap', w: 40, h: 46 },
];
const ITEMS = [
  { id: 'book', name: '책', emoji: '📖', kind: 'good', score: 200, w: 34, h: 34 },
  { id: 'drink', name: '음료', emoji: '🥤', kind: 'good', score: 800, w: 34, h: 34 },
  { id: 'choco', name: '초콜릿', emoji: '🍫', kind: 'good', score: 800, w: 32, h: 30 },
  { id: 'phone', name: '핸드폰', emoji: '📱', kind: 'bad_item', score: -600, w: 30, h: 34 },
];

// ============================================================
// 아이템 정보 모달 (설정 ⚙️ 버튼)
// ============================================================
function buildItemInfoModal() {
  // 좌측: 먹으면 점수가 오르는 아이템
  const goodItems = ITEMS.filter((it) => it.kind === 'good');
  infoGoodList.innerHTML = goodItems
    .map((it) => `<li><span class="info-emoji">${it.emoji}</span> ${it.name}: <b>+${it.score.toLocaleString()}점</b></li>`)
    .join('');

  // 우측: 닿으면 목숨(하트)이 깎이는 장애물
  const allObstacles = DIGITAL_OBSTACLES.concat(REAL_OBSTACLES, SPECIAL_OBSTACLES);
  const lifeLossObstacles = allObstacles.filter((o) => ['obstacle', 'trap', 'confuse', 'pit'].includes(o.kind));
  infoBadList.innerHTML = lifeLossObstacles
    .map((o) => `<li><span class="info-emoji">${o.emoji}</span> ${o.name}: <b>❤️ -1</b></li>`)
    .join('');

  // 그 외: 점수만 깎이는 아이템 / 속도만 느려지는 장판
  const badScoreItems = ITEMS.filter((it) => it.kind === 'bad_item');
  const hazardZones = allObstacles.filter((o) => o.kind === 'hazard_zone');
  const extras = [];
  badScoreItems.forEach((it) => {
    extras.push(`<li><span class="info-emoji">${it.emoji}</span> ${it.name}: <b>${it.score.toLocaleString()}점</b> (목숨은 안 깎여요)</li>`);
  });
  hazardZones.forEach((o) => {
    extras.push(`<li><span class="info-emoji">${o.emoji}</span> ${o.name}: <b>🐌 속도 감소</b> (목숨은 안 깎여요)</li>`);
  });
  infoExtraList.innerHTML = extras.join('');
}
buildItemInfoModal();

function openInfoModal() { infoModal.classList.remove('hidden'); }
function closeInfoModal() { infoModal.classList.add('hidden'); }
infoBtn.addEventListener('click', openInfoModal);
infoCloseBtn.addEventListener('click', closeInfoModal);
infoModal.addEventListener('click', (e) => { if (e.target === infoModal) closeInfoModal(); });

function currentObstaclePool() {
  return state.phase === 'digital'
    ? DIGITAL_OBSTACLES.concat(SPECIAL_OBSTACLES.slice(0, 1))
    : REAL_OBSTACLES.concat(SPECIAL_OBSTACLES.slice(1, 2));
}

// ============================================================
// 입력
// ============================================================
const keys = { jump: false, slide: false };

function requestJump() {
  const p = state.player;
  if (!state.running || p.trappedTimer > 0) {
    if (p.trappedTimer > 0) p.trapMash += 1; // 트랩 상태에서 마구 누르면 탈출
    return;
  }
  const wantsJump = p.confuseTimer > 0 ? false : true;
  doJump(wantsJump);
}
function requestSlide(down) {
  const p = state.player;
  if (!state.running || p.trappedTimer > 0) {
    if (down && p.trappedTimer > 0) p.trapMash += 1;
    return;
  }
  const wantsSlide = p.confuseTimer > 0 ? false : true;
  doSlide(down, wantsSlide);
}

function doJump(really) {
  const p = state.player;
  if (really) {
    if (p.onGround) {
      p.vy = JUMP_FORCE;
      p.onGround = false;
      p.mode = 'jump';
    }
  } else {
    // 조작 반전: 점프 버튼을 눌렀는데 슬라이드가 발동
    doSlide(true, true);
  }
}
function doSlide(down, really) {
  const p = state.player;
  if (!really) {
    if (down) doJump(true);
    return;
  }
  if (down && p.onGround) {
    p.mode = 'slide';
  } else if (!down && p.mode === 'slide') {
    p.mode = 'run';
  }
}

window.addEventListener('keydown', (e) => {
  if (['Space', 'ArrowUp', 'KeyW'].includes(e.code)) {
    e.preventDefault();
    if (!keys.jump) requestJump();
    keys.jump = true;
  }
  if (['ArrowDown', 'KeyS'].includes(e.code)) {
    e.preventDefault();
    if (!keys.slide) requestSlide(true);
    keys.slide = true;
  }
});
window.addEventListener('keyup', (e) => {
  if (['Space', 'ArrowUp', 'KeyW'].includes(e.code)) keys.jump = false;
  if (['ArrowDown', 'KeyS'].includes(e.code)) { keys.slide = false; requestSlide(false); }
});
btnJumpTouch.addEventListener('touchstart', (e) => { e.preventDefault(); requestJump(); });
btnJumpTouch.addEventListener('mousedown', () => requestJump());
btnSlideTouch.addEventListener('touchstart', (e) => { e.preventDefault(); requestSlide(true); });
btnSlideTouch.addEventListener('touchend', (e) => { e.preventDefault(); requestSlide(false); });
btnSlideTouch.addEventListener('mousedown', () => requestSlide(true));
btnSlideTouch.addEventListener('mouseup', () => requestSlide(false));

// ============================================================
// 스폰
// ============================================================
function spawnEntity() {
  const pool = currentObstaclePool();
  const roll = Math.random();
  let def;
  if (roll < 0.42) {
    def = ITEMS[Math.floor(Math.random() * ITEMS.length)];
  } else {
    def = pool[Math.floor(Math.random() * pool.length)];
  }

  let y;
  if (def.kind === 'good' || def.kind === 'bad_item') {
    y = GROUND_Y + 58 - def.h - (Math.random() < 0.4 ? 55 : 0); // 가끔 공중에 떠있는 아이템
  } else if (def.type === 'air') {
    y = GROUND_Y + 58 - 95; // 머리 높이 (슬라이드로 회피)
  } else if (def.type === 'zone') {
    y = GROUND_Y + 58 - def.h; // 바닥 장판
  } else {
    y = GROUND_Y + 58 - def.h; // 바닥 장애물 (점프로 회피)
  }

  state.entities.push({
    def,
    x: W + 40,
    y,
    w: def.w,
    h: def.h,
    hit: false,
    collected: false,
  });
}

function spawnZombies(count) {
  for (let i = 0; i < count; i++) {
    state.zombies.push({
      x: W + 120 + i * 55,
      y: GROUND_Y - 6,
      w: 40,
      h: 54,
      life: 260 + i * 20, // 프레임 수명
      caught: false,
    });
  }
}

// ============================================================
// 상태 표시 배너
// ============================================================
function banner(msg, duration = 90) {
  statusBanner.textContent = msg;
  state.bannerTimer = duration;
}

// ============================================================
// 충돌
// ============================================================
function rectsOverlap(a, b) {
  return a.x < b.x + b.w && a.x + a.w > b.x && a.y < b.y + b.h && a.y + a.h > b.y;
}

function playerHitbox() {
  const p = state.player;
  const h = p.mode === 'slide' ? p.h * SLIDE_HEIGHT_RATIO : p.h;
  const y = p.mode === 'slide' ? p.y + p.h - h : p.y;
  return { x: p.x + 6, y: y, w: p.w - 12, h: h };
}

function loseLife(reason) {
  const p = state.player;
  if (p.invulnTimer > 0) return;
  state.lives -= 1;
  p.invulnTimer = 90;
  updateLivesUI();
  if (state.lives <= 0) {
    endGame(false);
  }
}

// ============================================================
// 업데이트
// ============================================================
function update() {
  if (!state.running) return;
  const p = state.player;
  state.frame++;

  // --- 속도 계산 ---
  let speed = state.baseSpeed + Math.min(state.score / 9000, 6.5);
  if (p.slowTimer > 0) { speed *= 0.35; p.slowTimer--; }
  if (p.phoneZombieTimer > 0) { speed *= 0.55; }

  // --- 트랩 처리 ---
  if (p.trappedTimer > 0) {
    p.trappedTimer--;
    if (p.trapMash >= 8) {
      p.trappedTimer = 0;
      p.trapMash = 0;
      banner('버둥거려서 탈출 성공!', 60);
    }
    if (p.trappedTimer <= 0) p.trapMash = 0;
  } else {
    // --- 물리 ---
    if (!p.onGround) {
      p.vy += GRAVITY;
      p.y += p.vy;
      if (p.y >= GROUND_Y) {
        p.y = GROUND_Y;
        p.vy = 0;
        p.onGround = true;
        p.mode = 'run';
      }
    }
  }

  if (p.confuseTimer > 0) p.confuseTimer--;
  if (p.phoneZombieTimer > 0) p.phoneZombieTimer--;
  if (p.invulnTimer > 0) p.invulnTimer--;
  if (state.bannerTimer > 0) { state.bannerTimer--; if (state.bannerTimer <= 0) statusBanner.textContent = ''; }
  if (state.transitionFlash > 0) state.transitionFlash--;

  // --- 배경 스크롤 ---
  state.bgScrollX -= speed * 0.5;

  // --- 스폰 ---
  state.nextSpawnAt -= 1;
  if (state.nextSpawnAt <= 0) {
    spawnEntity();
    const gap = Math.max(38, 70 - speed * 2.2);
    state.nextSpawnAt = gap + Math.random() * 30;
  }

  // --- 엔티티 이동 & 충돌 ---
  const hitbox = playerHitbox();
  for (let i = state.entities.length - 1; i >= 0; i--) {
    const e = state.entities[i];
    e.x -= speed;
    if (e.x + e.w < -60) { state.entities.splice(i, 1); continue; }

    if (e.hit || e.collected) continue;
    const ebox = { x: e.x, y: e.y, w: e.w, h: e.h };
    if (!rectsOverlap(hitbox, ebox)) continue;

    const def = e.def;
    if (def.kind === 'good') {
      e.collected = true;
      addScore(def.score);
      spawnParticle(e.x, e.y, `+${def.score}`, '#8effa1');
      state.entities.splice(i, 1);
    } else if (def.kind === 'bad_item') {
      e.collected = true;
      addScore(def.score);
      spawnParticle(e.x, e.y, `${def.score}`, '#ff6b6b');
      state.entities.splice(i, 1);
    } else if (def.kind === 'hazard_zone') {
      e.hit = true;
      p.slowTimer = 70;
      banner('📶 와이파이가 끊겨서 느려졌다...', 70);
    } else if (def.kind === 'trap') {
      e.hit = true;
      p.trappedTimer = 100;
      p.trapMash = 0;
      p.onGround = true;
      p.mode = 'run';
      banner(def.id === 'bed' ? '🛏️ "5분만 더 누워있을까..." (연타로 탈출!)' : '🔌 충전선에 걸렸다! (연타로 탈출!)', 130);
      loseLife();
      spawnZombies(1);
    } else if (def.kind === 'confuse') {
      e.hit = true;
      p.confuseTimer = 240;
      banner('📢 시끄러운 소음! 조작이 반대가 됐다!', 100);
      loseLife();
    } else if (def.kind === 'pit') {
      e.hit = true;
      p.phoneZombieTimer = 160;
      banner('🌀 무한 스크롤에 빠져 폰좀비가 되어버렸다!!', 130);
      loseLife();
      spawnZombies(3);
    } else if (def.kind === 'obstacle') {
      e.hit = true;
      banner(`💥 ${def.name}에 부딪혔다! 스좀비 출몰!`, 100);
      loseLife();
      spawnZombies(1);
    }
    updateScoreUI();
  }

  // --- 스좀비 이동 & 추격 ---
  const zSpeed = speed + 2.6;
  for (let i = state.zombies.length - 1; i >= 0; i--) {
    const z = state.zombies[i];
    z.x -= zSpeed;
    z.life -= 1;
    const zbox = { x: z.x, y: z.y, w: z.w, h: z.h };
    if (!z.caught && rectsOverlap(hitbox, zbox)) {
      z.caught = true;
      loseLife();
      banner('🧟 스좀비에게 붙잡혔다!', 90);
      state.zombies.splice(i, 1);
      continue;
    }
    if (z.x < -80 || z.life <= 0) {
      state.zombies.splice(i, 1);
    }
  }

  // --- 파티클 ---
  for (let i = state.particles.length - 1; i >= 0; i--) {
    const pt = state.particles[i];
    pt.y -= 1.2;
    pt.life -= 1;
    if (pt.life <= 0) state.particles.splice(i, 1);
  }

  // --- 점수(거리) 자동 증가 ---
  addScore(Math.round(speed * 3.2));
  updateScoreUI();
  checkPhase();
  checkWin();

  render(speed);
  requestAnimationFrame(update);
}

function spawnParticle(x, y, text, color) {
  state.particles.push({ x, y, text, color, life: 40 });
}

function addScore(n) {
  state.score = Math.max(0, state.score + n);
}

function checkPhase() {
  if (state.phase === 'digital' && state.score >= PHASE_SWITCH_SCORE) {
    state.phase = 'real';
    state.transitionFlash = 40;
    banner('✨ 디지털 세상을 벗어나 현실 세계로 진입했다!', 160);
    phaseLabelEl.textContent = '🏠 현실 세계';
    phaseLabelEl.classList.add('real');
  }
}
function checkWin() {
  if (state.score >= WIN_SCORE) endGame(true);
}

// ============================================================
// 렌더링
// ============================================================
// ---------- 이모지 픽셀화 (디지털 세상 / 스좀비 전용) ----------
const pixelEmojiCache = new Map();
function getPixelatedEmoji(emoji, size) {
  const key = emoji + '_' + size;
  if (pixelEmojiCache.has(key)) return pixelEmojiCache.get(key);
  const small = 14;
  const off1 = document.createElement('canvas');
  off1.width = small; off1.height = small;
  const c1 = off1.getContext('2d');
  c1.font = `${small}px serif`;
  c1.textAlign = 'center'; c1.textBaseline = 'middle';
  c1.fillText(emoji, small / 2, small / 2 + 1);
  const off2 = document.createElement('canvas');
  off2.width = Math.max(4, Math.round(size)); off2.height = off2.width;
  const c2 = off2.getContext('2d');
  c2.imageSmoothingEnabled = false;
  c2.drawImage(off1, 0, 0, off2.width, off2.height);
  pixelEmojiCache.set(key, off2);
  return off2;
}
function drawEmoji(emoji, cx, bottomY, size, pixelated) {
  if (size < 3) return;
  if (pixelated) {
    const img = getPixelatedEmoji(emoji, size);
    ctx.drawImage(img, cx - size / 2, bottomY - size, size, size);
  } else {
    ctx.font = `${size}px serif`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'bottom';
    ctx.fillText(emoji, cx, bottomY);
  }
}

// ---------- 픽셀 히어로 (디지털 세상) ----------
function rr(x, y, w, h, color) {
  ctx.fillStyle = color;
  ctx.fillRect(Math.round(x), Math.round(y), Math.round(w), Math.round(h));
}
function drawPixelHero(cx, bottom, w, h, mode, frame, speedFactor, confused) {
  const u = Math.max(3, Math.round(w / 9));
  const step = Math.floor(frame / Math.max(3, Math.round(9 / speedFactor))) % 4;
  const hoodie = '#3fd0ff', pants = '#171733', skin = '#ffd39b', hair = '#241708', shoe = '#ff5da2';
  const topY = bottom - h;
  ctx.save();
  ctx.imageSmoothingEnabled = false;

  if (mode === 'zombie') {
    const shuffle = (step % 2) * u * 0.6;
    rr(cx - u * 1.4, bottom - u * 3, u * 1.2, u * 3, '#5a7a52');
    rr(cx + u * 0.2, bottom - u * 3 + shuffle, u * 1.2, u * 3 - shuffle, '#5a7a52');
    rr(cx - u * 2, topY + u * 3, u * 4, u * 3.5, '#3f5c3a');
    rr(cx - u * 3.4, topY + u * 3, u * 1.6, u, '#7fae72');
    rr(cx + u * 1.8, topY + u * 3, u * 1.6, u, '#7fae72');
    rr(cx - u * 1.6, topY, u * 3.2, u * 3, '#8fc27f');
    rr(cx - u * 1.6, topY - u * 0.4, u * 3.2, u * 0.6, hair);
  } else if (mode === 'trapped') {
    const jit = Math.sin(frame * 0.9) * u * 0.6;
    rr(cx - u * 1.6 + jit, bottom - u * 2.2, u * 1.3, u * 2.2, pants);
    rr(cx + u * 0.3 + jit, bottom - u * 2.2, u * 1.3, u * 2.2, pants);
    rr(cx - u * 2 + jit, topY + u * 3, u * 4, u * 3, hoodie);
    rr(cx - u * 3 + jit, topY + u * 1.5, u * 1.4, u * 2, hoodie);
    rr(cx + u * 1.6 + jit, topY + u * 1.5, u * 1.4, u * 2, hoodie);
    rr(cx - u * 1.5 + jit, topY, u * 3, u * 3, skin);
    rr(cx - u * 1.6 + jit, topY - u * 0.6, u * 3.2, u, hair);
  } else if (mode === 'jump') {
    rr(cx - u * 1.8, bottom - u * 1.6, u * 1.5, u * 1.6, pants);
    rr(cx + u * 0.3, bottom - u * 2.2, u * 1.5, u * 1.6, pants);
    rr(cx - u * 2, topY + u * 2.6, u * 4, u * 3, hoodie);
    rr(cx - u * 3.2, topY + u * 1, u * 1.4, u * 2, hoodie);
    rr(cx + u * 1.8, topY + u * 0.4, u * 1.4, u * 2, hoodie);
    rr(cx - u * 1.5, topY - u * 0.2, u * 3, u * 3, skin);
    rr(cx - u * 1.6, topY - u * 0.8, u * 3.2, u, hair);
  } else if (mode === 'slide') {
    const sy = bottom - h * SLIDE_HEIGHT_RATIO;
    rr(cx - u * 2.6, bottom - u * 1.4, u * 2.2, u * 1.4, pants);
    rr(cx + u * 0.6, bottom - u * 1.4, u * 2.2, u * 1.4, pants);
    rr(cx - u * 2.4, sy + u * 0.4, u * 4.6, u * 2.2, hoodie);
    rr(cx + u * 2.2, sy, u * 1.6, u * 1.2, hoodie);
    rr(cx - u * 2.6, sy - u * 1.6, u * 2.6, u * 2, skin);
    rr(cx - u * 2.6, sy - u * 2.1, u * 2.6, u * 0.7, hair);
  } else {
    const bounce = (step === 1 || step === 3) ? -u * 0.5 : 0;
    const frontDX = step === 0 ? u * 1.6 : step === 2 ? -u * 1.6 : 0;
    const backDX = step === 0 ? -u * 1.6 : step === 2 ? u * 1.6 : 0;
    rr(cx - u * 0.6 + backDX, bottom - u * 2 + (backDX !== 0 ? -u * 0.8 : 0), u * 1.3, u * 2, shoe);
    rr(cx - u * 0.6 + backDX, bottom - u * 2.6 + (backDX !== 0 ? -u * 0.8 : 0), u * 1.3, u * 1.4, pants);
    rr(cx - u * 0.6 + frontDX, bottom - u * 2, u * 1.3, u * 2, shoe);
    rr(cx - u * 0.6 + frontDX, bottom - u * 2.6, u * 1.3, u * 1.4, pants);
    rr(cx - u * 2 + backDX * 0.3, topY + u * 2.6 + bounce, u * 4, u * 3, hoodie);
    rr(cx - u * 3.2 - backDX * 0.4, topY + u * 2.8 + bounce, u * 1.3, u * 1.8, hoodie);
    rr(cx + u * 1.9 + frontDX * 0.4, topY + u * 2.6 + bounce, u * 1.3, u * 1.8, hoodie);
    rr(cx - u * 1.5, topY + bounce, u * 3, u * 3, skin);
    rr(cx - u * 1.6, topY - u * 0.6 + bounce, u * 3.2, u, hair);
  }
  if (confused) drawConfuseStars(cx, topY - u);
  ctx.restore();
}

// ---------- 일반 히어로 (현실 세계) ----------
function drawNormalHero(cx, bottom, w, h, mode, frame, speedFactor, confused) {
  const t = frame * 0.14 * speedFactor;
  const topY = bottom - h;
  const headR = w * 0.28;
  const bodyColor = '#ff8a4c', pantsColor = '#3a3a5c', skin = '#ffd8ad', hair = '#2b1a10';

  ctx.save();
  ctx.lineCap = 'round';

  if (mode === 'zombie') {
    ctx.strokeStyle = '#6f9a64'; ctx.lineWidth = w * 0.16;
    ctx.beginPath(); ctx.moveTo(cx, topY + h * 0.55); ctx.lineTo(cx - w * 0.6, topY + h * 0.35); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(cx, topY + h * 0.55); ctx.lineTo(cx + w * 0.6, topY + h * 0.35); ctx.stroke();
    const shuffle = Math.sin(t) * 4;
    ctx.beginPath(); ctx.moveTo(cx - w * 0.15, bottom - h * 0.4); ctx.lineTo(cx - w * 0.15 + shuffle, bottom); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(cx + w * 0.15, bottom - h * 0.4); ctx.lineTo(cx + w * 0.15 - shuffle, bottom); ctx.stroke();
    ctx.fillStyle = pantsColor; ctx.fillRect(cx - w * 0.28, topY + h * 0.5, w * 0.56, h * 0.32);
    ctx.fillStyle = '#8fc27f'; ctx.beginPath(); ctx.arc(cx, topY + headR, headR, 0, Math.PI * 2); ctx.fill();
  } else if (mode === 'trapped') {
    const jit = Math.sin(frame * 0.9) * 4;
    drawBodyBase(cx + jit, topY, bottom, w, h, bodyColor, pantsColor, skin, hair);
    ctx.strokeStyle = skin; ctx.lineWidth = w * 0.14;
    ctx.beginPath(); ctx.moveTo(cx - w * 0.2 + jit, topY + h * 0.35); ctx.lineTo(cx - w * 0.55 + jit, topY + h * 0.05 + Math.sin(frame * 0.5) * 6); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(cx + w * 0.2 + jit, topY + h * 0.35); ctx.lineTo(cx + w * 0.55 + jit, topY + h * 0.05 - Math.sin(frame * 0.5) * 6); ctx.stroke();
  } else if (mode === 'jump') {
    drawBodyBase(cx, topY, bottom, w, h, bodyColor, pantsColor, skin, hair, true);
  } else if (mode === 'slide') {
    const sy = bottom - h * SLIDE_HEIGHT_RATIO;
    ctx.fillStyle = bodyColor;
    ctx.beginPath(); ctx.ellipse(cx, sy + h * 0.15, w * 0.62, h * 0.2, 0, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = skin; ctx.beginPath(); ctx.arc(cx - w * 0.55, sy + h * 0.05, headR * 0.85, 0, Math.PI * 2); ctx.fill();
    ctx.strokeStyle = pantsColor; ctx.lineWidth = w * 0.16;
    ctx.beginPath(); ctx.moveTo(cx + w * 0.2, sy + h * 0.15); ctx.lineTo(cx + w * 0.75, sy + h * 0.1); ctx.stroke();
  } else {
    const legSwing = Math.sin(t) * (w * 0.5);
    const armSwing = Math.sin(t + Math.PI) * (w * 0.42);
    const bounce = Math.abs(Math.cos(t)) * h * 0.05;
    const cy = topY - bounce;

    ctx.strokeStyle = pantsColor; ctx.lineWidth = w * 0.2;
    ctx.beginPath(); ctx.moveTo(cx, cy + h * 0.62); ctx.lineTo(cx + legSwing, bottom); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(cx, cy + h * 0.62); ctx.lineTo(cx - legSwing, bottom); ctx.stroke();

    ctx.strokeStyle = skin; ctx.lineWidth = w * 0.15;
    ctx.beginPath(); ctx.moveTo(cx, cy + h * 0.3); ctx.lineTo(cx + armSwing, cy + h * 0.58); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(cx, cy + h * 0.3); ctx.lineTo(cx - armSwing, cy + h * 0.58); ctx.stroke();

    ctx.fillStyle = bodyColor;
    ctx.beginPath(); ctx.ellipse(cx, cy + h * 0.42, w * 0.36, h * 0.26, 0, 0, Math.PI * 2); ctx.fill();

    ctx.fillStyle = skin;
    ctx.beginPath(); ctx.arc(cx, cy + headR * 0.9, headR, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = hair;
    ctx.beginPath(); ctx.arc(cx, cy + headR * 0.55, headR * 1.02, Math.PI, Math.PI * 2); ctx.fill();
  }
  if (confused) drawConfuseStars(cx, topY - 10);
  ctx.restore();
}
function drawBodyBase(cx, topY, bottom, w, h, bodyColor, pantsColor, skin, hair, armsUp) {
  const headR = w * 0.28;
  ctx.strokeStyle = pantsColor; ctx.lineWidth = w * 0.2; ctx.lineCap = 'round';
  ctx.beginPath(); ctx.moveTo(cx, topY + h * 0.62); ctx.lineTo(cx - w * 0.28, bottom); ctx.stroke();
  ctx.beginPath(); ctx.moveTo(cx, topY + h * 0.62); ctx.lineTo(cx + w * 0.05, bottom - h * 0.1); ctx.stroke();
  ctx.strokeStyle = skin; ctx.lineWidth = w * 0.15;
  const armY = armsUp ? topY + h * 0.05 : topY + h * 0.58;
  ctx.beginPath(); ctx.moveTo(cx, topY + h * 0.3); ctx.lineTo(cx - w * 0.5, armY); ctx.stroke();
  ctx.beginPath(); ctx.moveTo(cx, topY + h * 0.3); ctx.lineTo(cx + w * 0.5, armY); ctx.stroke();
  ctx.fillStyle = bodyColor;
  ctx.beginPath(); ctx.ellipse(cx, topY + h * 0.42, w * 0.36, h * 0.26, 0, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = skin;
  ctx.beginPath(); ctx.arc(cx, topY + headR * 0.9, headR, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = hair;
  ctx.beginPath(); ctx.arc(cx, topY + headR * 0.55, headR * 1.02, Math.PI, Math.PI * 2); ctx.fill();
}
function drawConfuseStars(cx, y) {
  ctx.font = '16px serif';
  ctx.textAlign = 'center';
  ctx.fillText('❓', cx, y);
}

function drawBackgroundDigital(speed) {
  const grad = ctx.createLinearGradient(0, 0, 0, H);
  grad.addColorStop(0, '#0b0326');
  grad.addColorStop(1, '#1a0b3d');
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, W, H);

  // 네온 그리드
  ctx.strokeStyle = 'rgba(0,245,255,0.18)';
  ctx.lineWidth = 1;
  const gridOffset = state.bgScrollX % 40;
  for (let x = gridOffset; x < W; x += 40) {
    ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, H); ctx.stroke();
  }
  for (let y = 0; y < H; y += 40) {
    ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(W, y); ctx.stroke();
  }

  // 떠다니는 네온 도형(픽셀 블록)
  for (let i = 0; i < 6; i++) {
    const bx = (i * 173 + state.bgScrollX * 0.3) % (W + 100) - 50;
    const by = 40 + (i * 53) % 200;
    ctx.fillStyle = ['#ff00e5', '#00f5ff', '#fff500'][i % 3];
    ctx.globalAlpha = 0.25;
    ctx.fillRect(bx, by, 26, 26);
    ctx.globalAlpha = 1;
  }

  // 글리치 효과
  if (Math.random() < 0.06) {
    ctx.fillStyle = `rgba(${Math.random()<0.5?'0,245,255':'255,0,229'},0.12)`;
    const gy = Math.random() * H;
    ctx.fillRect(0, gy, W, 6 + Math.random() * 10);
  }

  // 바닥
  ctx.fillStyle = '#150a35';
  ctx.fillRect(0, GROUND_Y + 58, W, H - GROUND_Y - 58);
  ctx.strokeStyle = '#00f5ff';
  ctx.beginPath(); ctx.moveTo(0, GROUND_Y + 58); ctx.lineTo(W, GROUND_Y + 58); ctx.stroke();
}

function drawBackgroundReal(speed) {
  const grad = ctx.createLinearGradient(0, 0, 0, H);
  grad.addColorStop(0, '#3a2b4f');
  grad.addColorStop(1, '#5b4368');
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, W, H);

  // 창문 + 달
  ctx.fillStyle = 'rgba(255,225,150,0.85)';
  ctx.beginPath(); ctx.arc(W - 100, 70, 26, 0, Math.PI * 2); ctx.fill();

  // 따뜻한 방 느낌의 벽 장식(액자 느낌 사각형들, 패럴랙스)
  for (let i = 0; i < 4; i++) {
    const bx = (i * 260 + state.bgScrollX * 0.25) % (W + 200) - 100;
    ctx.fillStyle = 'rgba(255,200,140,0.12)';
    ctx.fillRect(bx, 60, 90, 120);
  }

  // 바닥 (나무 바닥)
  ctx.fillStyle = '#7a5230';
  ctx.fillRect(0, GROUND_Y + 58, W, H - GROUND_Y - 58);
  ctx.strokeStyle = 'rgba(0,0,0,0.25)';
  for (let x = state.bgScrollX % 60; x < W; x += 60) {
    ctx.beginPath(); ctx.moveTo(x, GROUND_Y + 58); ctx.lineTo(x + 20, H); ctx.stroke();
  }
}

function drawPlayer(speed) {
  const p = state.player;
  ctx.save();
  if (p.invulnTimer > 0 && Math.floor(state.frame / 4) % 2 === 0) ctx.globalAlpha = 0.4;

  const box = playerHitbox();
  const cx = box.x + box.w / 2;
  const bottom = box.y + box.h;
  const speedFactor = Math.max(0.6, speed / 6.5);

  let poseMode = p.mode;
  if (p.phoneZombieTimer > 0) poseMode = 'zombie';
  else if (p.trappedTimer > 0) poseMode = 'trapped';

  if (state.phase === 'digital') {
    drawPixelHero(cx, bottom, box.w, box.h, poseMode, state.frame, speedFactor, p.confuseTimer > 0);
  } else {
    drawNormalHero(cx, bottom, box.w, box.h, poseMode, state.frame, speedFactor, p.confuseTimer > 0);
  }
  ctx.restore();
}

function drawEntities() {
  const pixelated = state.phase === 'digital';
  for (const e of state.entities) {
    if (e.def.kind === 'hazard_zone') {
      ctx.save();
      ctx.globalAlpha = 0.5 + 0.3 * Math.sin(state.frame * 0.3);
      ctx.fillStyle = '#00c8ff';
      ctx.fillRect(e.x, e.y, e.w, e.h);
      ctx.restore();
    } else if (e.def.kind === 'pit') {
      ctx.save();
      ctx.fillStyle = '#000';
      ctx.beginPath();
      ctx.ellipse(e.x + e.w / 2, e.y + e.h / 2, e.w / 2, e.h / 2, 0, 0, Math.PI * 2);
      ctx.fillStyle = 'rgba(120,0,200,0.6)';
      ctx.fill();
      ctx.restore();
    }
    drawEmoji(e.def.emoji, e.x + e.w / 2, e.y + e.h + 6, e.h + 8, pixelated);
  }
}

function drawZombies() {
  // 스좀비는 세상이 바뀌어도 디지털 존재이므로 항상 픽셀화된 형태로 표시
  for (const z of state.zombies) {
    drawEmoji('🧟', z.x + z.w / 2, z.y + z.h + 6, z.h + 6, true);
  }
}

function drawParticles() {
  for (const pt of state.particles) {
    ctx.save();
    ctx.globalAlpha = Math.max(0, pt.life / 40);
    ctx.fillStyle = pt.color;
    ctx.font = 'bold 16px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(pt.text, pt.x, pt.y);
    ctx.restore();
  }
}

function render(speed) {
  ctx.clearRect(0, 0, W, H);
  if (state.phase === 'digital') drawBackgroundDigital(speed);
  else drawBackgroundReal(speed);

  drawEntities();
  drawZombies();
  drawPlayer(speed);
  drawParticles();

  if (state.transitionFlash > 0) {
    ctx.save();
    ctx.globalAlpha = state.transitionFlash / 40 * 0.6;
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, W, H);
    ctx.restore();
  }
}

// ============================================================
// UI 업데이트
// ============================================================
function updateLivesUI() {
  livesEl.textContent = '❤️'.repeat(Math.max(0, state.lives)) + '🖤'.repeat(Math.max(0, 3 - state.lives));
}
function updateScoreUI() {
  scoreEl.textContent = `SCORE: ${state.score.toLocaleString()}`;
  const pct = Math.min(100, (state.score / WIN_SCORE) * 100);
  progressInner.style.width = pct + '%';
  progressText.textContent = `${state.score.toLocaleString()} / ${WIN_SCORE.toLocaleString()}`;
}

// ============================================================
// 게임 흐름 제어
// ============================================================
function startGame() {
  state = freshState();
  introScreen.classList.add('hidden');
  gameoverScreen.classList.add('hidden');
  winScreen.classList.add('hidden');
  gameScreen.classList.remove('hidden');
  phaseLabelEl.textContent = '🌐 디지털 세상';
  phaseLabelEl.classList.remove('real');
  statusBanner.textContent = '';
  updateLivesUI();
  updateScoreUI();
  state.running = true;
  requestAnimationFrame(update);
}

function endGame(won) {
  if (state.ended) return;
  state.ended = true;
  state.running = false;
  gameScreen.classList.add('hidden');
  if (won) {
    winScreen.classList.remove('hidden');
  } else {
    gameoverScoreEl.textContent = `최종 점수: ${state.score.toLocaleString()}`;
    gameoverScreen.classList.remove('hidden');
  }
}

startBtn.addEventListener('click', startGame);
retryBtn.addEventListener('click', startGame);
winRetryBtn.addEventListener('click', startGame);
