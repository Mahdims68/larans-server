const express = require("express");
const { createServer } = require("http");
const { Server } = require("socket.io");
const cors = require("cors");

const app = express();
app.use(cors());

// ساخت سرور HTTP
const server = createServer(app);

// تنظیمات CORS برای اتصال کلاینت‌های موبایل و وب
const io = new Server(server, {
  cors: {
    origin: "*", // برای امنیت در نسخه نهایی می‌تونی اینو محدود کنی
    methods: ["GET", "POST"],
    credentials: true,
  },
});

// تست اینکه سرور فعاله
app.get("/", (req, res) => {
  res.send("سرور Socket.IO فعال است");
});

// مدیریت اتصال کلاینت
io.on("connection", (socket) => {
  console.log("کاربر متصل شد:", socket.id);

  // هندل پیام ساده
  socket.on("message", (data) => {
    console.log("پیام دریافتی:", data);
    io.emit("message", `پیام: ${data}`);
  });

  // قطع اتصال
  socket.on("disconnect", () => {
    console.log("کاربر قطع شد:", socket.id);
  });
});

// اجرای سرور روی پورت مشخص (مثلاً 3000)
const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
  console.log(`سرور در حال اجرا روی پورت ${PORT}`);
});
