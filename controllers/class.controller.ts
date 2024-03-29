import { Parser } from "@json2csv/plainjs";
import dayjs from "dayjs";
import { NextFunction, Request, Response } from "express";
import { writeFileSync } from "fs";
import mongoose from "mongoose";
import path from "path";
import { pushNotification } from "../config/notification";

const Class = require("../models/Class");
const Attendance = require("../models/Attendance");
const Announcement = require("../models/Announcement");
const AbsenceRequest = require("../models/AbsenceRequest");
const User = require("../models/User");

const getClassList = async (req: any, res: Response) => {
  try {
    if (req.user.role === User.ROLES.USER) {
      const classes = await Class.find({
        "students.id": req.user._id,
      }).populate("lecturer", "name email");
      return res.status(200).send(classes);
    } else if (req.user.role === User.ROLES.LECTURER) {
      const classes = await Class.find({
        lecturer: req.user._id,
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
          localField: "lecturer",
          foreignField: "_id",
          as: "lecturer",
        },
      },
      {
        $unwind: "$lecturer",
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
          lecturer: {
            name: "$lecturer.name",
            email: "$lecturer.email",
          },
          schedules: 1,
          semester: 1,
          note: 1,
          absenceRequests: 1,
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

    const absenceCount = await AbsenceRequest.countDocuments({
      classId: req.params.classId,
      status: AbsenceRequest.STATUS.PENDING,
    });

    const annoucementCount = await Announcement.countDocuments({
      classId: req.params.classId,
    });

    res.status(200).send({ ...classDetail[0], absenceCount, annoucementCount });
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
    }).sort({ createdAt: 1 });

    return res.status(200).send(attendance);
  } catch (error) {
    console.log(error);
    return res.status(401).send({
      success: false,
      message: "Cannot get attendance list",
    });
  }
};

