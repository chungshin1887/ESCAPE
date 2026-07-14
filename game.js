'use strict';

const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');

const scoreEl = document.getElementById('score');
const worldLabelEl = document.getElementById('worldLabel');
const progressBarEl = document.getElementById('progressBar');
const statusPanelEl = document.getElementById('statusPanel');
const storyOverlay = document.getElementById('storyOverlay');
const messageOverlay = document.getElementById('messageOverlay');
const resultTitle = document.getElementById('resultTitle');
const resultText = document.getElementById('resultText');
const popupBlocker = document.getElementById('popupBlocker');
const startButton = document.getElementById('startButton');
const restartButton = document.getElementById('restartButton');
const jumpButton = document.getElementById('jumpButton');
const slideButton = document.getElementById('slideButton');

const TARGET_SCORE = 100000;
const REAL_WORLD_SCORE = 50000;
const GRAVITY = 2400;
const GROUND_Y = 600;

let game = null;
let animationId = null;
let lastTime = 0;

const random = (min, max) => Math.random() * (max - min) + min;
const clamp = (value, min, max) =>
  Math.max(min, Math.min(max, value));

const rectsOverlap = (a, b) =>
  a.x < b.x + b.w &&
  a.x + a.w > b.x &&
  a.y < b.y + b.h &&
  a.y + a.h > b.y;

function createGameState() {
  return {
    running: false,
    ended: false,
    score: 0,
    distanceScore: 0,
    world: 'digital',
    speed: 480,
    baseSpeed: 480,
    spawnTimer: 0,
    itemTimer: 0,
    elapsed: 0,
    shake: 0,
    flash: 0,

    player: {
      x: 180,
      y: GROUND_Y - 88,
      w: 58,
      h: 88,
      vy: 0,
      grounded: true,
      sliding: false,
      slideTimer: 0,
      frozenTimer: 0,
      slowTimer: 0,
      confuseTimer: 0,
      invincibleTimer: 0
    },

    obstacles: [],
    items: [],
    particles: [],
    labels: [],

    zombie: {
      active: false,
      x: -220,
      distance: 360,
      targetDistance: 360,
      danger: 0,
      calmTimer: 0
    }
  };
}

function resizeCanvas() {
  canvas.width = 1280;
  canvas.height = 720;
  ctx.setTransform(1, 0, 0, 1, 0, 0);
}


zenTimer > 0) return;

  if (player.grounded) {
    player.vy = -930;
    player.grounded = false;
    player.sliding = false;
    player.h = 88;

    addParticles(
      player.x + 25,
      player.y + player.h,
      '#ffffff',
      8
    );
  }
}

function slide() {
  if (!game?.running) return;

  const player = game.player;

  if (player.frozenTimer > 0 || !player.grounded) return;

  player.sliding = true;
  player.slideTimer = 0.65;
  player.h = 48;
  player.y = GROUND_Y - player.h;
}

function loop(timestamp) {
  if (!game?.running) return;

  if (!lastTime) {
    lastTime = timestamp;
  }

  const dt = Math.min(
    (timestamp - lastTime) / 1000,
    0.034
  );

  lastTime = timestamp;

  update(dt);
  draw();

  if (game.running) {
    animationId = requestAnimationFrame(loop);
  }
}

