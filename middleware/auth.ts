import { NextFunction, Response } from "express";
import { IUser } from "../models/User";

const jwt = require("jsonwebtoken");
const User = require("../models/User");

export interface IAuth {
  token: string;
  user: IUser;
}

const auth = async (req: any, res: Response, next: NextFunction) => {
  try {
    const token = (req.header("Authorization") || "").replace("Bearer ", "");

    jwt.verify(token, process.env.JWT_KEY, async (err: any, decoded: any) => {
      if (err) {
        return res.status(401).send({
          message: "Unauthorized!"
        })
      }

      const user = await User.findOne({
        _id: decoded._id,
        "token": token,
      });

      if (!user) {
        return res.status(400).send({
          message: "User not found!"
        })
        // throw new Error();
      }

      req.token = token;
      req.user = user;
      next();
    });

    //Multi token per user ==> for multi device login
    // const user = await User.findOne({
    //   _id: decoded._id,
    //   "tokens.token": token,
    // });

  } catch (error) {
    res.status(401).send({ error: "Please authenticate." });
  }
};

module.exports = auth;
