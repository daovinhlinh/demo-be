import { NextFunction, Response } from "express";

const Class = require("../models/Class");
const User = require("../models/User");

const getClassList = async (req: any, res: Response) => {
  try {
    if (req.user.role === User.ROLES.USER) {
      const classes = await Class.find({ "students.id": req.user._id });
      console.log("classes", classes);

      return res.status(200).send(classes);
    } else if (req.user.role === User.ROLES.LECTURER) {
      const classes = await Class.find({
        "lecturer.email": req.user.email,
      });
      res.status(200).send(classes);
    }
  } catch (error) {
    return res.status(401).send({
      message: "Cannot get list class",
    });
  }
};

const getClassDetail = async (req: any, res: Response, next: NextFunction) => {
  try {
    const classDetail = await Class.aggregate([
      {
        $match: {
          classId: req.params.classId,
        },
      },
      {
        $lookup: {
          from: "users",
          localField: "students.id",
          foreignField: "_id",
          as: "students",
        },
      },
      // {
      //   $unwind: {
      //     path: "$students",
      //     preserveNullAndEmptyArrays: true,
      //   },
      // },
      // {
      //   $unwind: "$students"
      // },
      // {
      //   $project: {
      //     _id: 0,
      //     presentCount: 1,
      //     absentRequestCount: 1,
      //     lateCount: 1,
      //   }
      // },
    ]);
    console.log("classDetail", classDetail);

    res.status(200).send(classDetail[0]);
  } catch (error) { }
};

module.exports = { getClassList, getClassDetail };
