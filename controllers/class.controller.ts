import { NextFunction, Response } from "express";

const Class = require("../models/Class");
const User = require("../models/User");

const getClassList = async (req: any, res: Response) => {
  try {
    if (req.user.role === User.ROLES.USER) {
      const classes = await Class.find({ "students.id": req.user._id });
      return res.status(200).send(classes);
    } else if (req.user.role === User.ROLES.LECTURER) {
      const classes = await Class.find({
        "lecturer.email": req.user.email,
      });
      res.status(200).send(classes);
    } else {
      const classes = await Class.find({
        createdBy: req.user._id,
      });
      console.log(classes);

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
          as: "temp_students",
        },
      },
      {
        $project: {
          _id: 1,
          classId: 1,
          name: 1,
          lecturer: 1,
          schedules: 1,
          semester: 1,
          note: 1,
          students: {
            $map: {
              input: "$temp_students",
              as: "student",
              in: {
                $mergeObjects: [
                  {
                    $arrayElemAt: [
                      {
                        $filter: {
                          input: "$students",
                          as: "s",
                          cond: { $eq: ["$$s.id", "$$student._id"] },
                        },
                      },
                      0,
                    ],
                  },
                  "$$student",
                ],
              },
            },
          },
        },
      },
    ]);
    res.status(200).send(classDetail[0]);
  } catch (error) {
    console.log(error);
  }
};

module.exports = { getClassList, getClassDetail };
