import { Request, Response } from "express";
import { uploads } from "./config/multer";
import path from "path";
import socketHandler from "./socket/socketHandler";
import { applicationDefault, initializeApp } from "firebase-admin/app";
import cors from "cors";
import { getMessaging } from "firebase-admin/messaging";
require("express-async-errors");

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

process.env.GOOGLE_APPLICATION_CREDENTIALS;

initializeApp({
  credential: applicationDefault(),
  projectId: "attendace-3dba7",
});

export const io = new Server(httpServer, {
  cors: {
    origin: "*",
    methods: ["GET", "POST"],
  },
});

app.use(
  cors({
    methods: ["GET", "POST", "DELETE", "UPDATE", "PUT", "PATCH"],
  })
);

app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static(path.resolve(__dirname, "public")));
app.use("/user", userRouter);
app.use("/announcement", announcementRouter);
app.use("/image", imageRouter);
app.use("/upload", uploadRouter);
app.use("/class", classRouter);
console.log(process.env.GOOGLE_APPLICATION_CREDENTIALS);

app.post("/send", function (req: any, res: any) {
  // const receivedToken = req.body.fcmToken;

  const message = {
    notification: {
      title: "Notif",
      body: "This is a Test Notification",
    },
    token:
      "AAAADNR1ETE:APA91bFbyDIQh9ccJRsoRnpBYg3b27DpFY1slLDyuSFa5_KvtZqeCN5Y6yFcxzju1MaqX7jMblQs-gX4EEuh_7t-z6HHpX95-rDF7FyZs96p8NyBl3tGoYEvntTJ5HoLnMzYZq9dplG0",
  };

  // getMessaging()
  //   .send(message)
  //   .then((response) => {
  //     res.status(200).json({
  //       message: "Successfully sent message",
  //       // token: receivedToken,
  //     });
  //     console.log("Successfully sent message:", response);
  //   })
  //   .catch((error) => {
  //     res.status(400);
  //     res.send(error);
  //     console.log("Error sending message:", error);
  //   });

  getMessaging()
    .sendToTopic("all", {
      data: {
        title: "Notif",
        body: "This is a Test Notification",
      },
      notification: {
        title: "Basic Notification",
        body: "This is a basic notification sent from the server!",
        imageUrl: "https://my-cdn.com/app-logo.png",
      },
    })
    .then((response) => {
      console.log("Successfully sent message:", response);
      res.status(200).json({
        message: "Successfully sent message",
        // token: receivedToken,
      });
    })
    .catch((error) => {
      res.status(400);
      res.send(error);
      console.log("Error sending message:", error);
    });
});
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
