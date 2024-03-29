import { Server } from "socket.io";
import { Socket } from "socket.io/dist/socket";
import { io } from "..";
import { convertArrayDocsToObject, hasMatchingElement } from "../commons";
import { pushNotification } from "../config/notification";
import mongoose, { ObjectId } from "mongoose";
import dayjs from "dayjs";

const Attendance = require("../models/Attendance");
const User = require("../models/User");
const Class = require("../models/Class");

const handleStopAttendance = async (
  socket: Socket,
  timerId: NodeJS.Timeout,
  classId: string
) => {
  try {
    const attendanceData = await Attendance.findOne({
      classId: classId,
      status: Attendance.STATUS.IN_PROGRESS,
    });

    if (attendanceData) {
      attendanceData.status = Attendance.STATUS.FINISHED;
    }

    const classData = await Class.findOne({ _id: classId });
    classData.students.forEach((student: any) => {
      if (!attendanceData.students.some((id: any) => id.equals(student.id))) {
        student.lateCount++;
      } else {
        //Check if today have absence request and user is not in absence request or today not have absence request
        student.presentCount++;
        if (
          classData.absenceRequests[dayjs(Date.now()).format("DDMMYYYY")] &&
          classData.absenceRequests[dayjs(Date.now()).format("DDMMYYYY")].some(
            (id: any) => id.equals(student.id)
          )
        ) {
          student.absentRequestCount++;
        }
      }
    });
    // await classData.save();

    const newClassData = await Class.findByIdAndUpdate(classId, classData, {
      new: true,
    });

    console.log("attendance data", newClassData);

    await Attendance.findOneAndUpdate(
      {
        classId: classId,
        status: Attendance.STATUS.IN_PROGRESS,
      },
      attendanceData,
      {
        new: true,
      }
    );

    // await attendanceData.save();
    clearTimeout(timerId);
    io.emit(`stopAttendance_${classId}`, {
      success: true,
      // data: attendance
    });

    await pushNotification(
      "Attendance",
      "Attendance session has ended",
      classData.classId
      // {
      //   key: classId,
      //   value: true,
      // }
    );
  } catch (e) {
    socket.emit(`stopAttendance_${classId}`, {
      success: false,
      error: "error",
      // data: attendance
    });
  }
};

