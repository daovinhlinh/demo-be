import { Request, Response } from "express";
import { ClientSession } from "mongoose";
import { uploads } from "../config/multer";
import { IAuth } from "../middleware/auth";

const mongoose = require("mongoose");
const express = require("express");
const Class = require("../models/Class");
const User = require("../models/User");
const auth = require("../middleware/auth");
const userController = require("../controllers/user.controller");
const classController = require("../controllers/class.controller");
const csv = require("csvtojson");

const router = express.Router();

router.get("/list", auth, classController.getClassList);

router.post(
  "/add",
  auth,
  uploads.single("students"),
  userController.grantAccess("createAny", "class"),
  async (req: Request, res: Response) => {
    try {
      const file: any = req.file;
      const fileResult = await csv().fromFile(file.path);
      console.log(fileResult);
      const studentIdList = fileResult.map((item: any) => item.student_id);

      req.body.schedules = JSON.parse(req.body.schedules);
      try {
        const isExisted = await Class.findOne({ classId: req.body.classId });
        if (isExisted) {
          return res.status(400).send({ error: "Class already registered" });
        }
        const lecturer = await User.findOne({
          email: req.body.lecturer,
          role: User.ROLES.LECTURER,
        });
        if (!lecturer) {
          return res
            .status(400)
            .send({ error: `Lecturer ${req.body.lecturer.email} not found` });
        }

        req.body.lecturer = {
          name: lecturer.name,
          email: lecturer.email,
        };

        if (!studentIdList || studentIdList.length === 0) {
          return res.status(400).send(`Missing students`);
        } else {
          const students = await User.find(
            { studentId: { $in: studentIdList }, role: User.ROLES.USER },
            { _id: 1, studentId: 1 }
          );

          if (students.length !== studentIdList.length) {
            const existStudent = students.map(
              (student: any) => student.studentId
            );
            const notFoundStudents = studentIdList.filter(
              (id: string) => !existStudent.includes(id)
            );

            return res.status(400).send({
              error: "Some students not found",
              data: notFoundStudents,
            });
          }

          req.body.students = fileResult.map((item: any) => {
            const findStudent = students.find(
              (student: any) => student.studentId === item.student_id
            );
            console.log(findStudent);

            return { id: findStudent._id };
          });
          req.body.createdBy = (req as unknown as IAuth).user._id;
          const newClass = new Class(req.body);
          await newClass.save();
          res.status(201).send({ success: true, newClass });
        }
      } catch (error) {
        console.log(error);

        return res.status(401).send(error);
      }
    } catch (error) {
      console.log(error);

      return res.status(401).send(error);
    }
  }
);

router.post(
  "/delete",
  auth,
  userController.grantAccess("updateOwn", "class"),
  async (req: any, res: Response) => {
    console.log(req.user);

    try {
      const data = await Class.deleteOne({
        _id: req.body.id,
        "lecturer.email": req.user.email,
      });
      if (data.deletedCount) {
        return res.status(200).send({ message: "Delete class successfully" });
      }
      return res.status(401).send({ error: "Delete failed" });
    } catch (err) {
      return res.status(401).send({
        error: "Cannot delete class",
      });
    }
  }
);

router.post(
  "/update",
  auth,
  userController.grantAccess("updateOwn", "class"),
  async (req: any, res: Response) => {
    try {
      const classData = await Class.findOne({
        _id: req.body.id,
      });

      if (!classData) {
        return res.status(401).send({
          message: "Class not found",
        });
      }

      await Class.updateOne(
        {
          _id: req.body.id,
        },
        {
          $set: req.body.data,
        }
      );

      return res.status(200).send({
        message: "Update class successfully",
      });
    } catch (err) {
      return res.status(401).send({
        message: "Cannot update class",
      });
    }
  }
);

router.get("/attendanceHistory", auth, classController.getAttendanceHistory);

router.post("/updateAttendance", auth, classController.updateAttendance);

router.get("/checkAttendance", auth, classController.checkClassAttendance);

router.post(
  "/attendance/absenceRequest",
  auth,
  classController.addAbsenceRequest
);

router.post(
  "/attendance/updateAbsenceRequest",
  auth,
  classController.updateAbsenceRequest
);

router.get(
  "/attendance/absenceRequest/:classId",
  auth,
  classController.getAbsenceRequest
);
router.get(
  "/attendance/getNoticeCount/:classId",
  auth,
  classController.getNoticeCount
);

router.get(
  "/attendance/:attendanceId",
  auth,
  classController.getAttendanceDetail
);

router.get("/analytic/:classId", auth, classController.getClassAnalytic);

router.get(
  "/analytic/download/:classId",
  classController.downloadClassAnalytic
);

router.get("/search", auth, classController.searchClass);

router.get("/:classId", auth, classController.getClassDetail);

module.exports = router;
