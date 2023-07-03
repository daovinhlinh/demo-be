import { ObjectId } from "mongodb";

const mongoose = require("mongoose");

const announcementSchema = mongoose.Schema(
  {
    classId: {
      type: ObjectId,
      required: true,
    },
    title: {
      type: String,
      required: true,
    },
    content: {
      type: String,
    },
    createdBy: {
      type: ObjectId,
      required: true,
    },
  },
  {
    timestamps: true,
  }
);

const Announcement = mongoose.model("Announcement", announcementSchema);

module.exports = Announcement;