const getAttendanceDetail = async (req: any, res: Response) => {
  try {
    if (req.user.role === User.ROLES.USER) {
      const attendance = await Attendance.findOne({
        _id: req.params.attendanceId,
      }).lean();

      const absenceRequest = await AbsenceRequest.find({
        studentId: req.user._id,
        date: {
          //check if date is same day as attendance date
          $gte: dayjs(attendance.startTime).startOf("day").toDate(),
        },
      }).lean();

      if (absenceRequest) {
        return res.status(200).send({
          ...attendance,
          absenceRequest,
        });
      } else {
        return res.status(200).send({
          ...attendance,
          absenceRequest: null,
        });
      }
    } else {
      // const attendance = await Attendance.aggregate([
      //   {
      //     $match: {
      //       _id: new mongoose.Types.ObjectId(req.params.attendanceId),
      //     },
      //   },
      //   {
      //     $lookup: {
      //       from: "users",
      //       localField: "students",
      //       foreignField: "_id",
      //       as: "checkinStudent",
      //     },
      //   },
      // ]);

      const attendance = await Attendance.findOne({
        _id: new mongoose.Types.ObjectId(req.params.attendanceId),
      });
      console.log(attendance);

      // const classData = await Class.findOne({
      //   _id: attendance.classId,
      // });
      // console.log(classData);

      // const missStudent = classData.students.filter((student: any) => {
      //   return !attendance[0].students.some((el: any) =>
      //     el._id.equals(student.id)
      //   );
      // });

      return res.status(200).send(attendance);

      // if (missStudent.length > 0) {
      //   const missStudentData = await User.find({
      //     _id: { $in: missStudent.map((el: any) => el.id) },
      //   });
      //   return res
      //     .status(200)
      //     .send({ ...attendance[0], missStudent: missStudentData });
      // } else {
      //   return res.status(200).send({ ...attendance[0], missStudent: [] });
      // }
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
      //check finish
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
        classData.save();
        attendance.students.push(
          new mongoose.Types.ObjectId(req.body.studentId)
        );

        attendance.invalidCheckIn = attendance.invalidCheckIn.filter(
          (el: any) => !el.equals(req.body.studentId)
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
        classData.save();
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
    console.log(error);

    return res.status(401).send({
      success: false,
      message: "Cannot update attendance",
    });
  }
};

const addAbsenceRequest = async (req: any, res: Response) => {
  try {
    const classData = await Class.findOne({
      _id: req.body.classId,
      "students.id": req.user._id,
    });

    console.log("classData", classData);

    //Check if student is in class
    if (!classData) {
      return res.status(401).send({
        success: false,
        message: "Cannot find class",
      });
    }

    //Check if student has already requested
    const request = await AbsenceRequest.findOne({
      classId: req.body.classId,
      studentId: req.user._id,
      date: {
        $gte: dayjs(req.body.date).startOf("day").toDate(),
        $lte: dayjs(req.body.date).endOf("day").toDate(),
      },
      status: AbsenceRequest.STATUS.PENDING,
    });

    if (request) {
      return res.status(401).send({
        success: false,
        message: "You have already requested",
      });
    }

    // const lecturer = await User.findOne({
    //   email: classData.lecturer.email,
    // });

    const newRequest = new AbsenceRequest({
      classId: req.body.classId,
      studentId: req.user._id,
      reason: req.body.reason,
      date: req.body.date,
    });
    console.log("newRequest", newRequest);

    await newRequest.save();

    pushNotification(
      "New absence request",
      `You have a new absence request in class ${classData.name}`,
      classData.lecturer,
      {
        screen: "AbsenceList",
        data: {
          id: classData._id,
        },
      }
    );

    return res.status(200).send({
      success: true,
      message: "Request absence successfully",
    });
  } catch (error) {
    return res.status(401).send({
      success: false,
      message: "Cannot request absence",
    });
  }
};

const getAbsenceRequest = async (req: any, res: Response) => {
  try {
    const requests = await AbsenceRequest.aggregate([
      {
        $match: {
          classId: new mongoose.Types.ObjectId(req.params.classId),
          ...(req.user.role === User.ROLES.USER && { studentId: req.user._id }),
        },
      },
      {
        $lookup: {
          from: "users",
          localField: "studentId",
          foreignField: "_id",
          as: "student",
        },
      },
      {
        $project: {
          student: {
            $first: "$student",
          },
          classId: 1,
          reason: 1,
          date: 1,
          status: 1,
        },
      },
    ]);
    // const requests = await AbsenceRequest.find({
    //   classId: req.params.classId,
    //   ...(req.user.role === User.ROLES.USER && { studentId: req.user._id }),
    // });

    return res.status(200).send(requests);
  } catch (error) {
    return res.status(401).send({
      success: false,
      message: "Cannot get absence request",
    });
  }
};

//approve/reject absence request
const updateAbsenceRequest = async (req: any, res: Response) => {
  try {
    const request = await AbsenceRequest.findOne({
      _id: req.body.requestId,
    });
    console.log("request", request);

    if (request) {
      const classData = await Class.findOne({
        _id: request.classId,
      }).lean();
      console.log(classData);

      if (!classData) {
        return res.status(401).send({
          success: false,
          message: "Cannot find class",
        });
      }
      console.log(req.body.status);

      if (req.body.status === AbsenceRequest.STATUS.APPROVED) {
        //Update student absence count
        classData.students.forEach((student: any) => {
          if (student.id.equals(request.studentId)) {
            student.absentRequestCount += 1;
          }
        });

        const completedAttendance = await Attendance.find({
          classId: request.classId,
          startTime: {
            $gte: dayjs(request.date).startOf("day").toDate(),
            $lte: dayjs(request.date).endOf("day").toDate(),
          },
          status: Attendance.STATUS.FINISHED,
        });

        if (completedAttendance.length > 0) {
          classData.students.forEach((student: any) => {
            if (student.id.equals(request.studentId)) {
              student.absentCount += completedAttendance.length;
            }
          });
        }
        console.log("completedAttendance", completedAttendance);
        const requestDate = dayjs(request.date).format("DDMMYYYY");
        if (
          classData.absenceRequests &&
          classData.absenceRequests[requestDate]
        ) {
          if (
            !classData.absenceRequests[requestDate].includes(request.studentId)
          ) {
            classData.absenceRequests[requestDate].push(request.studentId);
          }
        } else {
          classData.absenceRequests[requestDate] = [request.studentId];
        }

        const attendances = await Attendance.updateMany(
          {
            classId: request.classId,
            startTime: {
              $gte: dayjs(request.date).startOf("day").toDate(),
              $lte: dayjs(request.date).endOf("day").toDate(),
            },
            //check if student not in students array
            students: {
              $nin: [request.studentId],
            },
          },
          {
            $push: {
              students: request.studentId,
            },
            //remove studentId if in invalidStudent array
            $pull: {
              invalidCheckIn: request.studentId,
            },
          }
        );

        console.log("attendances", attendances);
        pushNotification(
          "Absence request approved",
          `Your absence request in class ${classData.name} has been approved`,
          request.studentId
        );
        await Class.findByIdAndUpdate(classData._id, classData, {
          new: true,
        });
      } else if (req.body.status === AbsenceRequest.STATUS.REJECTED) {
        await AbsenceRequest.updateOne(
          {
            _id: req.body.requestId,
          },
          {
            status: AbsenceRequest.STATUS.APPROVED,
          }
        );
        pushNotification(
          "Absence request rejected",
          `Your absence request in class ${classData.name} has been rejected`,
          request.studentId
        );
      } else if (req.body.status === "DELETE") {
        await AbsenceRequest.deleteOne({
          _id: req.body.requestId,
          studentId: req.user._id,
        });

        return res.status(200).send({
          success: true,
          message: "Delete absence request successfully",
        });
      }

      request.status = req.body.status;
      await request.save();

      return res.status(200).send({
        success: true,
        message: "Update absence request successfully",
      });
    }

    return res.status(401).send({
      success: false,
      message: "Cannot find absence request",
    });
  } catch (error) {
    console.log(error);

    return res.status(401).send({
      success: false,
      message: "Cannot update absence request",
    });
  }
};

const getNoticeCount = async (req: any, res: Response) => {
  try {
    const absenceCount = await AbsenceRequest.countDocuments({
      classId: req.params.classId,
      status: AbsenceRequest.STATUS.PENDING,
    });

    const annoucementCount = await Announcement.countDocuments({
      classId: req.params.classId,
    });

    return res.status(200).send({
      absence: absenceCount,
      annoucement: annoucementCount,
    });
  } catch (error) {
    return res.status(401).send({
      success: false,
      message: "Cannot get notice count",
    });
  }
};

const getClassAnalytic = async (req: Request, res: Response) => {
  const filter = req.query.filter;
  console.log(filter);

  //Get class attendance list
  const attendanceData = await Attendance.find({
    classId: req.params.classId,
    status: Attendance.STATUS.FINISHED,
    ...(filter != "" && {
      startTime: {
        //This week , convert to timestamp
        $gte:
          filter === "week"
            ? dayjs().startOf("week").toDate().getTime()
            : filter === "month"
              ? dayjs().startOf("month").toDate().getTime()
              : filter === "today"
                ? dayjs().startOf("day").toDate().getTime()
                : null,
      },
    }),
  }).lean();
  console.log({ attendanceData });

  const analytic = {
    total: 0,
    valid: 0,
    invalid: 0,
    missed: 0,
    approveAbsent: 0,
    rejectAbsent: 0,
  };

  //Count total length in student field and invalidCheckIn field for each attendance and return in object
  attendanceData.forEach((attendance: any) => {
    analytic.valid += attendance.students.length;

    if (attendance.invalidCheckIn) {
      analytic.invalid += attendance.invalidCheckIn.length;
    }
  });

  //Get class data
  const classData = await Class.findOne({
    _id: req.params.classId,
  }).lean();

  //Get absent request data
  const absenceRequestData = await AbsenceRequest.find({
    classId: req.params.classId,
    ...(filter != "" && {
      date: {
        $gte:
          filter === "week"
            ? dayjs().startOf("week").toDate()
            : filter === "month"
              ? dayjs().startOf("month").toDate()
              : filter === "today"
                ? dayjs().startOf("day").toDate()
                : null,
      },
    }),
  }).lean();

  absenceRequestData.forEach((request: any) => {
    if (request.status === AbsenceRequest.STATUS.APPROVED) {
      analytic.approveAbsent += 1;
    } else if (request.status === AbsenceRequest.STATUS.REJECTED) {
      analytic.rejectAbsent += 1;
    }
  });

  analytic.total = classData.students.length * attendanceData.length;

  analytic.missed =
    classData.students.length * attendanceData.length - analytic.valid;

  return res.status(200).send(analytic);
};

const downloadClassAnalytic = async (req: Request, res: Response) => {
  const filter = req.query.filter;
  console.log(filter);

  const data: any = [];

  //Get class data
  const classData = await Class.findOne({
    _id: req.params.classId,
  }).lean();

  //Get absent request data
  const absenceRequestData = await AbsenceRequest.find({
    classId: req.params.classId,
    //check statuus not pending
    status: {
      $ne: AbsenceRequest.STATUS.PENDING,
    },
    ...(filter != "" && {
      date: {
        $gte:
          filter === "week"
            ? dayjs().startOf("week").toDate()
            : filter === "month"
              ? dayjs().startOf("month").toDate()
              : filter === "today"
                ? dayjs().startOf("day").toDate()
                : null,
      },
    }),
  }).lean();

  //Get class attendance list
  const attendanceData = await Attendance.find({
    classId: req.params.classId,
    status: Attendance.STATUS.FINISHED,
    ...(filter != "" && {
      startTime: {
        //This week , convert to timestamp
        $gte:
          filter === "week"
            ? dayjs().startOf("week").toDate().getTime()
            : filter === "month"
              ? dayjs().startOf("month").toDate().getTime()
              : filter === "today"
                ? dayjs().startOf("day").toDate().getTime()
                : null,
      },
    }),
  }).lean();

  for (const student of classData.students) {
    const rejectAbsent = absenceRequestData.filter(
      (request: any) =>
        request.studentId.equals(student.id) &&
        request.status === AbsenceRequest.STATUS.REJECTED
    ).length;

    const approveAbsent = absenceRequestData.filter(
      (request: any) =>
        request.studentId.equals(student.id) &&
        request.status === AbsenceRequest.STATUS.APPROVED
    ).length;

    const invalidCheckIn = await Attendance.find({
      classId: req.params.classId,
      status: Attendance.STATUS.FINISHED,
      invalidCheckIn: {
        $elemMatch: {
          studentId: student._id,
        },
      },
      ...(filter != "" && {
        startTime: {
          $gte:
            filter === "week"
              ? dayjs().startOf("week").toDate().getTime()
              : filter === "month"
                ? dayjs().startOf("month").toDate().getTime()
                : filter === "today"
                  ? dayjs().startOf("day").toDate().getTime()
                  : null,
        },
      }),
    }).countDocuments();

    let validCheckIn = 0;

    for (const attendance of attendanceData) {
      for (const studentId of attendance.students) {
        if (studentId.equals(student.id)) {
          validCheckIn += 1;
        }
      }
    }

    const studentData = {
      studentId: student.id,
      "Valid Check In": validCheckIn,
      "Invalid Check In": invalidCheckIn,
      "Missed Check In": attendanceData.length - validCheckIn,
      "Rejected Absent": rejectAbsent,
      "Approved Absent": approveAbsent,
    };

    console.log(studentData);
    data.push(studentData);
  }
  console.log(data);

  //Get class attendance list
  // const attendanceData = await Attendance.find({
  //   classId: req.params.classId,
  //   status: Attendance.STATUS.FINISHED,
  //   ...(filter != "" && {
  //     startTime: {
  //       //This week , convert to timestamp
  //       $gte:
  //         filter === "week"
  //           ? dayjs().startOf("week").toDate().getTime()
  //           : filter === "month"
  //             ? dayjs().startOf("month").toDate().getTime()
  //             : filter === "today"
  //               ? dayjs().startOf("day").toDate().getTime()
  //               : null,
  //     },
  //   }),
  // }).lean();

  const parser = new Parser();
  const csv = parser.parse(data);
  console.log("download");

  writeFileSync(
    `${path.join(__dirname, "../public/uploads/csv")}/test.csv`,
    csv
  );

  res.download(
    `${path.join(__dirname, "../public/uploads/csv")}/test.csv`,
    "test.csv",
    (err) => console.log(err)
  );

  // const input = createReadStream(
  //   `${path.join(__dirname, "../public/uploads/csv")}/test.csv`,
  //   { encoding: "utf8" }
  // ));
};

module.exports = {
  getClassList,
  getClassDetail,
  checkClassAttendance,
  getAttendanceHistory,
  searchClass,
  getAttendanceDetail,
  updateAttendance,
  addAbsenceRequest,
  getAbsenceRequest,
  updateAbsenceRequest,
  getNoticeCount,
  getClassAnalytic,
  downloadClassAnalytic,
};