function update(dt) {
  const currentGame = game;
  const player = currentGame.player;

  currentGame.elapsed += dt;
  currentGame.flash = Math.max(0, currentGame.flash - dt);
  currentGame.shake = Math.max(0, currentGame.shake - dt);

  player.slideTimer = Math.max(0, player.slideTimer - dt);
  player.frozenTimer = Math.max(0, player.frozenTimer - dt);
  player.slowTimer = Math.max(0, player.slowTimer - dt);
  player.confuseTimer = Math.max(0, player.confuseTimer - dt);
  player.invincibleTimer = Math.max(
    0,
    player.invincibleTimer - dt
  );

  if (player.slideTimer === 0 && player.sliding) {
    player.sliding = false;
    player.h = 88;
    player.y = GROUND_Y - player.h;
  }

  if (!player.grounded) {
    player.vy += GRAVITY * dt;
    player.y += player.vy * dt;

    if (player.y + player.h >= GROUND_Y) {
      player.y = GROUND_Y - player.h;
      player.vy = 0;
      player.grounded = true;
    }
  }

  const speedMultiplier =
    player.slowTimer > 0 ? 0.48 : 1;

  currentGame.speed =
    currentGame.baseSpeed * speedMultiplier;

  currentGame.distanceScore += 115 * dt;
  currentGame.score += 115 * dt;

  if (
    currentGame.world === 'digital' &&
    currentGame.score >= REAL_WORLD_SCORE
  ) {
    currentGame.world = 'real';
    currentGame.flash = 1.2;

    showLabel(
      canvas.clientWidth / 2 - 100,
      170,
      '현실 세계로 탈출!',
      '#ffd166'
    );
  }

  currentGame.spawnTimer -= dt;
  currentGame.itemTimer -= dt;

  if (currentGame.spawnTimer <= 0) {
    spawnObstacle();
    currentGame.spawnTimer = random(1.15, 2.15);
  }

  if (currentGame.itemTimer <= 0) {
    spawnItemLine();
    currentGame.itemTimer = random(1.1, 1.85);
  }

  updateObjects(dt);
  updateZombie(dt);
  updateParticles(dt);
  updateLabels(dt);
  updateHud();

  if (currentGame.score >= TARGET_SCORE) {
    currentGame.score = TARGET_SCORE;
    updateHud();
    endGame(true);
  }
}
function spawnObstacle() {
  const digitalObstacles = [
    {
      type: 'popup',
      name: '팝업 광고',
      w: 78,
      h: 105,
      y: GROUND_Y - 105
    },
    {
      type: 'notify',
      name: '좋아요 테러',
      w: 95,
      h: 48,
      y: random(330, 430)
    },
    {
      type: 'wifi',
      name: '끊기는 와이파이',
      w: 130,
      h: 24,
      y: GROUND_Y - 24
    },
    {
      type: 'scroll',
      name: '무한 스크롤 블랙홀',
      w: 112,
      h: 30,
      y: GROUND_Y - 30
    },
    {
      type: 'charger',
      name: '충전선 덩굴',
      w: 42,
      h: 180,
      y: 260
    }
  ];

  const realObstacles = [
    {
      type: 'bed',
      name: '포근한 침대',
      w: 145,
      h: 72,
      y: GROUND_Y - 72
    },
    {
      type: 'noise',
      name: '소음 유발자',
      w: 74,
      h: 74,
      y: random(360, 465)
    },
    {
      type: 'fake',
      name: '게임 패드 함정',
      w: 72,
      h: 42,
      y: GROUND_Y - 42
    },
    {
      type: 'worksheet',
      name: '밀린 학습지',
      w: 80,
      h: 65,
      y: GROUND_Y - 65
    },
    {
      type: 'clock',
      name: '째깍거리는 시계',
      w: 62,
      h: 82,
      y: GROUND_Y - 82
    }
  ];

  const pool =
    game.world === 'digital'
      ? digitalObstacles
      : realObstacles;

  const source =
    pool[Math.floor(Math.random() * pool.length)];

  game.obstacles.push({
    type,
    x: canvas.width + 80 + i * 72,
    y:
      count >1
        ? 430 - Math.sin(i/Math.max(1, count -1)) * Math.PI) * 90 : random(390,500),
    w: 42,
    h: 42,
    collected: false,
    spin: random(0, Math.PI * 2)
  });

function spawnItemLine() {
  const count = Math.random() < 0.65 ? 4 : 1;
  const special =
    count === 1 && Math.random() < 0.45;

  for (let i = 0; i < count; i += 1) {
    let type = 'book';

    if (special) {
      type =
        Math.random() < 0.5
          ? 'drink'
          : 'chocolate';
    }

    if (Math.random() < 0.13) {
      type = 'phone';
    }

    game.items.push({
      type,
      x: canvas.clientWidth + 80 + i * 72,
      y:
        count > 1
          ? 430 -
            Math.sin(
              (i / Math.max(1, count - 1)) *
                Math.PI
            ) *
              90
          : random(390, 500),
      w: 42,
      h: 42,
      collected: false,
      spin: random(0, Math.PI * 2)
    });
  }
}

