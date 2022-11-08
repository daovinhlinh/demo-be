import { Request, Response } from "express";

const express = require("express");
const User = require("../models/User");
const auth = require("../middleware/auth");
const userController = require('../controllers/user.controller');
const router = express.Router();

router.post("/register", async (req: Request, res: Response) => {
  // Create a new user
  try {
    const isExisted = await User.findOne({ email: req.body.email });
    if (isExisted) {
      return res.status(400).send("User already registered");
    }

    const user = new User({ ...req.body, role: User.ROLES.USER });
    await user.save();
    const token = await user.generateAuthToken();
    res.status(201).send({ user, token });
  } catch (error) {
    res.status(400).send(error);
  }
});

router.post("/login", async (req: Request, res: Response) => {
  try {
    const { email, password } = req.body;
    const user = await User.findByCredentials(email, password);
    if (!user) {
      return res
        .status(401)
        .send({ error: "Login failed! Check authentication credentials" });
    }

    const token = await user.generateAuthToken();
    res.send({ user, token });
  } catch (error) {
    res.status(400).send(error);
  }
});

router.get("/me", auth, async (req: any, res: Response) => {
  console.log(req.user);

  res.send(req.user);
});

router.post("/update", async (req: Request, res: Response) => {
  const update = req.body;

  const updateUser = await User.findOneAndUpdate({ _id: req.body.id }, update, { new: true });
  if (!updateUser) {
    res.status(404).send("No user found");
  }
  res.status(200).send(updateUser);
})


router.post("/logout", auth, async (req: any, res: Response) => {
  try {
    req.user.tokens = req.user.tokens.filter((token: any) => {
      return token.token !== req.token;
    });
    await req.user.save();
    res.send();
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

router.get('/', auth, userController.grantAccess('readAny', 'profile'), async (req: Request, res: Response) => {
  const users = await User.find();
  res.send(users);
})

router.get("/:userId", auth, async (req: Request, res: Response) => {
  const userId = req.params.userId;
  console.log(userId);

  const user = await User.findById(userId);
  if (!user) {
    return res.status(404).send({ error: "User not found" });
  }
  res.status(200).json({
    user: user,
  })
})

module.exports = router;
