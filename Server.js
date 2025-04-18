const express = require("express");
const http = require("http");
const { Server } = require("socket.io");
const cors = require("cors");

const app = express();
app.use(cors());
app.use(express.json()); // ← مرحله ۱

const authRoutes = require("./auth"); // ← مرحله ۲
app.use("/api", authRoutes);          // ← مرحله ۲

const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: "*"
  }
});
