import { NextFunction } from "express";
import { Schema } from "mongoose";

const mongoose = require("mongoose");
const User = require("../models/User");

const DAYS = {
  MON: 1,
  TUE: 2,
  WED: 3,
  THU: 4,
  FRI: 5,
  SAT: 6,
  SUN: 7,
};

const classSchema = mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
    },
    classId: {
      type: String,
      required: true,
    },
    semester: {
      type: String,
      required: true,
    },
    lecturer: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    note: {
      type: String,
    },
    schedules: [
      {
        day: {
          type: Number,
          enum: [
            DAYS.MON,
            DAYS.TUE,
            DAYS.WED,
            DAYS.THU,
            DAYS.FRI,
            DAYS.SAT,
            DAYS.SUN,
          ],
          required: true,
        },
        location: {
          type: String,
          required: true,
        },
        startTime: {
          type: String,
          required: true,
        },
        endTime: {
          type: String,
          required: true,
        },
      },
    ],
    students: [
      {
        id: {
          type: mongoose.Schema.Types.ObjectId,
          ref: "User",
          required: true,
        },
        presentCount: {
          type: Number,
          default: 0,
        },
        absentRequestCount: {
          type: Number,
          default: 0,
        },
        lateCount: {
          type: Number,
          default: 0,
        },
        _id: false,
      },
    ],
    //data type: absenceRequests: {"02072023": [studentId]}
    absenceRequests: {
      type: Object,
      default: {},
    },
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
    },
  },
  {
    timestamps: true,
    strict: false,
  }
);

// classSchema.pre("save", async function (next: NextFunction) {
//   const classData = this;

//   // const studentList = classData.students.map((student: any) => student.id);

//   for (const student of classData.students) {
//     const studentData = await User.findById(student.id);

//     if (studentData) {
//       const enrollClasses = studentData.classes;

//       const existingClassIndex = enrollClasses.findIndex((item: any) => item.id === classData._id);

//       if (existingClassIndex !== -1) {
//         enrollClasses[existingClassIndex].presentCount = student.presentCount;
//         enrollClasses[existingClassIndex].absentRequestCount = student.absentRequestCount;
//         enrollClasses[existingClassIndex].lateCount = student.lateCount;
//       } else {
//         enrollClasses.push({
//           id: classData._id,
//           presentCount: student.presentCount,
//           absentRequestCount: student.absentRequestCount,
//           lateCount: student.lateCount,
//         });
//       }
//       console.log('enrollClasses', enrollClasses);

//       await User.updateOne(
//         { _id: student.id },
//         { $set: { classes: enrollClasses } }
//       );
//     }
//   }

//   //update lecturer class
//   await User.updateOne(
//     { email: classData.lecturer.email },
//     { $push: { classes: { id: classData._id } } }
//   )
//   next();
// })

const Class = mongoose.model("Class", classSchema);
module.exports = Class;
export {};
