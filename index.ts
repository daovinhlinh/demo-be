import { Request, Response } from "express";

const express = require("express");
const dotenv = require("dotenv");
dotenv.config();
require("./config/db");

//Router
const userRouter = require("./routers/user");
const imageRouter = require("./routers/image");

const app = express();
const port = process.env.PORT;

app.use(express.json());
app.use("/users", userRouter);
app.use("/image", imageRouter);

app.get("/", (req: Request, res: Response) => {
  res.send("Express + TypeScript Server");
});

app.listen(port, () => {
  console.log(`[server]: Server is running at https://localhost:${port}`);
});