function updateObjects(dt) {
  const player = game.player;

  const playerBox = {
    x: player.x + 8,
    y: player.y + 5,
    w: player.w - 16,
    h: player.h - 8
  };

  for (const obstacle of game.obstacles) {
    obstacle.x -= game.speed * dt;
    obstacle.phase += dt * 5;

    const obstacleBox = {
      x: obstacle.x,
      y: obstacle.y,
      w: obstacle.w,
      h: obstacle.h
    };

    if (
      !obstacle.hit &&
      player.invincibleTimer <= 0 &&
      rectsOverlap(playerBox, obstacleBox)
    ) {
      obstacle.hit = true;
      hitObstacle(obstacle);
    }
  }

  for (const item of game.items) {
    item.x -= game.speed * dt;
    item.spin += dt * 5;

    const itemBox = {
      x: item.x,
      y: item.y,
      w: item.w,
      h: item.h
    };

    if (
      !item.collected &&
      rectsOverlap(playerBox, itemBox)
    ) {
      item.collected = true;
      collectItem(item);
    }
  }

  game.obstacles = game.obstacles.filter(
    obstacle => obstacle.x + obstacle.w > -100
  );

  game.items = game.items.filter(
    item =>
      !item.collected &&
      item.x + item.w > -100
  );
}

function hitObstacle(obstacle) {
  const player = game.player;

  player.invincibleTimer = 1.15;

  game.score = Math.max(
    0,
    game.score - 2200
  );

  game.shake = 0.45;
  game.flash = 0.28;

  summonZombie(115);

  showLabel(
    player.x,
    player.y - 26,
    '-2,200',
    '#ff5d8f'
  );

  switch (obstacle.type) {
    case 'popup':
      popupBlocker.classList.add('visible');

      setTimeout(() => {
        popupBlocker.classList.remove('visible');
      }, 1800);
      break;

    case 'wifi':
      player.slowTimer = 3.2;
      break;

    case 'scroll':
      player.frozenTimer = 1.2;
      summonZombie(155);
      break;

    case 'charger':
    case 'bed':
      player.frozenTimer = 1.7;
      break;

    case 'noise':
      player.confuseTimer = 3.5;
      break;

    case 'clock':
      game.baseSpeed = Math.min(
        680,
        game.baseSpeed + 35
      );
      break;

    default:
      break;
  }
}

function collectItem(item) {
  let points = 0;
  let color = '#ffffff';

  if (item.type === 'book') {
    points = 1800;
    color = '#ffe66d';
  } else if (item.type === 'drink') {
    points = 4200;
    color = '#63e6ff';
  } else if (item.type === 'chocolate') {
    points = 3500;
    color = '#ffb86c';
  } else if (item.type === 'phone') {
    points = -5200;
    color = '#ff5d8f';
    summonZombie(95);
  }

  game.score = clamp(
    game.score + points,
    0,
    TARGET_SCORE
  );

  showLabel(
    item.x,
    item.y - 10,
    `${points > 0 ? '+' : ''}${points.toLocaleString()}`,
    color
  );

  addParticles(
    item.x + item.w / 2,
    item.y + item.h / 2,
    color,
    12
  );
}

function summonZombie(amount) {
  const zombie = game.zombie;

  zombie.active = true;

  zombie.danger = clamp(
    zombie.danger + amount,
    0,
    340
  );

  zombie.targetDistance = clamp(
    360 - zombie.danger,
    38,
    360
  );

  zombie.calmTimer = 0;
}

function updateZombie(dt) {
  const zombie = game.zombie;

  if (!zombie.active) return;

  zombie.calmTimer += dt;

  if (zombie.calmTimer > 3.5) {
    zombie.danger = Math.max(
      0,
      zombie.danger - 28 * dt
    );

    zombie.targetDistance = clamp(
      360 - zombie.danger,
      38,
      360
    );
  }

  zombie.distance +=
    (zombie.targetDistance - zombie.distance) *
    dt *
    2.4;

  zombie.x =
    game.player.x - zombie.distance;

  if (zombie.distance <= 52) {
    endGame(false);
  }

  if (
    zombie.danger <= 1 &&
    zombie.distance > 340
  ) {
    zombie.active = false;
  }
}

function updateParticles(dt) {
  for (const particle of game.particles) {
    particle.life -= dt;
    particle.x += particle.vx * dt;
    particle.y += particle.vy * dt;
    particle.vy += 650 * dt;
  }

  game.particles = game.particles.filter(
    particle => particle.life > 0
  );
}

