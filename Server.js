const express = require("express");
const http = require("http");
const { Server } = require("socket.io");
const cors = require("cors");

const app = express();
app.use(cors());
const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: "*"
  }
});

const PORT = process.env.PORT || 3000;

const games = {};

io.on("connection", (socket) => {
  console.log("کاربری وصل شد");

  socket.on("joinRoom", ({ gameId, player }) => {
    socket.join(gameId);
    if (!games[gameId]) games[gameId] = { players: [], started: false };
    games[gameId].players.push(player);
    io.to(gameId).emit("playerJoined", { players: games[gameId].players });
  });

  socket.on("startGame", ({ gameId }) => {
    const game = games[gameId];
    if (!game || game.started) return;
    game.started = true;
    const cards = generateCards();
    const hands = dealCards(cards, game.players.length);
    game.players.forEach((player, i) => {
      io.to(gameId).emit("receiveCards", {
        playerId: player.id,
        cards: hands[i]
      });
    });
    io.to(gameId).emit("biddingStarted", {
      playerOrder: game.players.map(p => p.name)
    });
  });

  socket.on("playerBid", ({ gameId, playerId, bid }) => {
    io.to(gameId).emit("log", `${playerId} پیشنهاد داد: ${bid}`);
  });

  socket.on("hokmChosen", ({ gameId, playerId, hokm }) => {
    io.to(gameId).emit("log", `${playerId} حکم را انتخاب کرد: ${hokm}`);
  });

  socket.on("playCard", ({ gameId, playerId, card }) => {
    io.to(gameId).emit("log", `${playerId} کارت زد: ${card.value} ${card.suit || card.color}`);
  });
});

function generateCards() {
  const suits = ["♠", "♥", "♦", "♣"];
  const values = ["2", "3", "4", "5", "6", "7", "8", "9", "10", "J", "Q", "K", "A"];
  const deck = [];

  suits.forEach(suit => {
    values.forEach(value => {
      deck.push({ suit, value });
    });
  });

  deck.push({ color: "مشکی", value: "Joker" });
  deck.push({ color: "سفید", value: "Joker" });

  for (let i = deck.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [deck[i], deck[j]] = [deck[j], deck[i]];
  }

  return deck;
}

function dealCards(deck, numPlayers) {
  const handSize = 9;
  const hands = [];
  for (let i = 0; i < numPlayers; i++) {
    hands.push(deck.slice(i * handSize, (i + 1) * handSize));
  }
  return hands;
}

server.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
