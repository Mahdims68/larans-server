// larans-server.js (قسمت‌های اصلی برای اضافه شدن ویژگی پس لارانس و سوپر پس لارانس)

const io = require("socket.io")(server);

let gameState = {
  players: [],
  teams: {
    A: { score: 0, players: [] },
    B: { score: 0, players: [] },
  },
  hakimTeam: "B",
  hakimRoundCount: 6,
  roundsWon: { A: 0, B: 0 },
  candidatePlayerId: null,
  candidateMode: null, // null | "post" | "super"
  currentTrump: null,
  gameMode: "normal", // normal | post | super
};

function determineCandidate(team) {
  const candidates = gameState.teams[team].players.filter(p => p.selectedNumber !== undefined);
  if (candidates.length === 0) {
    const randomIndex = Math.floor(Math.random() * gameState.teams[team].players.length);
    return gameState.teams[team].players[randomIndex].id;
  }
  let max = -1, selected = null;
  for (let player of candidates) {
    if (player.selectedNumber > max) {
      max = player.selectedNumber;
      selected = player.id;
    } else if (player.selectedNumber === max) {
      // Tie: choose randomly
      if (Math.random() < 0.5) selected = player.id;
    }
  }
  return selected;
}

function checkPostLaransCondition() {
  const n = gameState.hakimRoundCount;
  const m = gameState.roundsWon.A;
  if (m + n > 9 && gameState.hakimTeam === "B") {
    const candidate = determineCandidate("A");
    gameState.candidatePlayerId = candidate;
    io.to(candidate).emit("postLaransChoice", {
      options: ["end", "post", "super"]
    });
  }
}

io.on("connection", (socket) => {
  // دریافت تصمیم بازیکن منتخب
  socket.on("postLaransResponse", ({ choice }) => {
    if (socket.id !== gameState.candidatePlayerId) return;

    if (choice === "end") {
      gameState.teams.A.score += gameState.hakimRoundCount * 2;
      endHand();
    } else if (choice === "post") {
      gameState.gameMode = "post";
      socket.emit("chooseTrump");
    } else if (choice === "super") {
      gameState.gameMode = "super";
      continueHand();
    }
  });

  // دریافت حکم جدید در پس لارانس
  socket.on("newTrump", ({ trump }) => {
    if (socket.id !== gameState.candidatePlayerId) return;
    gameState.currentTrump = trump;
    continueHand();
  });
});

function evaluateEndOfRound() {
  const A = gameState.roundsWon.A;
  const B = gameState.roundsWon.B;
  if (A + B >= 9) {
    if (gameState.gameMode === "post" && A === 9) {
      gameState.teams.A.score += 108;
      endGame();
    } else if (gameState.gameMode === "super" && A === 9) {
      gameState.teams.A.score = Infinity;
      endGame();
    } else if (gameState.gameMode === "post" || gameState.gameMode === "super") {
      gameState.teams.B.score += 18;
      endHand();
    } else {
      endHand();
    }
  }
}

function endHand() {
  // reset hand state
  gameState.roundsWon = { A: 0, B: 0 };
  gameState.candidatePlayerId = null;
  gameState.gameMode = "normal";
  // next hand setup ...
}

function continueHand() {
  // ادامه اجرای دست فعلی
}

function endGame() {
  io.emit("gameOver", gameState.teams);
}
