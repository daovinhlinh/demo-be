import { Request, Response } from "express";
import { generatePassword } from "../commons";

const express = require("express");
const User = require("../models/User");
const auth = require("../middleware/auth");
const userController = require("../controllers/user.controller");
const jwt = require("jsonwebtoken");
const nodemailer = require("nodemailer");
const bcrypt = require("bcryptjs");

const router = express.Router();

router.post("/resetPassword", async (req: Request, res: Response) => {
  const isExisted = await User.findOne({ email: req.body.email });

  if (!isExisted) {
    return res.status(400).send("Email is not existed");
  }

  //update new password to database
  const plainPassword = generatePassword(8);
  const hashedPassword = await bcrypt.hash(plainPassword, 8);
  console.log(plainPassword, hashedPassword);

  await User.updateOne(
    {
      email: req.body.email,
    },
    {
      password: hashedPassword,
    }
  );

  const transporter = nodemailer.createTransport({
    service: "gmail",
    auth: {
      // TODO: replace `user` and `pass` values from <https://forwardemail.net>
      user: "linh142000@gmail.com",
      pass: "xrlkjvchgjuwumko",
    },
  });

  const info = await transporter.sendMail({
    from: "linh142000@gmail.com", // sender address
    to: "linh1482000@gmail.com", // list of receivers
    subject: "Reset password", // Subject line
    text: "Hello world?", // plain text body
    html: `Your new password is: <b>${plainPassword}</b>`, // html body
  });

  res.status(201).send({
    message: "Reset password successfully",
  });
  console.log("Message sent: %s", info.messageId);
});

router.post("/changePassword", auth, async (req: any, res: Response) => {
  //validate current password
  const isMatch = await bcrypt.compare(
    req.body.currentPassword,
    req.user.password
  );
  if (!isMatch) {
    return res.status(400).send({ message: "Current password is incorrect" });
  }

  const hashedPassword = await bcrypt.hash(req.body.newPassword, 8);
  // console.log(req.user);

  //Remove old token
  const user = await User.updateOne(
    {
      _id: req.user._id,
    },
    {
      $set: { password: hashedPassword },
      $unset: { token: "" },
    }
  );
  console.log("new use", user);

  res.status(201).send({
    message: "Change password successfully",
  });
});

router.post("/register", async (req: Request, res: Response) => {
  // Create a new user
  try {
    const isExisted = await User.findOne({ email: req.body.email });
    if (isExisted) {
      console.log("existed");

      return res.status(400).send("User already registered");
    }

    if (req.body.role === User.ROLES.USER) {
      if (!req.body.studentId) {
        console.log("missing");

        return res.status(400).send("Missing studentId");
      }

      const isExistedStudentId = await User.findOne({
        studentId: req.body.studentId,
      });
      if (isExistedStudentId) {
        console.log("existed studentId");

        return res.status(400).send("StudentId already registered");
      }
    } else if (req.body.studentId) {
      console.log("studentId is only for user");

      return res.status(400).send("StudentId is only for user");
    }

    const user = new User({
      ...req.body,
      role: req.body.role ? req.body.role : User.ROLES.USER,
    });
    user.save();
    res.status(201).send(user);
  } catch (error) {
    console.log(error);
    res.status(400).send(error);
  }
});

router.post("/login", async (req: Request, res: Response) => {
  try {
    const { email, password } = req.body;
    let user = await User.findByCredentials(email, password);
    console.log(user);

    if (!user) {
      return res
        .status(401)
        .send({ error: "Login failed! Check authentication credentials" });
    }

    //generate refresh token
    const generatedData = await user.generateAuthToken();
    const userData = {
      ...user._doc,
      ...generatedData,
    };

    res.send(userData);
  } catch (error) {
    console.log(error);

    res.status(400).send({
      error: "Login failed! Check authentication credentials",
    });
  }
});

router.post("/refreshToken", async (req: Request, res: Response) => {
  try {
    const { refreshToken } = req.body;

    jwt.verify(
      refreshToken,
      process.env.REFRESH_TOKEN_SECRET,
      async (err: any, decoded: any) => {
        if (err) {
          return res.status(401).send({
            message: "Error when verify token!",
          });
        }

        if (decoded.expiredAt < new Date().getTime()) {
          return res.status(401).send({
            message: "Token expired!",
          });
        }

        const user = await User.findOne({
          _id: decoded._id,
        });

        if (!user) {
          return res.status(401).send({ error: "Cannot find user" });
        }

        const token = await jwt.sign(
          {
            _id: user._id,
            expiredAt: new Date().getTime() + 5 * 60 * 60 * 1000,
          },
          process.env.JWT_KEY
        );
        res.status(200).send({ token });
      }
    );
  } catch (error) {
    console.log(error);

    res.status(400).send({
      error: "Error when refresh token",
    });
  }
});

router.get("/me", auth, async (req: any, res: Response) => {
  res.send(req.user);
});

router.post("/update", auth, userController.updateUser);

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

router.get("/userInfo", auth, async (req: any, res: Response) => {
  const user = await User.findOne({ _id: req.user._id });
  if (!user) {
    return res.status(404).send({ error: "User not found" });
  }
  return res.status(200).json({
    user: user,
  });
});

router.get("/:userId", auth, async (req: Request, res: Response) => {
  const userId = req.params.userId;
  const findBy = req.query.findBy;
  console.log(req.params);
  if (findBy === "studentId") {
    const user = await User.findOne({ studentId: userId });
    if (!user) {
      return res.status(404).send({ error: "User not found" });
    }
    return res.status(200).json({
      user: user,
    });
  } else {
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
  }

  return res.status(400).send({
    error: "Invalid user id",
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
