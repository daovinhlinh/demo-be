import { NextFunction, Request, Response } from "express";
import mongoose from "mongoose";

const Class = require("../models/Class");
const Attendance = require("../models/Attendance");
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
          _id: new mongoose.Types.ObjectId(req.params.classId),
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

const checkClassAttendance = async (req: Request, res: Response) => {
  try {
    const attendance = await Attendance.findOne({
      classId: req.query.classId,
      status: Attendance.STATUS.IN_PROGRESS,
    });
    if (attendance) {
      return res.status(200).send({
        success: true,
        data: attendance,
      });
    } else {
      return res.status(200).send({
        success: true,
        data: null,
      });
    }
  } catch (error) {
    return res.status(401).send({
      success: false,
      message: "Cannot get attendance list",
    });
  }
};

const getAttendanceHistory = async (req: Request, res: Response) => {
  try {
    console.log(req.query);

    const attendance = await Attendance.find({
      classId: req.query.classId,
    });

    return res.status(200).send(attendance);
  } catch (error) {
    return res.status(401).send({
      success: false,
      message: "Cannot get attendance list",
    });
  }
};

const getAttendanceDetail = async (req: Request, res: Response) => {
  try {
    const attendance = await Attendance.aggregate([
      {
        $match: {
          _id: new mongoose.Types.ObjectId(req.params.attendanceId),
        },
      },
      {
        $lookup: {
          from: "users",
          localField: "students",
          foreignField: "_id",
          as: "checkinStudent",
        },
      },
      // {
      //   $project: {
      //     _id: 1,
      //     classId: 1,
      //     note: 1,
      //     status: 1,
      //     startTime: 1,
      //     endTime: 1,
      //     students: {
      //       $map: {
      //         input: "$temp_students",
      //         as: "student",
      //         in: {
      //           $mergeObjects: [
      //             {
      //               $arrayElemAt: [
      //                 {
      //                   $filter: {
      //                     input: "$students",
      //                     as: "s",
      //                     cond: { $eq: ["$$s", "$$student._id"] },
      //                   },
      //                 },
      //                 0,
      //               ],
      //             },
      //             "$$student",
      //           ],
      //         },
      //       },
      //     },
      //   },
      // },
    ]);

    const classData = await Class.findOne({
      _id: attendance[0].classId,
    });
    console.log(classData);
    console.log(attendance[0]);

    const missStudent = classData.students.filter((student: any) => {
      return !attendance[0].students.some((el: any) =>
        el._id.equals(student.id)
      );
    });

    if (missStudent.length > 0) {
      const missStudentData = await User.find({
        _id: { $in: missStudent.map((el: any) => el.id) },
      });
      return res
        .status(200)
        .send({ ...attendance[0], missStudent: missStudentData });
    } else {
      return res.status(200).send({ ...attendance[0], missStudent: [] });
    }
  } catch (error) {
    console.log(error);

    return res.status(401).send({
      success: false,
      message: "Cannot get attendance list",
    });
  }
};

const searchClass = async (req: Request, res: Response) => {
  //Search by name
  try {
    const classes = await Class.find({
      name: { $regex: req.query.name, $options: "i" },
      ...(req.query.filter && req.query.filter === "This semester"
        ? { semester: req.query.semester }
        : req.query.filter === "Today"
        ? { day: new Date().getDay, semester: req.query.semester }
        : {}),
    });
    return res.status(200).send(classes);
  } catch (error) {
    return res.status(401).send({
      success: false,
      message: "Cannot get class list",
    });
  }
};

const updateAttendance = async (req: Request, res: Response) => {
  try {
    console.log(req.body);

    const attendance = await Attendance.findOne({
      _id: req.body.attendanceId,
    });
    if (attendance) {
      //update student from checkin to missed or vice versa

      //Update miss to checked in
      if (req.body.status === 1) {
        //find class and increase student checkin count and decrease miss count
        const classData = await Class.findOne({
          _id: attendance.classId,
          "students.id": req.body.studentId,
        });

        classData.students.forEach((student: any) => {
          if (student.id.equals(req.body.studentId)) {
            student.lateCount -= student.lateCount > 0 ? 1 : 0;
            student.presentCount += 1;
          }
        });

        attendance.students.push(
          new mongoose.Types.ObjectId(req.body.studentId)
        );
      } else if (req.body.status === 2) {
        //Update checked in to miss
        //find class and increase student miss count and decrease checkin count
        const classData = await Class.findOne({
          _id: attendance.classId,
          "students.id": req.body.studentId,
        });

        classData.students.forEach((student: any) => {
          if (student.id.equals(req.body.studentId)) {
            student.presentCount -= student.presentCount > 0 ? 1 : 0;
            student.lateCount += 1;
          }
        });

        attendance.students = attendance.students.filter(
          (el: any) => !el.equals(req.body.studentId)
        );
      }

      await attendance.save();
      return res.status(200).send({
        success: true,
        message: "Update attendance successfully",
      });
    }

    return res.status(401).send({
      success: false,
      message: "Cannot find attendance",
    });
  } catch (error) {
    return res.status(401).send({
      success: false,
      message: "Cannot update attendance",
    });
  }
};

module.exports = {
  getClassList,
  getClassDetail,
  checkClassAttendance,
  getAttendanceHistory,
  searchClass,
  getAttendanceDetail,
  updateAttendance,
};
