import { Response } from "express";
import { ObjectId } from "mongodb";
import mongoose from "mongoose";

const Announcement = require("../models/Announcement");

const getAnnouncementList = async (req: any, res: Response) => {
  try {
    const data = await Announcement.aggregate([
      {
        $match: {
          classId: new mongoose.Types.ObjectId(req.params.classId),
        },
      },
      {
        $lookup: {
          from: "users",
          localField: "createdBy",
          foreignField: "_id",
          as: "createdBy",
        },
      },
      {
        $project: {
          createdBy: {
            $first: "$createdBy",
          },
          classId: 1,
          title: 1,
          content: 1,
        },
      },
    ]);
    return res.status(200).send(data);
  } catch (error) {
    console.log(error);

    return res.status(401).send({ error: "Cannot get announcement list" });
  }
};

const searchAnnouncement = async (req: any, res: Response) => {
  try {
    const data = await Announcement.aggregate([
      {
        $match: {
          classId: new ObjectId(req.query.classId),
          title: {
            $regex: req.query.title,
            $options: "i",
          },
          //search by class id and title
        },
      },
      {
        $lookup: {
          from: "users",
          localField: "createdBy",
          foreignField: "_id",
          as: "createdBy",
        },
      },
      {
        $project: {
          createdBy: {
            $first: "$createdBy",
          },
          classId: 1,
          title: 1,
          content: 1,
        },
      },
    ]);
    return res.status(200).send(data);
  } catch (error) {
    console.log(error);
    return res.status(401).send({ error: "Cannot get announcement list" });
  }
};

const addAnnouncement = async (req: any, res: Response) => {
  try {
    const newAnnouncement = new Announcement(req.body);
    await newAnnouncement.save();
    return res.status(201).send({ success: true, newAnnouncement });
  } catch (error) {
    return res.status(401).send({ error: "Cannot add announcement" });
  }
};

const deleteAnnouncement = async (req: any, res: Response) => {
  try {
    const data = await Announcement.deleteOne({
      _id: req.params.id,
      createdBy: req.user._id,
    });
    if (data.deletedCount) {
      return res
        .status(200)
        .send({ message: "Delete announcement successfully" });
    }
    return res.status(401).send({ error: "Delete failed" });
  } catch (err) {
    return res.status(401).send({
      error: "Cannot delete announcement",
    });
  }
};

//update announcement

const updateAnnouncement = async (req: any, res: Response) => {
  try {
    const data = await Announcement.updateOne(
      {
        _id: req.params.id,
        createdBy: req.user._id,
      },
      req.body
    );
    if (data.nModified) {
      return res
        .status(200)
        .send({ message: "Update announcement successfully" });
    }
    return res.status(401).send({ error: "Update failed" });
  } catch (err) {
    return res.status(401).send({
      error: "Cannot update announcement",
    });
  }
};

module.exports = {
  getAnnouncementList,
  searchAnnouncement,
  addAnnouncement,
  deleteAnnouncement,
  updateAnnouncement,
};
