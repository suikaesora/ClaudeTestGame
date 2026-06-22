# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Running the game

Open `index.html` directly in a browser — no build step or server required. All code runs client-side.

## Architecture

Three files, no dependencies or bundler:

- `index.html` — single `<canvas id="canvas">` element; loads `style.css` and `ball.js`
- `style.css` — dark navy theme; centers the canvas on the page with flexbox
- `ball.js` — all game logic in one file

### Game loop (`ball.js`)

`requestAnimationFrame` drives a single `update()` loop that:
1. Clears the canvas
2. Draws and moves `ball` (bounces off all four walls by inverting `dx`/`dy`)
3. Lerps `player` toward the clamped cursor target each frame (`speed: 0.06`)
4. Checks circle-circle collision via Euclidean distance
5. On collision: sets `gameOver = true`, which switches rendering to `drawGameOver()` overlay

### Key objects

| Object | Role |
|--------|------|
| `ball` | Red bouncing ball — `x`, `y`, `dx`, `dy`, `radius` |
| `player` | Green cursor-follower — `x`, `y`, `targetX`, `targetY`, `speed`, `alive` |

### Collision detection

`checkCollision()` returns true when `distance(ball.center, player.center) < ball.radius + player.radius`.

### Canvas coordinate system

Canvas is fixed at 600×400 px. Player position is clamped to `[radius, dimension - radius]` to keep it fully inside the canvas.
