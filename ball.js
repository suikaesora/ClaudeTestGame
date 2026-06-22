const canvas = document.getElementById('canvas');
const ctx = canvas.getContext('2d');

canvas.width = 600;
canvas.height = 400;

const BALL_RADIUS        = 20;
const BALL_SPEED         = 5;
const PULSE_RADIUS       = 126;
const PULSE_OFFSET       = 81;
const EXPLOSION_RADIUS   = 90;
const EXPLOSION_DISPLAY  = 200;
const ALLY_FUSE_MS       = 1000;
const SPAWN_PREVIEW_MS   = 500;

function createBall(x, y, dx, dy, faction = 'enemy') {
  return { x, y, dx, dy, radius: BALL_RADIUS, faction };
}

function spawnBallFromWall(wall) {
  let x, y, angle;
  const r = BALL_RADIUS;
  const offset = r + 4;

  if (wall === 'left') {
    x = offset;
    y = r + Math.random() * (canvas.height - r * 2);
    angle = (Math.random() - 0.5) * Math.PI + 0;
  } else if (wall === 'right') {
    x = canvas.width - offset;
    y = r + Math.random() * (canvas.height - r * 2);
    angle = (Math.random() - 0.5) * Math.PI + Math.PI;
  } else if (wall === 'top') {
    x = r + Math.random() * (canvas.width - r * 2);
    y = offset;
    angle = (Math.random() - 0.5) * Math.PI + Math.PI / 2;
  } else {
    x = r + Math.random() * (canvas.width - r * 2);
    y = canvas.height - offset;
    angle = (Math.random() - 0.5) * Math.PI - Math.PI / 2;
  }

  return createBall(x, y, Math.cos(angle) * BALL_SPEED, Math.sin(angle) * BALL_SPEED);
}

const WALLS = ['left', 'right', 'top', 'bottom'];

const balls = [
  createBall(canvas.width / 2, canvas.height / 2, 4, 3)
];
let originalBall = balls[0];

const player = {
  x: 80,
  y: 80,
  radius: 18,
  targetX: 80,
  targetY: 80,
  speed: 0.06,
  alive: true,
  angle: 0
};

const pulse = {
  active: false,
  endTime: 0,
  x: 0,
  y: 0
};

const explosions    = [];
const pendingSpawns = [];

let lastTime     = 0;
let gameOver     = false;
let gameOverTime = 0;
let gameStarted  = false;
let deathCause   = '';
let newBest      = false;

const timerEl    = document.getElementById('timer');
const bestTimeEl = document.getElementById('best-time');
let startTime = 0;
let elapsedMs = 0;
let bestMs    = 0;

function updateTimer() {
  if (!gameStarted || gameOver) return;
  elapsedMs = performance.now() - startTime;
  const totalSeconds = Math.floor(elapsedMs / 1000);
  const minutes = Math.floor(totalSeconds / 60).toString().padStart(2, '0');
  const seconds = (totalSeconds % 60).toString().padStart(2, '0');
  const centiseconds = Math.floor((elapsedMs % 1000) / 10).toString().padStart(2, '0');
  timerEl.textContent = `${minutes}:${seconds}:${centiseconds}`;
}

canvas.addEventListener('mousemove', (e) => {
  const rect = canvas.getBoundingClientRect();
  player.targetX = e.clientX - rect.left;
  player.targetY = e.clientY - rect.top;
});

canvas.addEventListener('mousedown', (e) => {
  if (e.button !== 0) return;
  if (!gameStarted) {
    gameStarted = true;
    startTime   = performance.now();
    return;
  }
  if (gameOver || !player.alive) return;
  // mousedown 時点の座標が「ユーザーが見ていた描画済み座標」と完全一致
  pulse.x       = player.x + Math.cos(player.angle) * PULSE_OFFSET;
  pulse.y       = player.y + Math.sin(player.angle) * PULSE_OFFSET;
  pulse.active  = true;
  pulse.endTime = performance.now() + 100;
  for (const b of balls) {
    if (b.faction === 'enemy' && b !== originalBall) {
      const dx = b.x - pulse.x;
      const dy = b.y - pulse.y;
      if (Math.sqrt(dx * dx + dy * dy) < PULSE_RADIUS + b.radius) {
        b.faction  = 'ally';
        b.allyTime = performance.now();
      }
    }
  }
});

function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}

function drawEnemyBallShape(b) {
  const isOriginal = b === originalBall;
  ctx.beginPath();
  ctx.arc(b.x, b.y, b.radius, 0, Math.PI * 2);
  const gradient = ctx.createRadialGradient(
    b.x - b.radius * 0.3, b.y - b.radius * 0.3, 2,
    b.x, b.y, b.radius
  );
  if (isOriginal) {
    gradient.addColorStop(0, '#ffe066');
    gradient.addColorStop(1, '#e6a000');
  } else {
    gradient.addColorStop(0, '#ff8fa3');
    gradient.addColorStop(1, '#e94560');
  }
  ctx.fillStyle = gradient;
  ctx.fill();
  ctx.closePath();
}

