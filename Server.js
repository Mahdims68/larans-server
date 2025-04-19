// server.js - نسخه کامل برای بازی لارانس

const express = require("express");
const http = require("http");
const { Server } = require("socket.io");
const cors = require("cors");

const app = express();
app.use(cors());
const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: "*",
    methods: ["GET", "POST"]
  }
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => console.log(`Server running on port ${PORT}`));

let rooms = {};

// ساخت دک کامل با جوکرها
function createDeck() {
  const suits = ["hearts", "diamonds", "clubs", "spades"];
  const values = ["2", "3", "4", "5", "6", "7", "8", "9", "10", "J", "Q", "K", "A"];
  let deck = [];
  suits.forEach(suit => {
    values.forEach(value => {
      deck.push({ suit, value });
    });
  });
  deck.push({ suit: "joker", color: "black" });
  deck.push({ suit: "joker", color: "red" });
  return deck;
}

function shuffle(deck) {
  for (let i = deck.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [deck[i], deck[j]] = [deck[j], deck[i]];
  }
}

io.on("connection", (socket) => {
  console.log("کاربر متصل شد:", socket.id);

  socket.on("joinRoom", ({ roomCode, playerName }) => {
    if (!rooms[roomCode]) {
      rooms[roomCode] = {
        players: [],
        gameStarted: false,
        teamScores: [0, 0],
        currentDealerIndex: 0
      };
    }

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

  function startGame(roomCode) {
    const room = rooms[roomCode];
    room.gameStarted = true;
    room.deck = createDeck();
    shuffle(room.deck);

    for (let i = 0; i < 6; i++) {
      const player = room.players[i];
      player.hand = room.deck.slice(i * 9, (i + 1) * 9);
      io.to(player.id).emit("receiveCards", player.hand);
    }

    io.to(roomCode).emit("biddingStarted");
  }

  socket.on("submitBid", ({ roomCode, bid }) => {
    const room = rooms[roomCode];
    const player = room.players.find(p => p.id === socket.id);
    player.bid = bid; // عدد بین 5 تا 9 یا "pass"

    const allBids = room.players.map(p => p.bid);
    if (allBids.filter(b => b !== null).length === 6) {
      let validBids = room.players.map((p, i) => ({ i, bid: p.bid })).filter(b => b.bid !== "pass");

      if (validBids.length === 0) {
        // حالت خاص اگر همه پاس دادن
        room.forcedBidder = room.currentDealerIndex;
        room.forcedBidValue = 5;
        room.bidWinner = room.currentDealerIndex;
        io.to(roomCode).emit("forcedBid", room.players[room.currentDealerIndex].name);
      } else {
        const highest = validBids.sort((a, b) => b.bid - a.bid)[0];
        room.currentBid = highest.bid;
        room.bidWinner = highest.i;
        io.to(roomCode).emit("bidResult", {
          winnerIndex: highest.i,
          bid: highest.bid,
          playerName: room.players[highest.i].name
        });
      }
    }
  });

  socket.on("chooseTrump", ({ roomCode, trumpSuit }) => {
    const room = rooms[roomCode];
    room.trump = trumpSuit;
    room.currentTurn = (room.bidWinner + 1) % 6;
    room.currentRound = [];
    room.roundNumber = 1;

    io.to(roomCode).emit("trumpChosen", {
      trump: trumpSuit,
      starter: room.currentTurn
    });
  });

  socket.on("playCard", ({ roomCode, card }) => {
    const room = rooms[roomCode];
    const player = room.players.find(p => p.id === socket.id);
    if (!player || room.players[room.currentTurn].id !== socket.id) return;

    player.hand = player.hand.filter(c => !(c.suit === card.suit && c.value === card.value && c.color === card.color));
    room.currentRound.push({ playerIndex: player.index, card });

    io.to(roomCode).emit("cardPlayed", {
      playerIndex: player.index,
      card
    });

    if (room.currentRound.length === 6) {
      // اینجا منطق تعیین برنده دست و محاسبه ادامه میاد
    } else {
      room.currentTurn = (room.currentTurn + 1) % 6;
    }
  });
});
