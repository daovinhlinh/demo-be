import { ObjectId } from "mongodb";

const mongoose = require("mongoose");

const STATUS = {
  IN_PROGRESS: "IN_PROGRESS",
  FINISHED: "FINISHED",
  CANCEL: "CANCEL",
};

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
  wifi: [
    {
      type: String,
      required: true,
    },
  ],
  status: {
    type: String,
    enum: ["IN_PROGRESS", "FINISHED"],
    required: true,
  },
  deviceList: {
    type: Array,
    required: true,
    default: []
  }
});

const Attendance = mongoose.model("Attendance", attendanceSchema);
module.exports = Attendance;
module.exports.STATUS = STATUS;