function addParticles(x, y, color, amount) {
  for (let i = 0; i < amount; i += 1) {
    game.particles.push({
      x,
      y,
      color,
      vx: random(-170, 170),
      vy: random(-300, -60),
      life: random(0.35, 0.8)
    });
  }
}

function showLabel(x, y, text, color) {
  game.labels.push({
    x,
    y,
    text,
    color,
    life: 1.05
  });
}

function updateLabels(dt) {
  for (const label of game.labels) {
    label.life -= dt;
    label.y -= 48 * dt;
  }

  game.labels = game.labels.filter(
    label => label.life > 0
  );
}
function drawObstacles() {
  for (const obstacle of game.obstacles) {
    ctx.save();

    ctx.translate(
      obstacle.x,
      obstacle.y
    );

    if (game.world === 'digital') {
      drawDigitalObstacle(obstacle);
    } else {
      drawRealObstacle(obstacle);
    }

    ctx.restore();
  }
}

function drawDigitalObstacle(obstacle) {
  ctx.shadowBlur = 14;
  ctx.shadowColor = '#00f5ff';

  if (obstacle.type === 'popup') {
    ctx.fillStyle = '#fbfbff';
    ctx.fillRect(
      0,
      0,
      obstacle.w,
      obstacle.h
    );

    ctx.fillStyle = '#ff2e88';
    ctx.fillRect(
      0,
      0,
      obstacle.w,
      20
    );

    ctx.fillStyle = '#111111';
    ctx.font = 'bold 11px sans-serif';
    ctx.fillText('광고!', 8, 15);
    ctx.fillText('CLICK', 17, 66);
  } else if (
    obstacle.type === 'notify'
  ) {
    ctx.fillStyle = '#8a2be2';

    roundRect(
      ctx,
      0,
      0,
      obstacle.w,
      obstacle.h,
      12,
      true
    );

    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 11px sans-serif';
    ctx.fillText('알림 99+', 12, 29);
  } else if (
    obstacle.type === 'wifi'
  ) {
    ctx.fillStyle = '#00a8cc';

    ctx.fillRect(
      0,
      0,
      obstacle.w,
      obstacle.h
    );

    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 12px sans-serif';

    ctx.fillText(
      'BUFFERING...',
      12,
      17
    );
  } else if (
    obstacle.type === 'scroll'
  ) {
    ctx.fillStyle = '#090018';

    ctx.beginPath();

    ctx.ellipse(
      obstacle.w / 2,
      obstacle.h / 2,
      obstacle.w / 2,
      obstacle.h / 2,
      0,
      0,
      Math.PI * 2
    );

    ctx.fill();

    ctx.strokeStyle = '#ff00ae';
    ctx.lineWidth = 4;

    ctx.beginPath();

    ctx.arc(
      obstacle.w / 2,
      obstacle.h / 2,
      18 +
        Math.sin(obstacle.phase) * 7,
      0,
      Math.PI * 2
    );

    ctx.stroke();
  } else {
    ctx.strokeStyle = '#7cf7ff';
    ctx.lineWidth = 9;

    ctx.beginPath();

    ctx.moveTo(
      obstacle.w / 2,
      0
    );

    ctx.bezierCurveTo(
      -5,
      60,
      obstacle.w + 20,
      110,
      obstacle.w / 2,
      obstacle.h
    );

    ctx.stroke();
  }

  ctx.shadowBlur = 0;
}

