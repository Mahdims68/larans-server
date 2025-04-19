const express = require("express"); const http = require("http"); const { Server } = require("socket.io"); const cors = require("cors");

const app = express(); app.use(cors()); const server = http.createServer(app); const io = new Server(server, { cors: { origin: "*", methods: ["GET", "POST"] } });

const PORT = process.env.PORT || 3000;

let rooms = {};

io.on("connection", (socket) => { console.log("کاربر متصل شد:", socket.id);

socket.on("joinRoom", ({ roomCode, playerName }) => { if (!rooms[roomCode]) { rooms[roomCode] = { players: [], gameStarted: false, currentDealerIndex: 0, teamScores: [0, 0], dealerRotation: [0, 0, 0], roundNumber: 1 }; }

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

for (let i = 0; i < 6; i++) {
  const player = room.players[i];
  player.hand = room.deck.slice(i * 9, (i + 1) * 9);
  io.to(player.id).emit("receiveCards", player.hand);
}

io.to(roomCode).emit("biddingStarted");

}

socket.on("submitBid", ({ roomCode, bid }) => { const room = rooms[roomCode]; const player = room.players.find(p => p.id === socket.id); if (!player || room.bids.find(b => b.playerId === player.id)) return;

room.bids.push({ playerId: player.id, bid });
if (room.bids.length === 6) {
  resolveBids(roomCode);
}

});

function resolveBids(roomCode) { const room = rooms[roomCode]; const validBids = room.bids.filter(b => b.bid !== "pass");

if (validBids.length === 0) {
  const dealer = room.players[room.currentDealerIndex];
  const team = dealer.team;
  room.teamScores[team] += 5;
  room.roundNumber++;
  return startGame(roomCode);
}

const highestBid = validBids.reduce((max, b) => b.bid > max.bid ? b : max);
room.currentTurnIndex = room.players.find(p => p.id === highestBid.playerId).index;
room.currentHand = [];
room.leadingSuit = null;
room.hokmSuit = null; // انتخاب بعدی توسط برنده مناقصه

io.to(roomCode).emit("hokmSelect", highestBid.playerId);

}

socket.on("hokmSelected", ({ roomCode, suit }) => { const room = rooms[roomCode]; room.hokmSuit = suit; io.to(roomCode).emit("hokmSet", suit); io.to(roomCode).emit("startHand", room.currentTurnIndex); });

socket.on("playCard", ({ roomCode, card }) => { const room = rooms[roomCode]; const player = room.players.find(p => p.id === socket.id); if (!player || !player.hand.includes(card)) return;

player.hand = player.hand.filter(c => c !== card);
room.currentHand.push({ playerId: player.id, card, index: player.index });

if (room.currentHand.length === 1) {
  room.leadingSuit = card.suit;
}

io.to(roomCode).emit("cardPlayed", { playerId: player.id, card });

if (room.currentHand.length === 6) {
  const winner = determineHandWinner(room);
  io.to(roomCode).emit("handWinner", winner);
  room.currentTurnIndex = winner.index;
  room.currentHand = [];
  room.leadingSuit = null;

  if (room.players.every(p => p.hand.length === 0)) {
    finishRound(roomCode);
  } else {
    io.to(roomCode).emit("startHand", winner.index);
  }
} else {
  room.currentTurnIndex = (room.currentTurnIndex + 1) % 6;
  io.to(roomCode).emit("startHand", room.currentTurnIndex);
}

});

function determineHandWinner(room) { const cards = room.currentHand; let best = cards[0]; for (let i = 1; i < cards.length; i++) { const current = cards[i]; best = compareCards(best, current, room); } return room.players.find(p => p.id === best.playerId); }

function compareCards(a, b, room) { const priority = { "JOKER_WHITE": 3, "JOKER_BLACK": 2, }; if (a.card.type.startsWith("JOKER") || b.card.type.startsWith("JOKER")) { const aPower = priority[a.card.type] || 1; const bPower = priority[b.card.type] || 1; return aPower >= bPower ? a : b; }

const isBHokm = b.card.suit === room.hokmSuit;
const isAHokm = a.card.suit === room.hokmSuit;

if (isBHokm && !isAHokm) return b;
if (isAHokm && !isBHokm) return a;

const isBLead = b.card.suit === room.leadingSuit;
const isALead = a.card.suit === room.leadingSuit;

if (isBLead && !isALead) return b;
if (isALead && !isBLead) return a;

return b.card.value > a.card.value ? b : a;

}

function finishRound(roomCode) { const room = rooms[roomCode]; // محاسبه امتیاز و تعیین تیم حاکم جدید و... room.roundNumber++; startGame(roomCode); }

function createDeck() { const suits = ["hearts", "diamonds", "clubs", "spades"]; const values = [2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14]; let deck = [];

for (let suit of suits) {
  for (let value of values) {
    deck.push({ suit, value, type: "NORMAL" });
  }
}

deck.push({ type: "JOKER_BLACK" });
deck.push({ type: "JOKER_WHITE" });
return deck;

}

function shuffle(deck) { for (let i = deck.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [deck[i], deck[j]] = [deck[j], deck[i]]; } } });

server.listen(PORT, () => console.log(Server running on port ${PORT}));