function drawAllyBallShape(b) {
  ctx.beginPath();
  ctx.arc(b.x, b.y, b.radius, 0, Math.PI * 2);
  const gradient = ctx.createRadialGradient(
    b.x - b.radius * 0.3, b.y - b.radius * 0.3, 2,
    b.x, b.y, b.radius
  );
  gradient.addColorStop(0, '#8ab4f8');
  gradient.addColorStop(1, '#1a56db');
  ctx.fillStyle = gradient;
  ctx.fill();
  ctx.closePath();
}

function drawPulse() {
  ctx.beginPath();
  ctx.arc(pulse.x, pulse.y, PULSE_RADIUS, 0, Math.PI * 2);
  ctx.strokeStyle = 'rgba(144,238,144,0.85)';
  ctx.lineWidth = 2;
  ctx.stroke();
}

function drawPendingSpawn(ps) {
  ctx.beginPath();
  ctx.arc(ps.x, ps.y, BALL_RADIUS, 0, Math.PI * 2);
  ctx.setLineDash([4, 4]);
  ctx.strokeStyle = 'rgba(255, 200, 50, 0.8)';
  ctx.lineWidth = 2;
  ctx.stroke();
  ctx.setLineDash([]);
}

function drawExplosion(exp) {
  ctx.beginPath();
  ctx.arc(exp.x, exp.y, EXPLOSION_RADIUS, 0, Math.PI * 2);
  ctx.strokeStyle = 'rgba(100,160,255,0.9)';
  ctx.lineWidth = 3;
  ctx.stroke();
}

function drawPlayer() {
  ctx.beginPath();
  ctx.arc(player.x, player.y, player.radius, 0, Math.PI * 2);
  const gradient = ctx.createRadialGradient(
    player.x - player.radius * 0.3, player.y - player.radius * 0.3, 2,
    player.x, player.y, player.radius
  );
  gradient.addColorStop(0, '#90ee90');
  gradient.addColorStop(1, '#228b22');
  ctx.fillStyle = gradient;
  ctx.fill();
  ctx.closePath();
}

function resetGame() {
  balls.length = 0;
  const newBall = createBall(canvas.width / 2, canvas.height / 2, 4, 3);
  balls.push(newBall);
  originalBall = newBall;

  pendingSpawns.length = 0;
  explosions.length    = 0;

  player.x       = 80;
  player.y       = 80;
  player.targetX = 80;
  player.targetY = 80;
  player.alive   = true;
  player.angle   = 0;

  pulse.active = false;

  gameOver     = false;
  gameOverTime = 0;
  deathCause   = '';
  newBest      = false;
  startTime    = performance.now();
  elapsedMs    = 0;
  timerEl.textContent = '00:00:00';
}

function drawClickToStart() {
  drawEnemyBallShape(originalBall);

  ctx.fillStyle = 'rgba(0, 0, 0, 0.5)';
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  ctx.font = 'bold 36px sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillStyle = 'rgba(0,0,0,0.4)';
  ctx.fillText('CLICK TO START', canvas.width / 2 + 2, canvas.height / 2 + 2);
  ctx.fillStyle = '#90ee90';
  ctx.fillText('CLICK TO START', canvas.width / 2, canvas.height / 2);
}

function drawGameOver() {
  ctx.fillStyle = 'rgba(0, 0, 0, 0.55)';
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  ctx.font = 'bold 64px sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillStyle = 'rgba(0, 0, 0, 0.5)';
  ctx.fillText('GAME OVER', canvas.width / 2 + 3, canvas.height / 2 + 3);
  ctx.fillStyle = '#e94560';
  ctx.fillText('GAME OVER', canvas.width / 2, canvas.height / 2);

  ctx.font = '22px sans-serif';
  ctx.fillStyle = 'rgba(255,255,255,0.75)';
  ctx.fillText(`${deathCause}にやられた`, canvas.width / 2, canvas.height / 2 + 52);

  if (newBest) {
    const blink = Math.floor(performance.now() / 200) % 2 === 0;
    if (blink) {
      ctx.font = 'bold 28px sans-serif';
      ctx.fillStyle = 'rgba(0,0,0,0.5)';
      ctx.fillText('★ NEW BEST ★', canvas.width / 2 + 2, canvas.height / 2 - 54);
      ctx.fillStyle = '#ffd700';
      ctx.fillText('★ NEW BEST ★', canvas.width / 2, canvas.height / 2 - 56);
    }
  }
}

function collidesWithPlayer(b) {
  const dx = b.x - player.x;
  const dy = b.y - player.y;
  return Math.sqrt(dx * dx + dy * dy) < b.radius + player.radius;
}