function drawRealObstacle(obstacle) {
  if (obstacle.type === 'bed') {
    ctx.fillStyle = '#cdb4db';

    ctx.fillRect(
      0,
      18,
      obstacle.w,
      obstacle.h - 18
    );

    ctx.fillStyle = '#ffffff';
    ctx.fillRect(8, 0, 54, 28);

    ctx.fillStyle = '#8d6e63';

    ctx.fillRect(
      0,
      obstacle.h - 8,
      obstacle.w,
      8
    );
  } else if (
    obstacle.type === 'noise'
  ) {
    ctx.fillStyle = '#495057';
    ctx.fillRect(8, 10, 42, 54);

    ctx.strokeStyle = '#ef476f';
    ctx.lineWidth = 5;

    for (
      let radius = 18;
      radius <= 42;
      radius += 12
    ) {
      ctx.beginPath();

      ctx.arc(
        31,
        37,
        radius,
        -0.8,
        0.8
      );

      ctx.stroke();
    }
  } else if (
    obstacle.type === 'fake'
  ) {
    ctx.fillStyle = '#444444';

    roundRect(
      ctx,
      0,
      6,
      obstacle.w,
      obstacle.h - 6,
      13,
      true
    );

    ctx.fillStyle = '#ff595e';
    ctx.fillRect(13, 17, 7, 7);

    ctx.fillStyle = '#8ac926';

    ctx.fillRect(
      obstacle.w - 21,
      14,
      7,
      7
    );
  } else if (
    obstacle.type === 'worksheet'
  ) {
    ctx.fillStyle = '#ffffff';

    ctx.fillRect(
      0,
      0,
      obstacle.w,
      obstacle.h
    );

    ctx.strokeStyle = '#748ffc';

    for (
      let y = 14;
      y < obstacle.h;
      y += 12
    ) {
      ctx.beginPath();
      ctx.moveTo(7, y);
      ctx.lineTo(obstacle.w - 7, y);
      ctx.stroke();
    }
  } else {
    ctx.fillStyle = '#f4a261';

    ctx.beginPath();

    ctx.arc(
      obstacle.w / 2,
      obstacle.w / 2,
      obstacle.w / 2,
      0,
      Math.PI * 2
    );

    ctx.fill();

    ctx.strokeStyle = '#5b3a29';
    ctx.lineWidth = 4;

    ctx.beginPath();

    ctx.moveTo(
      obstacle.w / 2,
      obstacle.w / 2
    );

    ctx.lineTo(
      obstacle.w / 2,
      12
    );

    ctx.stroke();

    ctx.beginPath();

    ctx.moveTo(
      obstacle.w / 2,
      obstacle.w / 2
    );

    ctx.lineTo(
      obstacle.w - 13,
      obstacle.w / 2
    );

    ctx.stroke();
  }
}

function drawParticles() {
  for (const particle of game.particles) {
    ctx.globalAlpha = clamp(
      particle.life * 2,
      0,
      1
    );

    ctx.fillStyle = particle.color;

    ctx.fillRect(
      particle.x,
      particle.y,
      5,
      5
    );
  }

  ctx.globalAlpha = 1;
}

function drawLabels() {
  ctx.font = 'bold 20px sans-serif';
  ctx.textAlign = 'center';

  for (const label of game.labels) {
    ctx.globalAlpha = clamp(
      label.life,
      0,
      1
    );

    ctx.fillStyle = label.color;

    ctx.fillText(
      label.text,
      label.x,
      label.y
    );
  }

  ctx.globalAlpha = 1;
  ctx.textAlign = 'left';
}

function roundRect(
  context,
  x,
  y,
  width,
  height,
  radius,
  fill
) {
  const safeRadius = Math.min(
    radius,
    width / 2,
    height / 2
  );

  context.beginPath();

  context.moveTo(
    x + safeRadius,
    y
  );

  context.arcTo(
    x + width,
    y,
    x + width,
    y + height,
    safeRadius
  );

  context.arcTo(
    x + width,
    y + height,
    x,
    y + height,
    safeRadius
  );

  context.arcTo(
    x,
    y + height,
    x,
    y,
    safeRadius
  );

  context.arcTo(
    x,
    y,
    x + width,
    y,
    safeRadius
  );

  if (fill) {
    context.fill();
  }
}

startButton.addEventListener(
  'click',
  startGame
);

restartButton.addEventListener(
  'click',
  restartGame
);

jumpButton.addEventListener(
  'pointerdown',
  event => {
    event.preventDefault();
    jump();
  }
);

slideButton.addEventListener(
  'pointerdown',
  event => {
    event.preventDefault();
    slide();
  }
);

window.addEventListener(
  'keydown',
  event => {
    if (
      [
        'Space',
        'ArrowUp',
        'ArrowDown'
      ].includes(event.code)
    ) {
      event.preventDefault();
    }

    if (
      event.code === 'Space' ||
      event.code === 'ArrowUp'
    ) {
      jump();
    }

    if (event.code === 'ArrowDown') {
      slide();
    }

    if (event.code === 'KeyR') {
      restartGame();
    }
  }
);

window.addEventListener(
  'resize',
  () => {
    resizeCanvas();
    draw();
  }
);

resizeCanvas();
resetGame();
