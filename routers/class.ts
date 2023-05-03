import { Request, Response } from "express";

const express = require("express");
const Class = require("../models/Class");
const User = require("../models/User");
const auth = require("../middleware/auth");
const userController = require("../controllers/user.controller");

const router = express.Router();

router.get("/list", auth, async (req: any, res: Response) => {
  try {
    const classes = await Class.find({
      "lecturer.email": req.user.email,
    });
    res.status(200).send(classes);
  } catch (error) {
    return res.status(401).send({
      message: "Cannot get list class",
    });
  }
});

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
      const emailList = req.body.students.map((student: any) => student.email);

      const students = await User.find({ email: { $in: emailList }, role: User.ROLES.USER }, { _id: 0 });
      console.log(students);

      if (students.length !== emailList.length) {
        const notFoundStudents = emailList.filter((email: string) => !students.includes(email))

        return res.status(400).send({
          message: 'Some students not found',
          data: notFoundStudents
        });
      }
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
    const classes = await Class.find({
      "lecturer.email": req.user.email,
    });
    res.status(200).send(classes);
  } catch (error) {
    return res.status(401).send({
      message: "Cannot get list class",
    });
  }
});

router.post('/update', auth, userController.grantAccess("updateOwn", 'class'), async (req: any, res: Response) => {
  const emailList = req.body.data.students.map((student: any) => student.email);
  const updateData = req.body.data
  try {
    Promise.all([
      await User.updateMany(
        {
          email: { $in: emailList },
        },
        {
          $set: {
            [`classes.${updateData.classId}`]: {
              name: updateData.name,
              semester: updateData.semester,
              schedules: updateData.schedules,
            }

          }
        }
      ),
      await Class.updateOne(
        {
          _id: req.body.id,
          ...(req.user.role === User.ROLES.LECTURER && { "lecturer.email": req.user.email })
        },
        {
          $set: updateData
        }
      )

    ]).then(() => {
      return res.status(200).send("Update class successfully");
    })


  } catch (err) {
    console.log(err);

    return res.status(401).send({
      message: "Cannot update class",
    });
  }
})

module.exports = router;
