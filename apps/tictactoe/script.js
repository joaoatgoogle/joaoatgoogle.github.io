import * as aistudio from './aistudio.js';

const canvasContainerElement = document.getElementById('canvasContainer');
const canvasElement = document.getElementById('canvas');
const canvas = canvasElement.getContext('2d');

const gridState = ['', '', '', '', '', '', '', '', ''];

// These coordinates are computed in draw().
// They are stored here to make clicks easier to dispatch to the right
// grid position.
const gridCoordinates = [
  [0, 0, 0], [0, 0, 0], [0, 0, 0],
  [0, 0, 0], [0, 0, 0], [0, 0, 0],
  [0, 0, 0], [0, 0, 0], [0, 0, 0],
];

const X_TURN = 'x-turn';
const O_TURN = 'o-turn';
const OVER = 'over';

let gameState = X_TURN;

let emptyPositions = 9;

const WIN_POSITIONS = [
  [[0, 0], [0, 1], [0, 2]],
  [[1, 0], [1, 1], [1, 2]],
  [[2, 0], [2, 1], [2, 2]],

  [[0, 0], [1, 0], [2, 0]],
  [[0, 1], [1, 1], [2, 1]],
  [[0, 2], [1, 2], [2, 2]],

  [[0, 0], [1, 1], [2, 2]],
  [[2, 0], [1, 1], [0, 2]],
];

let winPosition = undefined;

let autoplay = false;

function onRestart() {
  gridState.fill('');
  gameState = X_TURN;
  emptyPositions = 9;
  winPosition = undefined;
  requestDraw(draw);
  aistudio.clearChat();
  aistudio.chat('Welcome to Tic Tac Toe!');
}

function onPlayGemini() {
  if (gameState !== X_TURN && gameState !== O_TURN) {
    return;
  }
  aistudio.clearChat();
  const next = gameState === X_TURN ? 'X' : 'O';
  const userText = `Analyze the game of Tic Tac Toe carefully. Play the next turn as ${next}.`;
  const imageDataURL = canvasElement.toDataURL();
  aistudio.generateContent({userText, imageDataURL});
}

function onAutoplay() {
  autoplay = !autoplay;
  aistudio.chat(`Autoplay is now ${autoplay ? 'enabled' : 'disabled'}.`);
}

function isWinPosition([[r1, c1], [r2, c2], [r3, c3]], player) {
  return gridState[r1 * 3 + c1] === player &&
         gridState[r2 * 3 + c2] === player &&
         gridState[r3 * 3 + c3] === player;
}

function getWinPosition(player) {
  return WIN_POSITIONS.find(p => isWinPosition(p, player));
}

function isInCurrentWinPosition(row, column) {
  return winPosition && winPosition.some(([r, c]) => r === row && c === column);
}

function drawCross(x, y, size) {
  // Material Blue A200.
  canvas.strokeStyle = '#448AFF';

  const thickness = size / 3.6;
  canvas.lineWidth = thickness;
  canvas.lineJoin = 'round';

  canvas.beginPath();
  canvas.moveTo(x - thickness, y - thickness);
  canvas.lineTo(x + thickness, y + thickness);
  canvas.closePath();
  canvas.stroke();

  canvas.beginPath();
  canvas.moveTo(x - thickness, y + thickness);
  canvas.lineTo(x + thickness, y - thickness);
  canvas.closePath();
  canvas.stroke();
}

function drawCircle(x, y, size, highlightBackground) {
  // Material Red A200.
  canvas.fillStyle = '#FF5252';

  canvas.beginPath();
  canvas.arc(x, y, size / 2.2, 0, 2 * Math.PI);
  canvas.closePath();
  canvas.fill();

  if (highlightBackground) {
    canvas.globalCompositeOperation = 'source-over';
    // Material Amber 200
    canvas.fillStyle = '#FFE082';
  } else {
    canvas.globalCompositeOperation = 'destination-out';
  }

  canvas.beginPath();
  canvas.arc(x, y, size / 5, 0, 2 * Math.PI);
  canvas.closePath();
  canvas.fill();

  canvas.globalCompositeOperation = 'source-over';
}

