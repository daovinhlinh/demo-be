import { NextFunction } from "express";

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
      name: {
        type: String,
        required: true,
      },
      email: {
        type: String,
        required: true,
      },
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
          required: true
        },
        location: {
          name: {
            type: String,
            required: true,
          },
          wifi: {
            type: Object,
            required: true,
          },
        },
        time: {
          start: {
            type: String,
            required: true,
          },
          end: {
            type: String,
            required: true,
          },
        },
        attendanceTime: {
          start: {
            type: String,
            required: true,
          },
          end: {
            type: String,
            required: true,
          },
        },
      },
    ],
    students: [
      // {
      //   name: {
      //     type: String,
      //     required: true,
      //   },
      //   email: {
      //     type: String,
      //     required: true,
      //   },
      //   idNumber: {
      //     type: String,
      //     required: true,
      //   }
      // }
      {
        type: mongoose.Schema.Types.ObjectId
      },
    ]
  },
  {
    timestamps: true,
  }
);

classSchema.pre("save", async function (next: NextFunction) {
  const classData = this;

  const studentList = classData.students.map((student: any) => student.email);
  console.log(studentList);

  await User.updateMany(
    {
      email: { $in: studentList },
    },
    {
      $set: {
        classes: {
          id: classData._id,
          name: classData.name,
          semester: classData.semester,
          schedules: classData.schedules,
        }

      }
    }
  )
  next();
});

const Class = mongoose.model("Class", classSchema);
module.exports = Class;
export { };