const socketHandler = (io: Server) => {
  const changeStream = Attendance.watch();
  const changeClassStream = Class.watch();

  io.on("connection", (socket: Socket) => {
    console.log("a user connected");
    let timer: NodeJS.Timeout;

    changeStream.on("change", async (change: any) => {
      console.log("change", change);
      //handle update data here
      //change data is array of ids
      //convert ids to list users data
      //send to client
      // const attendanceList = await Attendance.find({

      const updatedAttendance = await Attendance.findOne({
        _id: change.documentKey._id,
      }).lean();

      const attendanceList = await Attendance.find({
        classId: updatedAttendance.classId,
      }).lean();

      const classData = await Class.findOne({
        _id: updatedAttendance.classId,
      }).lean();

      console.log("updatedAttendance", updatedAttendance);

      if (change.operationType == "update") {
        // async.eachSeries(change.updateDescription.)
        // const updateData = convertArrayDocsToObject(
        //   change.updateDescription.updatedFields,
        //   "students"
        // );

        try {
          // const students = await User.find({
          //   _id: {
          //     $in: updatedAttendance.students,
          //   },
          //   role: User.ROLES.USER,
          // });

          // const classData = await Class.findOne({
          //   _id: updatedAttendance.classId,
          // });

          // const uncheckList = classData.students.filter(
          //   (student: any) =>
          //     !updatedAttendance.students.some((id: any) =>
          //       id.equals(student.id)
          //     ) && !updatedAttendance.invalidCheckIn.some((id: any) =>
          //       id.equals(student.id)
          //     )
          // );
          // console.log("uncheckList", uncheckList);

          // const uncheckStudents = await User.find({
          //   _id: {
          //     $in: uncheckList.map((item: any) => item.id),
          //   },
          //   role: User.ROLES.USER,
          // });

          socket.emit(`updateAttendance_${updatedAttendance._id}`, {
            success: true,
            data: updatedAttendance,
          });

          socket.emit(`updateHistory_${updatedAttendance.classId}`, {
            success: true,
            data: attendanceList,
          });
          console.log(`updateAnalytics_${updatedAttendance.classId}`);

        } catch (e) {
          socket.emit(`updateAttendance_${updatedAttendance._id}`, {
            success: false,
            data: e,
          });

          socket.emit(`updateHistory_${updatedAttendance.classId}`, {
            success: true,
            data: e,
          });
          console.log(e);
        }
      }
    });

    changeClassStream.on("change", async (change: any) => {
      console.log("change", change);
      //handle update data here
      const updatedClass = await Class.findOne({
        _id: change.documentKey._id,
      }).lean();

      if (updatedClass) {
        socket.emit(`updateClass_${change.documentKey._id}`, {
          success: true,
          data: updatedClass.students,
        });
      }
    })

    socket.on("startAttendance", async ({ classId, wifi, time }) => {
      try {
        const hasAttendance = await Attendance.findOne({
          classId: classId,
          status: "IN_PROGRESS",
        });

        if (hasAttendance) {
          return io.to(socket.id).emit(`startAttendance`, {
            success: false,
            error: "Attendance is already in progress",
          });
        }

        const classData = await Class.findOne({
          _id: classId,
        });

        if (!classData) {
          return io.to(socket.id).emit(`startAttendance`, {
            success: false,
            error: "Class not found",
          });
        }

        //Cheeck if today have absence request
        const today = Date.now();
        const students = [];
        if (classData.absenceRequests[dayjs(today).format("DDMMYYYY")]) {
          students.push(
            ...classData.absenceRequests[dayjs(today).format("DDMMYYYY")]
          );

          // classData.students.forEach((student: any) => {
          //   //if student in today absence request -> increse checkin count
          //   console.log(student);

          //   classData.absenceRequests[dayjs(today).format("DDMMYYYY")].forEach(
          //     (absenceStudent: any) => {
          //       if (student.id.equals(absenceStudent)) {
          //         student.presentCount++;
          //       }
          //     }
          //   );
          // });

          // await classData.save();
        }

        const newAttendance = {
          classId: classId,
          startTime: Date.now(),
          endTime: Date.now() + time * 60 * 1000,
          students,
          status: "IN_PROGRESS",
          wifi: wifi,
        };
        const pushNoti = await pushNotification(
          "New attendance session",
          `Class ${classData.name} has start attendance`,
          classData.classId,
          {
            screen: "Class",
            data: {
              id: classId,
            },
          }
        );

        const newAttendanceData = await new Attendance(newAttendance).save();
        console.log("newAttendanceData", newAttendanceData);

        io.emit(`startAttendance_${classId}`, {
          success: true,
          data: newAttendance,
        });

        io.to(socket.id).emit(`startAttendance`, {
          success: true,
          data: newAttendanceData,
        });

        timer = setTimeout(() => {
          handleStopAttendance(socket, timer, classId);
        }, time * 60 * 1000);
      } catch (e) {
        console.log(e);
      }

      // socket.removeListener()
    });

    socket.on("stopAttendance", async (classId: string) => {
      try {
        const classData = await Class.findOne({
          _id: classId,
        });

        clearTimeout(timer);
        await Attendance.findOneAndUpdate(
          {
            classId: classId,
            status: Attendance.STATUS.IN_PROGRESS,
          },
          {
            status: Attendance.STATUS.CANCEL,
          },
          {
            new: true,
          }
        );

        pushNotification(
          "Attendance",
          `Class ${classData.name} attendance session has been cancel`,
          classData.classId
        );
        console.log(`stopAttendance_${classId}`);

        io.emit(`stopAttendance_${classId}`, {
          success: true,
          message: "Attendance has cancel",
        });
      } catch (e) {
        console.log(e);
      }
      // handleStopAttendance(socket, timer, classId);
    });

    socket.on("checkin", async (data: any) => {
      const { studentId, classId, wifi, uuid } = data;
      console.log(data);

      const attendance = await Attendance.findOne({
        classId: classId,
        status: Attendance.STATUS.IN_PROGRESS,
      });

      if (attendance) {
        if (attendance.students && attendance.students.includes(studentId)) {
          return io.to(socket.id).emit(`checkin`, {
            success: false,
            error: "Student is already checked in",
          });
        } else if (attendance.deviceList.includes(uuid)) {
          return io.to(socket.id).emit(`checkin`, {
            success: false,
            error: "Device is already used",
          });
        } else {
          console.log(attendance.wifi, wifi);
          if (hasMatchingElement(attendance.wifi, wifi)) {
            attendance.students.push(new mongoose.Types.ObjectId(studentId));
            attendance.deviceList.push(uuid);
            await attendance.save();

            return io.to(socket.id).emit(`checkin`, {
              success: true,
              message: "Check-in successfully",
            });
          } else {
            if (!attendance.invalidCheckIn.includes(studentId)) {
              attendance.invalidCheckIn.push(
                new mongoose.Types.ObjectId(studentId)
              );
              await attendance.save();
            }
            return io.to(socket.id).emit(`checkin`, {
              success: false,
              message: "Check-in failed because of wrong wifi",
            });
          }
        }
      }
    });

    socket.on("disconnect", () => {
      console.log("user disconnected");
    });
  });
};

export default socketHandler;
