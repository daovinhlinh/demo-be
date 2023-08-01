import { NextFunction } from "express";

const mongoose = require("mongoose");
const validator = require("validator");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");

const ROLES = {
  ADMIN: "admin",
  LECTURER: "lecturer",
  USER: "user",
};

export interface IUser {
  _id: string;
  name: string;
  email: string;
  password: string;
  classes: Array<any>;
  role: string;
  studentId: string;
}

const userSchema = mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true,
    },
    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      validate: (value: string) => {
        if (!validator.isEmail(value)) {
          throw new Error("Invalid Email address");
        }
      },
    },
    password: {
      type: String,
      required: true,
      minLength: 7,
    },
    // tokens: [
    //   //save multiple tokens for login multiple devices
    //   {
    //     token: {
    //       type: String,
    //       required: true,
    //     },
    //   },
    // ],
    token: {
      type: String,
      // required: true
    },
    // classes: {
    //   type: Array,
    //   default: [],
    // },
    role: {
      type: String,
      default: ROLES.USER,
      enum: [ROLES.ADMIN, ROLES.USER, ROLES.LECTURER],
    },
    studentId: {
      type: String,
    },
  },
  {
    timestamps: true,
  }
);

userSchema.pre("save", async function (next: NextFunction) {
  // Hash the password before saving the user model
  const user = this;
  if (user.isModified("password")) {
    user.password = await bcrypt.hash(user.password, 8);
  }
  next();
});

//Instance methods -> use in user instance ~ document
userSchema.methods.generateAuthToken = async function () {
  // Generate an auth token for the user
  const user = this;
  //5 mins expired
  const token = jwt.sign(
    { _id: user._id, expiredAt: new Date().getTime() + 5 * 60 * 60 * 1000 },
    process.env.JWT_KEY
  );

  //generate refresh token
  const refreshToken = jwt.sign(
    {
      _id: user._id,
      //7D expired
      expiredAt: new Date().getTime() + 7 * 24 * 60 * 60 * 1000,
    },
    process.env.REFRESH_TOKEN_SECRET
  );
  console.log("gen new token");

  user.token = token;
  await user.save();
  return {
    token,
    refreshToken,
  };
};

//Model method
userSchema.statics.findByCredentials = async (
  email: string,
  password: string
) => {
  // Search for a user by email and password.
  const user = await User.findOne({ email });
  if (!user) {
    throw new Error("Invalid login credentials");
  }
  const isPasswordMatch = await bcrypt.compare(password, user.password);
  if (!isPasswordMatch) {
    throw new Error("Invalid login credentials");
  }
  return user;
};

const User = mongoose.model("User", userSchema);

module.exports = User;
module.exports.ROLES = ROLES;
