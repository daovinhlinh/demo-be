import { ObjectId } from "mongodb";

const mongoose = require("mongoose");

const STATUS = {
  APPROVED: "APPROVED",
  REJECTED: "REJECTED",
  PENDING: "PENDING",
};

const absenceRequestSchema = mongoose.Schema({
  classId: {
    type: ObjectId,
    required: true,
  },
  studentId: {
    type: ObjectId,
    required: true,
  },
  date: {
    type: Date,
    required: true,
  },
  status: {
    type: String,
    enum: ["APPROVED", "REJECTED", "PENDING"],
    required: true,
    default: "PENDING",
  },
  reason: {
    type: String,
    required: true,
  },
});

const AbsenceRequest = mongoose.model("AbsenceRequest", absenceRequestSchema);
module.exports = AbsenceRequest;
module.exports.STATUS = STATUS;
