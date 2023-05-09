import { Request, Response } from "express";
import { uploads } from "./config/multer";
import path from "path";

const express = require("express");
const dotenv = require("dotenv");
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

const app = express();
const port = process.env.PORT;

app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static(path.resolve(__dirname, 'public')));
app.use("/user", userRouter);
app.use("/image", imageRouter);
app.use('/upload', uploadRouter)
app.use('/class', classRouter)

app.get("/", (req: Request, res: Response) => {
  res.send("Express + TypeScript Server");
});

app.listen(port, () => {
  console.log(`[server]: Server is running at https://localhost:${port}`);
});
