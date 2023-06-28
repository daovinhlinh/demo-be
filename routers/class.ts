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
      const studentIdList = fileResult.map((item: any) => item.id);

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
              (student: any) => student.studentId === item.id
            );
            console.log(findStudent);

            return {
              ...item,
              id: findStudent._id,
            };
          });
          req.body.createdBy = (req as unknown as IAuth).user._id;
          const newClass = new Class(req.body);
          await newClass.save();
          res.status(201).send({ success: true, newClass });
        }
      } catch (error) {
        return res.status(401).send(error);
      }
    } catch (error) {
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
    const session: ClientSession = await mongoose.startSession();

    const emailList = req.body.data.students.map(
      (student: any) => student.email
    );
    const updateData = req.body.data;
    const classData = await Class.findOne({
      _id: req.body.id,
    });

    if (!classData) {
      return res.status(401).send({
        message: "Class not found",
      });
    }

    let tempStudent: string[] = []; //Contain new and remove student
    let updateStudent: string[] = [];
    classData.students.map((student: any) => {
      if (emailList.includes(student.email)) {
        updateStudent.push(student.email);
      } else {
        tempStudent.push(student.email);
      }
    });

    let addStudent = emailList.filter(
      (email: string) => !updateStudent.includes(email)
    );
    let removeStudent = classData.students.filter((student: any) =>
      tempStudent.includes(student.email)
    );

    console.log(addStudent);
    console.log(removeStudent);
    console.log(updateStudent);

    //handle việc update lỗi 1 trong các bước thì rollback lại
    session.startTransaction();
    Promise.all([
      addStudent.length > 0 &&
        (await User.updateMany(
          {
            email: { $in: addStudent },
          },
          {
            $set: {
              classes: {
                id: req.body.id,
                name: updateData.name,
                semester: updateData.semester,
                schedules: updateData.schedules,
              },
            },
          }
        )),
      //update student
      updateStudent.length > 0 &&
        (await User.updateMany(
          {
            email: { $in: updateStudent },
            "classes.id": req.body.id,
          },
          {
            classes: {
              id: req.body.id,
              name: updateData.name,
              semester: updateData.semester,
              schedules: updateData.schedules,
            },
          }
        )),
      removeStudent.length > 0 &&
        (await User.updateMany(
          {
            email: {
              $in:
                // removeStudent.map((student: any) => student.email)
                removeStudent,
            },
          },
          {
            $pull: {
              classes: {
                id: req.body.id,
              },
            },
          },
          {
            upsert: false,
            multi: true,
          }
        )),
      await Class.updateOne(
        {
          _id: req.body.id,
          ...(req.user.role === User.ROLES.LECTURER && {
            "lecturer.email": req.user.email,
          }),
        },
        {
          $set: updateData,
        }
      ),
    ])
      .then(() => {
        session.commitTransaction();
        return res.status(200).send("Update class successfully");
      })
      .catch((err) => {
        console.log("errror", err);
        session.abortTransaction();
        return res.status(401).send({
          message: "Cannot update class",
        });
      })
      .finally(() => {
        session.endSession();
      });
  }
);

router.get("/attendanceHistory", auth, classController.getAttendanceHistory);

router.post("/updateAttendance", auth, classController.updateAttendance);

router.get(
  "/attendance/:attendanceId",
  auth,
  classController.getAttendanceDetail
);

router.get("/checkAttendance", auth, classController.checkClassAttendance);

router.get("/search", auth, classController.searchClass);

router.get("/:classId", auth, classController.getClassDetail);

module.exports = router;
