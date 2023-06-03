import { Request, Response } from "express";

const express = require("express");
const User = require("../models/User");
const auth = require("../middleware/auth");
const userController = require("../controllers/user.controller");
const router = express.Router();

router.post("/register", async (req: Request, res: Response) => {
  // Create a new user
  try {
    const isExisted = await User.findOne({ email: req.body.email });
    if (isExisted) {
      return res.status(400).send("User already registered");
    }

    if (req.body.role === User.ROLES.USER) {
      if (!req.body.studentId) {
        return res.status(400).send("Missing studentId");
      }

      const isExistedStudentId = await User.findOne({
        studentId: req.body.studentId,
      });
      if (isExistedStudentId) {
        return res.status(400).send("StudentId already registered");
      }
    } else if (req.body.studentId) {
      return res.status(400).send("StudentId is only for user");
    }

    const user = new User({
      ...req.body,
      role: req.body.role ? req.body.role : User.ROLES.USER,
    });
    const token = await user.generateAuthToken();
    res.status(201).send({ user, token });
  } catch (error) {
    res.status(400).send(error);
  }
});

router.post("/login", async (req: Request, res: Response) => {
  try {
    const { email, password } = req.body;
    let user = await User.findByCredentials(email, password);
    if (!user) {
      return res
        .status(401)
        .send({ error: "Login failed! Check authentication credentials" });
    }

    await user.generateAuthToken();

    res.send(user);
  } catch (error) {
    res.status(400).send({
      error: "Login failed! Check authentication credentials",
    });
  }
});

router.get("/me", auth, async (req: any, res: Response) => {
  res.send(req.user);
});

router.post("/update", auth, async (req: any, res: Response) => {
  const update = req.body;

  const updateUser = await User.findOneAndUpdate(
    { _id: req.user._id },
    update,
    {
      new: true,
    }
  );
  if (!updateUser) {
    res.status(404).send("No user found");
  }
  res.status(200).send(updateUser);
});

router.post("/logout", auth, async (req: any, res: Response) => {
  try {
    // req.user.tokens = req.user.tokens.filter((token: any) => {
    //   return token.token !== req.token;
    // });

    req.user.token = undefined;

    await req.user.save();
    res.send({
      message: "Logout successfully",
    });
  } catch (error) {
    res.status(500).send(error);
  }
});

router.post("/logoutall", auth, async (req: any, res: Response) => {
  try {
    req.user.tokens = [];
    await req.user.save();
    res.send();
  } catch (error) {
    res.status(500).send(error);
  }
});

router.get("/:userId", auth, async (req: Request, res: Response) => {
  const userId = req.params.userId;
  if (userId.match(/^[0-9a-fA-F]{24}$/)) {
    // Yes, it's a valid ObjectId, proceed with `findById` call.
    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).send({ error: "User not found" });
    }
    return res.status(200).json({
      user: user,
    });
  }

  return res.status(400).send({
    error: "Invalid user id",
  });
});

router.post("/checkLecturer", async (req: any, res: Response) => {
  const user = await User.findOne({ email: req.body.email });
  if (!user) {
    return res.status(200).send({
      isLecturer: false,
    });
  }

  if (user.role === User.ROLES.LECTURER) {
    return res.status(200).send({
      isLecturer: true,
    });
  }

  return res.status(200).send({
    isLecturer: false,
  });
});

router.get(
  "/",
  auth,
  userController.grantAccess("readOwn", "profile"),
  async (req: Request, res: Response) => {
    const users = await User.find();
    res.send(users);
  }
);

module.exports = router;
