const socket = io();

let currentRoom = null;
let myTeam = null;

function createRoom() {
  const hostName = document.getElementById('host-name').value.trim();
  if (!hostName) return alert('الرجاء كتابة اسمك');
  
  socket.emit('create-room', { hostName });
}

function selectTeam(team) {
  myTeam = team;
  document.getElementById('btn-red').style.opacity = team === 'red' ? '1' : '0.5';
  document.getElementById('btn-green').style.opacity = team === 'green' ? '1' : '0.5';
}

function joinRoom() {
  const playerName = document.getElementById('player-name').value.trim();
  const roomCode = document.getElementById('room-code-input').value.trim();

  if (!playerName || !roomCode) return alert('يرجى إدخال اسمك ورمز الغرفة');
  if (!myTeam) return alert('يرجى اختيار الفريق');

  socket.emit('join-room', { playerName, roomCode, team: myTeam });
}

socket.on('room-created', (data) => {
  currentRoom = data.roomCode;
  document.getElementById('room-created-code').innerText = `رمز الغرفة: ${data.roomCode}`;
  document.getElementById('room-code-input').value = data.roomCode;
});

socket.on('game-started', (data) => {
  document.getElementById('lobby').style.display = 'none';
  document.getElementById('game-screen').style.display = 'block';
  document.getElementById('display-room-code').innerText = currentRoom || data.roomCode;
  renderGrid(data.letters || []);
});

function renderGrid(letters) {
  const gridContainer = document.getElementById('grid');
  gridContainer.innerHTML = '';

  const rowsPattern = [5, 6, 5, 6, 5];
  let letterIndex = 0;

  rowsPattern.forEach(count => {
    const rowDiv = document.createElement('div');
    rowDiv.className = 'hex-row';

    for (let i = 0; i < count; i++) {
      if (letterIndex < letters.length) {
        const item = letters[letterIndex];
        const box = document.createElement('div');
        box.className = 'letter-box';
        if (item.claimedBy) box.classList.add(item.claimedBy);

        const span = document.createElement('span');
        span.className = 'letter';
        span.textContent = item.char || item;

        box.appendChild(span);
        rowDiv.appendChild(box);
        letterIndex++;
      }
    }
    gridContainer.appendChild(rowDiv);
  });
}
