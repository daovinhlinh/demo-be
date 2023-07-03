import { Request, Response } from "express";
import { uploads } from "./config/multer";
import path from "path";
import socketHandler from "./socket/socketHandler";

const express = require("express");
const dotenv = require("dotenv");
const { Server } = require("socket.io");
const { createServer } = require("http");
dotenv.config();
require("./config/db");

// process.on('uncaughtException', (error, origin) => {
//   console.log('----- Uncaught exception -----')
//   console.log(error)
//   console.log('----- Exception origin -----')
//   console.log(origin)
//   process.exit(1)
// })

// process.on('unhandledRejection', (reason, promise) => {
//   console.log('----- Unhandled Rejection at -----')
//   console.log(promise)
//   console.log('----- Reason -----')
//   console.log(reason);
//   process.exit(1)
// })

//Router
const userRouter = require("./routers/user");
const imageRouter = require("./routers/image");
const uploadRouter = require("./routers/upload");
const classRouter = require("./routers/class");
const announcementRouter = require("./routers/announcement");

const app = express();
const port = process.env.PORT;
const httpServer = createServer(app);

export const io = new Server(httpServer, {
  cors: {
    origin: "*",
    methods: ["GET", "POST"],
  },
});

app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static(path.resolve(__dirname, "public")));
app.use("/user", userRouter);
app.use("/announcement", announcementRouter);
app.use("/image", imageRouter);
app.use("/upload", uploadRouter);
app.use("/class", classRouter);
// app.use('/',)

app.get("/", (req: Request, res: Response) => {
  res.send("Express + TypeScript Server");
});

app.listen(port, () => {
  console.log(`[server]: Server is running at https://localhost:${port}`);
});

httpServer.listen(process.env.SOCKET_PORT, () => {
  try {
    console.log(
      `[server]: Socket is running at https://localhost:${process.env.SOCKET_PORT}`
    );
    socketHandler(io);
  } catch (e) {
    console.log(e);
  }
});
