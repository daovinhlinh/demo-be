import { ObjectId } from "mongodb";

const mongoose = require("mongoose");

export enum AttendanceStatus {
  IN_PROGRESS = "IN_PROGRESS",
  FINISHED = "FINISHED",
}

const attendanceSchema = mongoose.Schema({
  classId: {
    type: ObjectId,
    required: true,
  },
  startTime: {
    type: Number,
    required: true,
  },
  endTime: {
    type: Number,
    required: true,
  },
  students: [
    {
      type: ObjectId,
      required: true,
    },
  ],
  status: {
    type: String,
    enum: ["IN_PROGRESS", "FINISHED"],
    required: true,
  },
});

const Attendance = mongoose.model("Attendance", attendanceSchema);
module.exports = Attendance;
