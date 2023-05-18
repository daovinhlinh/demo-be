import { NextFunction, Response } from "express";

const Class = require("../models/Class");

const getClassList = async (req: any, res: Response, next: NextFunction) => {
  try {
    const classes = await Class.find({
      "lecturer.email": req.user.email,
    });
    res.status(200).send(classes);
  } catch (error) {
    return res.status(401).send({
      message: "Cannot get list class",
    });
  }
}

const getClassDetail = async (req: any, res: Response, next: NextFunction) => {
  try {
    const classDetail = await Class.aggregate([{
      $match: {
        classId: req.params.classId,
      },
    },
    {
      $lookup: {
        from: "users",
        localField: "students",
        foreignField: "_id",
        as: "students",
      },
    },
    {
      $unwind: {
        path: "$students",
        preserveNullAndEmptyArrays: true,
      },
    }]);
    res.status(200).send(classDetail);
  } catch (error) {

  }
}

module.exports = { getClassList, getClassDetail };