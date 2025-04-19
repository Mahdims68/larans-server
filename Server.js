// server.js - نسخه کامل‌شده برای بازی لارانس

const express = require("express"); const http = require("http"); const { Server } = require("socket.io"); const cors = require("cors");

const app = express(); app.use(cors()); const server = http.createServer(app); const io = new Server(server, { cors: { origin: "*", methods: ["GET", "POST"] } });

const PORT = process.env.PORT || 3000;

// ساختار اتاق‌ها let rooms = {};

io.on("connection", (socket) => { console.log("کاربر متصل شد: ", socket.id);

socket.on("joinRoom", ({ roomCode, playerName }) => { if (!rooms[roomCode]) { rooms[roomCode] = { players: [], gameStarted: false, currentDealerIndex: 0, teamScores: [0, 0], dealerRotation: [0, 0, 0] // برای چرخش پخش‌کننده }; }

const room = rooms[roomCode];
if (room.players.length >= 6) return;

const player = {
  id: socket.id,
  name: playerName,
  hand: [],
  bid: null,
  team: room.players.length < 3 ? 0 : 1,
  index: room.players.length
};

room.players.push(player);
socket.join(roomCode);
io.to(roomCode).emit("playerJoined", room.players.map(p => ({ name: p.name, team: p.team })));

if (room.players.length === 6) {
  startGame(roomCode);
}

});

function startGame(roomCode) { const room = rooms[roomCode]; room.gameStarted = true; room.bids = []; room.deck = createDeck(); shuffle(room.deck);

// پخش کارت‌ها
for (let i = 0; i < 6; i++) {
  const player = room.players[i];
  player.hand = room.deck.slice(i * 9, (i + 1) * 9);
  io.to(player.id).emit("receiveCards", player.hand);
}

io.to(roomCode).emit("biddingStarted");

}

socket.on("playerBid", ({ roomCode, bid }) => { const room = rooms[roomCode]; const player = room.players.find(p => p.id === socket.id); player.bid = bid; room.bids.push({ playerId: player.id, bid });

if (room.bids.length === 6) {
  // تعیین حاکم و شروع بازی
  const validBids = room.bids.filter(b => b.bid !== "pass");
  if (validBids.length === 0) {
    io.to(roomCode).emit("noBidRestart");
    return;
  }
  validBids.sort((a, b) => b.bid - a.bid);
  const hakem = room.players.find(p => p.id === validBids[0].playerId);
  room.hakem = hakem;
  io.to(roomCode).emit("hakemChosen", { name: hakem.name, bid: validBids[0].bid });
}

});

socket.on("chooseHokm", ({ roomCode, hokm }) => { const room = rooms[roomCode]; if (!room.hakem || socket.id !== room.hakem.id) return;

room.hokm = hokm;
io.to(roomCode).emit("hokmChosen", hokm);

// تعیین نوبت شروع بازی از نفر بعد از حاکم
const startIndex = (room.hakem.index + 1) % 6;
room.turnIndex = startIndex;
room.currentTrick = [];
io.to(room.players[startIndex].id).emit("yourTurn");

});

socket.on("playCard", ({ roomCode, card }) => { const room = rooms[roomCode]; const player = room.players[room.turnIndex]; if (socket.id !== player.id) return;

player.hand = player.hand.filter(c => c !== card);
room.currentTrick.push({ playerId: player.id, card, index: room.turnIndex });
io.to(roomCode).emit("cardPlayed", { name: player.name, card });

if (room.currentTrick.length === 6) {
  // محاسبه برنده دور
  const winner = calculateTrickWinner(room.currentTrick, room.hokm);
  room.turnIndex = winner.index;
  io.to(roomCode).emit("trickWon", { winner: room.players[winner.index].name });
  room.currentTrick = [];
} else {
  room.turnIndex = (room.turnIndex + 1) % 6;
  io.to(room.players[room.turnIndex].id).emit("yourTurn");
}

});

socket.on("disconnect", () => { for (const code in rooms) { rooms[code].players = rooms[code].players.filter(p => p.id !== socket.id); } }); });

function createDeck() { const suits = ["S", "H", "D", "C"]; const ranks = ["2", "3", "4", "5", "6", "7", "8", "9", "10", "J", "Q", "K", "A"]; const deck = []; for (let suit of suits) { for (let rank of ranks) { deck.push(${rank}${suit}); } } deck.push("BJ"); // جوکر مشکی deck.push("RJ"); // جوکر سفید return deck; }

function shuffle(array) { for (let i = array.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [array[i], array[j]] = [array[j], array[i]]; } }

function calculateTrickWinner(trick, hokm) { // فعلاً ساده: فقط بر اساس ترتیب نوبت، بعداً با منطق کامل‌تر جایگزین میشه return trick[0]; }

server.listen(PORT, () => { console.log(Server listening on port ${PORT}); });
