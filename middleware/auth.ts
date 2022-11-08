import { NextFunction, Response } from "express";

const jwt = require("jsonwebtoken");
const User = require("../models/User");

const auth = async (req: any, res: Response, next: NextFunction) => {
  try {
    const token = (req.header("Authorization") || "").replace("Bearer ", "");
    const decoded = jwt.verify(token, process.env.JWT_KEY);
    const user = await User.findOne({
      _id: decoded._id,
      "tokens.token": token,
    });

    if (!user) {
      throw new Error();
    }

    req.token = token;
    req.user = user;
    next();
  } catch (error) {
    res.status(401).send({ error: "Please authenticate." });
  }
};

module.exports = auth;
