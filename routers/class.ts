import { Request, Response } from "express";
import { ClientSession } from "mongoose";

const mongoose = require("mongoose");
const express = require("express");
const Class = require("../models/Class");
const User = require("../models/User");
const auth = require("../middleware/auth");
const userController = require("../controllers/user.controller");
const classController = require("../controllers/class.controller");

const router = express.Router();

router.get("/list", auth, classController.getClassList);

router.get("/detail/:classId", auth, classController.getClassDetail);

router.post("/add", auth, userController.grantAccess('createAny', 'class'), async (req: Request, res: Response) => {
  try {
    const isExisted = await Class.findOne({ classId: req.body.classId });
    if (isExisted) {
      return res.status(400).send("Class already registered");
    }
    const lecturer = await User.findOne({ email: req.body.lecturer.email, role: User.ROLES.LECTURER });
    if (!lecturer) {
      return res.status(400).send(`Lecturer ${req.body.lecturer.email} not found`);
    }

    if (!req.body.students || req.body.students.length === 0) {
      return res.status(400).send(`Missing students`);
    } else {
      // const studentIdList = req.body.students.map((student: any) => student.studentId);
      // console.log('students', req.body.students);

      const students = await User.find({ studentId: { $in: req.body.students }, role: User.ROLES.USER }, { _id: 1, studentId: 1 });

      if (students.length !== req.body.students.length) {
        const existStudent = students.map((student: any) => student.studentId);
        const notFoundStudents = req.body.students.filter((id: string) => !existStudent.includes(id))

        // User.insertMany(notFoundStudents.map((studentId: string) => ({ studentId, role: User.ROLES.USER })));

        return res.status(400).send({
          message: 'Some students not found',
          data: notFoundStudents
        });
      }

      req.body.students = students.map((student: any) => ({
        id: student._id,
        presentCount: 1,
        absentRequestCount: 0,
        lateCount: 0,
      }));


      // else {
      //   const updateResult = await User.updateMany(
      //     {
      //       email: { $in: emailList },
      //     },
      //     {
      //       $set: {
      //         [`classes.${req.body.classId}`]: {
      //           name: req.body.name,
      //           semester: req.body.semester,
      //           schedules: req.body.schedules,
      //         }
      //       }
      //     }
      //   )
      //   console.log('updateResult', updateResult);

      // }

      const newClass = new Class(req.body);
      await newClass.save();
      res.status(201).send({ newClass });
    }
  } catch (error) {
    console.log(error);

    return res.status(401).send(error);
  }
});

router.post("/delete", auth, userController.grantAccess("updateOwn", 'class'), async (req: any, res: Response) => {
  console.log(req.user);

  try {
    const data = await Class.deleteOne({
      _id: req.body.id,
      "lecturer.email": req.user.email,
    });
    if (data.deletedCount) {
      return res.status(200).send("Delete class successfully");
    }
    return res.status(401).send("Delete failed");

  } catch (err) {
    return res.status(401).send({
      message: "Cannot delete class",
    });
  }
});

router.get('/schedule', auth, async (req: any, res: Response) => {
  try {
    const classes = await Class.find([null],
      {
        a: 1
      }
    );

    console.log(classes);

    res.status(200).send(classes);
  } catch (error) {
    return res.status(401).send({
      message: "Cannot get list class",
    });
  }
});

router.post('/update', auth, userController.grantAccess("updateOwn", 'class'), async (req: any, res: Response) => {
  const session: ClientSession = await mongoose.startSession();

  const emailList = req.body.data.students.map((student: any) => student.email);
  const updateData = req.body.data;
  const classData = await Class.findOne({
    _id: req.body.id
  });

  if (!classData) {
    return res.status(401).send({
      message: "Class not found",
    });
  }
  console.log(classData);

  let tempStudent: string[] = []; //Contain new and remove student
  let updateStudent: string[] = [];
  classData.students.map((student: any) => {
    if (emailList.includes(student.email)) {
      updateStudent.push(student.email);
    } else {
      tempStudent.push(student.email);
    }
  })

  let addStudent = emailList.filter((email: string) => !updateStudent.includes(email));
  let removeStudent = classData.students.filter((student: any) => tempStudent.includes(student.email));

  console.log(addStudent);
  console.log(removeStudent);
  console.log(updateStudent);

  //handle việc update lỗi 1 trong các bước thì rollback lại
  session.startTransaction();
  Promise.all([
    addStudent.length > 0 &&
    await User.updateMany(
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
          }

        },
      }
    ),
    //update student
    updateStudent.length > 0 &&
    await User.updateMany(
      {
        email: { $in: updateStudent },
        "classes.id": req.body.id
      },
      {
        classes: {
          id: req.body.id,
          name: updateData.name,
          semester: updateData.semester,
          schedules: updateData.schedules,
        },
      }
    ),
    removeStudent.length > 0 &&
    await User.updateMany(
      {
        email: {
          $in:
            // removeStudent.map((student: any) => student.email)
            removeStudent
        },
      },
      {
        $pull: {
          classes: {
            id: req.body.id
          }
        },
      },
      {
        upsert: false,
        multi: true
      }
    ),
    await Class.updateOne(
      {
        _id: req.body.id,
        ...(req.user.role === User.ROLES.LECTURER && { "lecturer.email": req.user.email })
      },
      {
        $set: updateData,
      }
    ),

  ]).then(() => {
    session.commitTransaction();
    return res.status(200).send("Update class successfully");
  }).catch(err => {
    console.log('errror', err);
    session.abortTransaction();
    return res.status(401).send({
      message: "Cannot update class",
    });
  }).finally(() => {
    session.endSession();
  })
})

module.exports = router;