function updateBall(b, delta) {
  let spawned = null;
  let hitWall = false;

  if (b.x + b.radius >= canvas.width || b.x - b.radius <= 0) {
    b.dx *= -1;
    hitWall = true;
  }
  if (b.y + b.radius >= canvas.height || b.y - b.radius <= 0) {
    b.dy *= -1;
    hitWall = true;
  }

  if (hitWall) {
    spawned = spawnBallFromWall(WALLS[Math.floor(Math.random() * WALLS.length)]);
  }

  if (b === originalBall) {
    const accel = Math.pow(1.001, delta);
    b.dx *= accel;
    b.dy *= accel;
    const spd = Math.sqrt(b.dx * b.dx + b.dy * b.dy);
    if (spd > 18) { b.dx = b.dx / spd * 18; b.dy = b.dy / spd * 18; }
  }

  b.x += b.dx * delta;
  b.y += b.dy * delta;

  return spawned;
}

function update(timestamp) {
  const delta = lastTime ? Math.min((timestamp - lastTime) / (1000 / 60), 3) : 1;
  lastTime = timestamp;

  ctx.clearRect(0, 0, canvas.width, canvas.height);

  if (!gameStarted) {
    drawClickToStart();
    requestAnimationFrame(update);
    return;
  }

  updateTimer();

  const now = performance.now();

  // 味方ボールの時限爆発チェック（移動より前）
  const toRemove = new Set();
  for (const b of balls) {
    if (b.faction !== 'ally' || !b.allyTime) continue;
    if (now - b.allyTime < ALLY_FUSE_MS) continue;

    explosions.push({ x: b.x, y: b.y, endTime: now + EXPLOSION_DISPLAY });
    toRemove.add(b);

    for (const other of balls) {
      if (other === b || other === originalBall || other.faction !== 'enemy') continue;
      const dx = other.x - b.x;
      const dy = other.y - b.y;
      if (Math.sqrt(dx * dx + dy * dy) < EXPLOSION_RADIUS + other.radius) {
        toRemove.add(other);
      }
    }
  }
  if (toRemove.size > 0) {
    for (let i = balls.length - 1; i >= 0; i--) {
      if (toRemove.has(balls[i])) balls.splice(i, 1);
    }
  }

  // ボール移動・描画
  for (const b of balls) {
    const spawned = updateBall(b, delta);
    if (spawned && b === originalBall) {
      spawned.spawnTime = now + SPAWN_PREVIEW_MS;
      pendingSpawns.push(spawned);
    }
    if (b.faction === 'ally') {
      drawAllyBallShape(b);
    } else {
      drawEnemyBallShape(b);
    }
  }

  // 予測円の描画・時間経過後に実体化
  for (let i = pendingSpawns.length - 1; i >= 0; i--) {
    const ps = pendingSpawns[i];
    if (now >= ps.spawnTime) {
      balls.push(ps);
      pendingSpawns.splice(i, 1);
    } else {
      drawPendingSpawn(ps);
    }
  }

  if (!gameOver) {
    const clampedTargetX = clamp(player.targetX, player.radius, canvas.width - player.radius);
    const clampedTargetY = clamp(player.targetY, player.radius, canvas.height - player.radius);

    const moveX = clampedTargetX - player.x;
    const moveY = clampedTargetY - player.y;
    const moveDist = Math.sqrt(moveX * moveX + moveY * moveY);
    if (moveDist > 0.5) player.angle = Math.atan2(moveY, moveX);
    player.x += moveX * player.speed * delta;
    player.y += moveY * player.speed * delta;

    if (player.alive) {
      drawPlayer();

      if (pulse.active) {
        if (now < pulse.endTime) {
          drawPulse();
          // 表示中の毎フレーム判定（タイミングのズレをカバー）
          for (const b of balls) {
            if (b.faction === 'enemy' && b !== originalBall) {
              const dx = b.x - pulse.x;
              const dy = b.y - pulse.y;
              if (Math.sqrt(dx * dx + dy * dy) < PULSE_RADIUS + b.radius) {
                b.faction  = 'ally';
                b.allyTime = now;
              }
            }
          }
        } else {
          pulse.active = false;
        }
      }

      for (let i = explosions.length - 1; i >= 0; i--) {
        if (now < explosions[i].endTime) {
          drawExplosion(explosions[i]);
        } else {
          explosions.splice(i, 1);
        }
      }

      const killer = balls.find(b => b.faction === 'enemy' && collidesWithPlayer(b));
      if (killer) {
        player.alive = false;
        gameOver     = true;
        gameOverTime = performance.now();
        deathCause   = killer === originalBall ? '黄色のボール' : '赤色のボール';
        if (elapsedMs > bestMs) {
          bestMs  = elapsedMs;
          newBest = true;
          const tot = Math.floor(bestMs / 1000);
          const m   = Math.floor(tot / 60).toString().padStart(2, '0');
          const s   = (tot % 60).toString().padStart(2, '0');
          const cs  = Math.floor((bestMs % 1000) / 10).toString().padStart(2, '0');
          bestTimeEl.textContent = `${m}:${s}:${cs}`;
        }
      }
    }
  } else {
    drawGameOver();
    if (performance.now() - gameOverTime >= 2000) resetGame();
  }

  requestAnimationFrame(update);
}

update();
