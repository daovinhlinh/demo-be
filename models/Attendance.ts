import { ObjectId } from "mongodb";

const mongoose = require("mongoose");

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
});

const Attendance = mongoose.model("Attendance", attendanceSchema);
module.exports = Attendance;
