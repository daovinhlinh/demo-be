import { Server } from "socket.io";
import { Socket } from "socket.io/dist/socket";
import { io } from "..";
import { convertArrayDocsToObject, hasMatchingElement } from "../commons";
import { pushNotification } from "../config/notification";
import mongoose from "mongoose";

const Attendance = require("../models/Attendance");
const User = require("../models/User");

const handleStopAttendance = async (
  socket: Socket,
  timerId: NodeJS.Timeout,
  classId: string
) => {
  try {
    const attendance = await Attendance.findOneAndUpdate(
      {
        classId: classId,
        status: Attendance.STATUS.IN_PROGRESS,
      },
      {
        status: Attendance.STATUS.FINISHED,
      }
    );
    console.log("attendance", attendance);
    const pushNoti = await pushNotification(
      "Attendance",
      "Attendance session has ended",
      {
        key: classId,
        value: true,
      }
    );
    console.log(pushNoti);
    io.emit(`stopAttendance_${classId}`, {
      success: true,
      // data: attendance
    });
    clearTimeout(timerId);
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

  io.on("connection", (socket: Socket) => {
    console.log("a user connected");
    let timer: NodeJS.Timeout;

    changeStream.on("change", async (change: any) => {
      console.log("change", change);
      //handle update data here
      //change data is array of ids
      //convert ids to list users data
      //send to client

      const updatedAttendance = await Attendance.findOne({
        _id: change.documentKey._id,
      });
      console.log("updatedAttendance", updatedAttendance);

      if (change.operationType == "update") {
        // async.eachSeries(change.updateDescription.)
        const updateData = convertArrayDocsToObject(
          change.updateDescription.updatedFields,
          "students"
        );

        try {
          const students = await User.find({
            _id: {
              $in: updatedAttendance.students,
            },
            role: User.ROLES.USER,
          });

          const uncheckStudents = await User.find({
            _id: {
              $nin: updatedAttendance.students,
            },
            role: User.ROLES.USER,
          });

          console.log(
            "`updateAttendance_${updatedAttendance._id}`",
            `updateAttendance_${updatedAttendance._id}`
          );
          socket.emit(`updateAttendance_${updatedAttendance._id}`, {
            success: true,
            data: {
              checkinStudent: students,
              uncheckStudent: uncheckStudents,
            },
          });
        } catch (e) {
          console.log(e);
        }
      }
    });

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

        const newAttendance = {
          classId: classId,
          startTime: Date.now(),
          endTime: Date.now() + time * 60 * 1000,
          students: [],
          status: "IN_PROGRESS",
          wifi: wifi,
        };
        const pushNoti = await pushNotification(
          "New attendance session",
          "Class has start attendance",
          {
            key: classId,
            value: true,
          },
          {
            deeplink: {
              screen: "Class",
              data: {
                id: classId,
              },
            },
          }
        );

        await new Attendance(newAttendance).save();

        io.emit(`startAttendance_${classId}`, {
          success: true,
          data: newAttendance,
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
      handleStopAttendance(socket, timer, classId);
    });

    socket.on("checkin", async (data: any) => {
      const { studentId, classId, wifi } = data;
      console.log(data);

      const attendance = await Attendance.findOne({
        classId: classId,
        status: Attendance.STATUS.IN_PROGRESS,
      });

      if (attendance.students.includes(studentId)) {
        return io.to(socket.id).emit(`checkin`, {
          success: false,
          error: "Student is already checked in",
        });
      } else {
        if (hasMatchingElement(attendance.wifi, wifi)) {
          attendance.students.push(new mongoose.Types.ObjectId(studentId));
          await attendance.save();
          return io.to(socket.id).emit(`checkin`, {
            success: true,
            message: "Check-in successfully",
          });
        } else {
          return io.to(socket.id).emit(`checkin`, {
            success: false,
            message: "Check-in failed because of wrong wifi",
          });
        }
      }
    });

    socket.on("disconnect", () => {
      console.log("user disconnected");
    });
  });
};

export default socketHandler;
