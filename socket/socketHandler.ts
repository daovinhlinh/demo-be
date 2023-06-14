import { Server } from "socket.io";
import { Socket } from "socket.io/dist/socket";
import { io } from "..";
import { hasMatchingElement } from "../commons";
import { pushNotification } from "../config/notification";

const Attendance = require("../models/Attendance");

const socketHandler = (io: Server) => {
  io.on("connection", (socket: Socket) => {
    console.log("a user connected");

    socket.on("startAttendance", async ({ classId, wifi }) => {
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
          endTime: Date.now() + 5 * 60 * 1000,
          students: [],
          status: "IN_PROGRESS",
          wifi: wifi,
        };
        const pushNoti = await pushNotification('New attendance session', 'Class has start attendance', {
          key: classId,
          value: true
        }, {
          deeplink: {
            screen: 'Class',
            data: {
              id: classId
            }
          }
        })
        console.log(pushNoti);

        await new Attendance(newAttendance).save();
        console.log("newAttendance", newAttendance);

        io.emit(`startAttendance_${classId}`, {
          success: true,
          data: newAttendance,
        });
      } catch (e) {
        console.log(e);
      }

      // socket.removeListener()
    });

    socket.on("stopAttendance", async (classId: string) => {
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
        const pushNoti = await pushNotification('Attendance', 'Attendance session has ended', {
          key: classId,
          value: true
        })
        console.log(pushNoti);
        io.emit(`stopAttendance_${classId}`, {
          success: true,
          // data: attendance
        });
      } catch (e) {
        socket.emit(`stopAttendance_${classId}`, {
          success: false,
          error: "error",
          // data: attendance
        });
      }
    });


    socket.on("checkin", async (data: any) => {
      const { studentId, classId, wifi } = data;
      console.log(data);

      const attendance = await Attendance.findOne(
        {
          classId: classId,
          status: Attendance.STATUS.IN_PROGRESS,
        });
      console.log('attendance', attendance);

      if (attendance.students.includes(studentId)) {
        return io.to(socket.id).emit(`checkin`, {
          success: false,
          error: "Student is already checked in",
        });
      } else {

        if (hasMatchingElement(attendance.wifi, wifi)) {
          attendance.students.push(studentId);
          await attendance.save();
          return io.to(socket.id).emit(`checkin`, {
            success: true,
            message: "Check-in successfully",
          });
        }
      }
    })

    socket.on("disconnect", () => {
      console.log("user disconnected");
    });
  });
};

export default socketHandler;
