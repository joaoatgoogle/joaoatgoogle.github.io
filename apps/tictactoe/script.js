const canvasElement = document.getElementById('canvas');
const canvas = canvasElement.getContext('2d');

const textElement = document.getElementById('text');
const restartElement = document.getElementById('restart');

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

const X = '<span style="color: #448AFF; font-weight: bold">x</span>';
const O = '<span style="color: #FF5252; font-weight: bold">o</span>';
const X_TO_PLAY = `Next turn: ${X}`;
const O_TO_PLAY = `Next turn: ${O}`;
const X_WIN = `${X} wins!`;
const O_WIN = `${O} wins!`;
const DRAW = `It's a draw!`;

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

let aistudioOrigin = '';

function onRestart() {
  setText(X_TO_PLAY);
  gridState.fill('');
  gameState = X_TURN;
  emptyPositions = 9;
  winPosition = undefined;
  requestDraw(draw);
}

function isWinPosition([[r1, c1], [r2, c2], [r3, c3]], player) {
  return gridState[r1 * 3 + c1] === player &&
         gridState[r2 * 3 + c2] === player &&
         gridState[r3 * 3 + c3] === player;
}

function getWinPosition(player) {
  return WIN_POSITIONS.find(p => isWinPosition(p, player));
}

function isInCurrentWinPosition(row, col) {
  return winPosition && winPosition.some(([r, c]) => r === row && c === col);
}

function setText(text) {
  textElement.innerHTML = text;
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
  // We take the "smallest" dimension of the viewport and split it into 18
  // parts. Each inner square takes 4 parts (12 total), and each line around
  // that takes 1 part (4 total), plus 2 parts on the sides for padding.
  // We also add an extra level of padding at the bottom, to show the game
  // state.
  const size = (16 / 20) * smallest;
  const thickness = (1 / 20) * smallest;

  const offx = (width - size) / 2;
  const offy = (height - size) / 2 - thickness;

  canvas.fillStyle = '#ccc';
  canvas.beginPath();
  canvas.roundRect(offx, offy, size, size, thickness);
  canvas.closePath();
  canvas.fill();

  for (let row = 0; row < 3; row++) {
    for (let col = 0; col < 3; col++) {
      const x = offx + thickness + col * 5 * thickness;
      const y = offy + thickness + row * 5 * thickness;
      const size = 4 * thickness;
      const radius = thickness / 2;

      gridCoordinates[row * 3 + col][0] = x;
      gridCoordinates[row * 3 + col][1] = y;
      gridCoordinates[row * 3 + col][2] = size;

      if (isInCurrentWinPosition(row, col)) {
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
    for (let col = 0; col < 3; col++) {
      const state = gridState[row * 3 + col];
      const x = offx + thickness + col * 5 * thickness + 2 * thickness;
      const y = offy + thickness + row * 5 * thickness + 2 * thickness;
      if (state === 'x') {
        drawCross(x, y, 3 * thickness);
      } else if (state === 'o') {
        const highlightBackground = isInCurrentWinPosition(row, col);
        drawCircle(x, y, 3 * thickness, highlightBackground);
      }
    }
  }

  let fontHeight = Math.floor(thickness);
  const textTop = Math.floor(offy + size + fontHeight - thickness / 2);
  const textLeft = Math.floor(offx + thickness);
  const textRight = Math.floor(width - (offx + size - thickness));

  textElement.style.fontSize = `${fontHeight}px`;
  textElement.style.top = `${textTop}px`;
  textElement.style.left = `${textLeft}px`;

  fontHeight = Math.floor(fontHeight * 0.8);
  const padding = Math.floor(fontHeight * 0.2);
  restartElement.style.fontSize = `${fontHeight}px`;
  restartElement.style.padding = `${padding}px ${padding * 2}px`;
  restartElement.style.top = `${textTop}px`;
  restartElement.style.right = `${textRight}px`;
}

function requestDraw() {
  requestAnimationFrame(draw);
}

function onResize() {
  canvasElement.width = window.innerWidth;
  canvasElement.height = window.innerHeight;
  requestDraw();
}

function onClick(event) {
  if (gameState !== X_TURN && gameState !== O_TURN) {
    return;
  }

  const x = event.x;
  const y = event.y;

  for (let row = 0; row < 3; row++) {
    for (let col = 0; col < 3; col++) {
      const index = row * 3 + col;
      const [cx, cy, size] = gridCoordinates[index];

      if (x >= cx && x <= cx + size && y >= cy && y <= cy + size) {
        // Clicking inside this grid position.

        if (gridState[index] === '') {
          // Nothing there yet -- take a turn now.

          if (gameState === X_TURN) {
            gridState[index] = 'x';
            winPosition = getWinPosition('x');
            gameState = winPosition ? OVER : O_TURN;
            setText(winPosition ? X_WIN : O_TO_PLAY);
          } else {
            gridState[index] = 'o';
            winPosition = getWinPosition('o');
            gameState = winPosition ? OVER : X_TURN;
            setText(winPosition ? O_WIN : X_TO_PLAY);
          }

          emptyPositions--;
          if (emptyPositions === 0 && gameState !== OVER) {
            gameState == OVER;
            setText(DRAW);
          }

          requestDraw();
        }

        return;
      }
    }
  }
}

function sendInit() {
  sendMessage({
    type: 'init',
    supportsScreenshot: true,
    systemInstructions: 'You are a passionate gamer and love puzzles. Give playful answers. When playing a game, analyze it carefully and make the best plays to win.',
    functionDeclarations: [
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
      },
    ],
  });
}

function sendScreenshot() {
  canvasElement.toBlob((blob) => sendMessage({type: 'screenshot', blob}));
}

function sendMessage(message) {
  window.parent.postMessage(message, aistudioOrigin);
}

function onMessage(event) {
  const data = event.data;

  switch (data.type) {

    case 'init':
      aistudioOrigin = event.origin;
      sendInit();
      break;

    case 'screenshot':
      sendScreenshot();
      break;

  }
}

function init() {
  window.addEventListener('resize', onResize);
  window.addEventListener('click', onClick);
  window.addEventListener('message', onMessage);
  restartElement.addEventListener('click', onRestart);
  onRestart();
  onResize();
  draw();
}

init();
