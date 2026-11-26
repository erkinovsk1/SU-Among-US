const socket = io();

const COLORS = ['#ef4444', '#3b82f6', '#22c55e', '#eab308', '#a855f7', '#ec4899', '#f97316', '#06b6d4'];
let selectedColor = COLORS[0];
let amIHost = false;

const menuScreen = document.getElementById('menuScreen');
const lobbyScreen = document.getElementById('lobbyScreen');
const colorPicker = document.getElementById('colorPicker');
const nicknameInput = document.getElementById('nicknameInput');
const roomCodeInput = document.getElementById('roomCodeInput');
const createBtn = document.getElementById('createBtn');
const joinBtn = document.getElementById('joinBtn');
const copyCodeBtn = document.getElementById('copyCodeBtn');
const leaveBtn = document.getElementById('leaveBtn');
const startBtn = document.getElementById('startBtn');
const errorBox = document.getElementById('errorBox');
const currentCode = document.getElementById('currentCode');
const hostBadge = document.getElementById('hostBadge');
const playersCount = document.getElementById('playersCount');
const playersList = document.getElementById('playersList');

function initColorPicker() {
  colorPicker.innerHTML = '';
  COLORS.forEach((hex, idx) => {
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = `color-swatch${idx === 0 ? ' active' : ''}`;
    btn.style.backgroundColor = hex;
    btn.title = hex;
    btn.addEventListener('click', () => {
      selectedColor = hex;
      document.querySelectorAll('.color-swatch').forEach((el) => el.classList.remove('active'));
      btn.classList.add('active');
    });
    colorPicker.appendChild(btn);
  });
}

function showError(message) {
  errorBox.textContent = message || '';
}

function updateHostUI(isHost) {
  amIHost = Boolean(isHost);
  hostBadge.textContent = amIHost ? 'Вы командир лобби' : 'Ожидание запуска командиром';
  startBtn.classList.toggle('hidden', !amIHost);
}

function renderPlayers(players) {
  playersCount.textContent = `${players.length} / 10`;
  playersList.innerHTML = '';

  players.forEach((player) => {
    const li = document.createElement('li');
    li.className = 'player-item';

    const left = document.createElement('div');
    left.className = 'player-left';

    const dot = document.createElement('span');
    dot.className = 'avatar-dot';
    dot.style.backgroundColor = player.color || '#38bdf8';

    const nameSpan = document.createElement('span');
    nameSpan.textContent = player.nickname;

    left.append(dot, nameSpan);
    li.appendChild(left);

    if (player.isHost) {
      const hostTag = document.createElement('span');
      hostTag.className = 'tag-host';
      hostTag.textContent = 'ХОСТ';
      li.appendChild(hostTag);
    }

    playersList.appendChild(li);
  });
}

function enterLobby({ roomCode, players, isHost }) {
  showError('');
  menuScreen.classList.add('hidden');
  lobbyScreen.classList.remove('hidden');
  currentCode.textContent = roomCode;
  updateHostUI(isHost);
  renderPlayers(players);
}

function returnToMenu() {
  amIHost = false;
  lobbyScreen.classList.add('hidden');
  menuScreen.classList.remove('hidden');
  showError('');
}

createBtn.addEventListener('click', () => {
  socket.emit('create_lobby', {
    nickname: nicknameInput.value,
    color: selectedColor
  });
});

joinBtn.addEventListener('click', () => {
  socket.emit('join_lobby', {
    nickname: nicknameInput.value,
    roomCode: roomCodeInput.value,
    color: selectedColor
  });
});

leaveBtn.addEventListener('click', () => {
  socket.emit('leave_lobby');
  returnToMenu();
});

copyCodeBtn.addEventListener('click', async () => {
  const code = currentCode.textContent.trim();
  if (!code || code === '----') return;
  try {
    await navigator.clipboard.writeText(code);
    copyCodeBtn.textContent = 'Скопировано';
    setTimeout(() => {
      copyCodeBtn.textContent = 'Копировать';
    }, 1200);
  } catch {
    copyCodeBtn.textContent = code;
  }
});

startBtn.addEventListener('click', () => {
  if (!amIHost) return;
  socket.emit('start_game');
});

socket.on('lobby_joined', enterLobby);
socket.on('update_players', renderPlayers);
socket.on('host_changed', ({ isHost }) => updateHostUI(isHost));
socket.on('game_started', ({ roomCode }) => {
  alert(`Миссия в комнате ${roomCode} запускается! Следующий этап — игровой цикл.`);
});
socket.on('error_message', showError);

initColorPicker();