function draw() {
  const width = canvasElement.width;
  const height = canvasElement.height;

  const smallest = Math.min(width, height);

  // "size" is the size of the grid.
  // We take the "smallest" dimension of the viewport and split it into 16.
  // parts. Each inner square takes 4 parts (12 total), and each line around
  // that takes 1 part (4 total).
  const gridSize = smallest;
  const thickness = (1 / 16) * smallest;

  const offx = (width - smallest) / 2;
  const offy = (height - smallest) / 2;

  canvas.fillStyle = '#ccc';
  canvas.beginPath();
  canvas.roundRect(offx, offy, gridSize, gridSize, thickness);
  canvas.closePath();
  canvas.fill();

  for (let row = 0; row < 3; row++) {
    for (let column = 0; column < 3; column++) {
      const x = offx + thickness + column * 5 * thickness;
      const y = offy + thickness + row * 5 * thickness;
      const size = 4 * thickness;
      const radius = thickness / 2;

      gridCoordinates[row * 3 + column][0] = x;
      gridCoordinates[row * 3 + column][1] = y;
      gridCoordinates[row * 3 + column][2] = size;

      if (isInCurrentWinPosition(row, column)) {
        canvas.globalCompositeOperation = 'source-over';
        // Material Amber 200
        canvas.fillStyle = '#FFE082';
      } else {
        canvas.globalCompositeOperation = 'destination-out';
      }

      canvas.beginPath();
      canvas.roundRect(x, y, size, size, radius);
      canvas.closePath();
      canvas.fill();
    }
  }

  canvas.globalCompositeOperation = 'source-over';

  for (let row = 0; row < 3; row++) {
    for (let column = 0; column < 3; column++) {
      const state = gridState[row * 3 + column];
      const x = offx + thickness + column * 5 * thickness + 2 * thickness;
      const y = offy + thickness + row * 5 * thickness + 2 * thickness;
      if (state === 'x') {
        drawCross(x, y, 3 * thickness);
      } else if (state === 'o') {
        const highlightBackground = isInCurrentWinPosition(row, column);
        drawCircle(x, y, 3 * thickness, highlightBackground);
      }
    }
  }
}

function requestDraw() {
  requestAnimationFrame(draw);
}

function onResize() {
  const rect = canvasContainerElement.getBoundingClientRect();
  const size = Math.min(rect.width, rect.height, 512);
  canvasElement.style.width = `${size}px`;
  canvasElement.style.height = `${size}px`;
  canvasElement.width = size * devicePixelRatio;
  canvasElement.height = size * devicePixelRatio;
  requestDraw();
}

function play(row, column) {
  if (row < 0 || row > 2 || column < 0 || column > 2) {
    return false;
  }

  const index = row * 3 + column;

  if (gridState[index] !== '') {
    // This position is already taken.
    return false;
  }

  if (gameState === X_TURN) {
    gridState[index] = 'x';
    winPosition = getWinPosition('x');
    gameState = winPosition ? OVER : O_TURN;
    if (winPosition) {
      aistudio.chat('X wins!');
    }
  } else {
    gridState[index] = 'o';
    winPosition = getWinPosition('o');
    gameState = winPosition ? OVER : X_TURN;
    if (winPosition) {
      aistudio.chat('O wins!');
    }
  }

  emptyPositions--;
  if (emptyPositions === 0 && gameState !== OVER) {
    gameState == OVER;
    aistudio.chat(`It's a draw!`);
  }

  requestDraw();

  return true;
}

function onClick(event) {
  if (gameState !== X_TURN && gameState !== O_TURN) {
    return;
  }

  const x = event.offsetX * devicePixelRatio;
  const y = event.offsetY * devicePixelRatio;

  for (let row = 0; row < 3; row++) {
    for (let column = 0; column < 3; column++) {
      const index = row * 3 + column;
      const [cx, cy, size] = gridCoordinates[index];
      if (x >= cx && x <= cx + size && y >= cy && y <= cy + size) {
        // Clicking inside this grid position.
        const isValid = play(row, column);

        // Make an autoplay if enabled and there are positions left.
        if (isValid && autoplay && (gameState === X_TURN || gameState == O_TURN)) {
          // Wait for requestAnimationFrame() so that the screenshot includes
          // changes from the play() above.
          requestAnimationFrame(onPlayGemini);
        }

        return;
      }
    }
  }
}

function playCallback({row, column}) {
  const valid = play(row - 1, column - 1);
  if (!valid) {
    aistudio.chat('Invalid move!');
  }
}

function screenshotCallback() {
  return canvasElement.toDataURL();
}

const SYSTEM_INSTRUCTIONS = 'You are a passionate gamer and love puzzles. Give playful answers and use emojis. When playing a game, analyze it carefully and make the best plays to win.';

const FUNCTION_DECLARATIONS = [
  {
    'name': 'play',
    'description': 'Places the next X or O in a game of Tic Tac Toe. The first to play is always X. The cells are identified by row and column numbers, from 1 to 3.',
    'parameters': {
      'type': 'object',
      'properties': {
        'row': {
          'type': 'integer',
          'description': 'The row of the cell to make a move on. Valid values: 1, 2 or 3',
          'minimum': 1,
          'maximum': 3,
        },
        'column': {
          'type': 'integer',
          'description': 'The column of the cell to make a move on. Valid values: 1, 2 or 3',
          'minimum': 1,
          'maximum': 3,
        },
      },
    },
    'callback': playCallback,
  },
];

async function init() {
  window.addEventListener('resize', onResize);
  canvasElement.addEventListener('click', onClick);

  document.getElementById('play').addEventListener('click', onPlayGemini);
  document.getElementById('autoplay').addEventListener('click', onAutoplay);
  document.getElementById('restart').addEventListener('click', onRestart);

  onResize();
  requestAnimationFrame(onResize);

  await aistudio.init({
    screenshotCallback,
    systemInstructions: SYSTEM_INSTRUCTIONS,
    functionDeclarations: FUNCTION_DECLARATIONS,
  });

  onRestart();

  // For debugging and iterative development:
  window.aistudio = aistudio;
}

init();
