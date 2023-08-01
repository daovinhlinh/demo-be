import { NextFunction, Response } from "express";
import roles from "../config/roles";

const User = require("../models/User");

const updateUser = async (req: any, res: Response) => {
  const data = req.body;

  const updateUser = await User.findOneAndUpdate(
    { _id: req.user._id },
    {
      name: data.name,
    },
    {
      new: true,
    }
  );
  if (!updateUser) {
    res.status(404).send({ message: "No user found" });
  }
  res.status(200).send(updateUser);
};

const grantAccess = (action: string, resource: string) => {
  return async (req: any, res: Response, next: NextFunction) => {
    try {
      const permission = roles.can(req.user.role)[action](resource);

      if (!permission.granted) {
        return res.status(401).json({
          error: "You don't have enough permission to perform this action",
        });
      }
      next();
    } catch (error) {
      next(error);
    }
  };
};

const allowIfLoggedin = async (req: any, res: Response, next: NextFunction) => {
  try {
    const user = res.locals.loggedInUser;
    if (!user)
      return res.status(401).json({
        error: "You need to be logged in to access this route",
      });
    req.user = user;
    next();
  } catch (error) {
    next(error);
  }
};

module.exports = { grantAccess, allowIfLoggedin, updateUser };
