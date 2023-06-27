import { Server } from "socket.io";
import { Socket } from "socket.io/dist/socket";
import { io } from "..";
import { convertArrayDocsToObject, hasMatchingElement } from "../commons";
import { pushNotification } from "../config/notification";
import mongoose from "mongoose";


const Attendance = require("../models/Attendance");
const User = require("../models/User");

const handleStopAttendance = async (socket: Socket, timerId: NodeJS.Timeout, classId: string) => {
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
    clearTimeout(timerId);
  } catch (e) {
    socket.emit(`stopAttendance_${classId}`, {
      success: false,
      error: "error",
      // data: attendance
    });
  }
}

const socketHandler = (io: Server) => {
  const changeStream = Attendance.watch();

  io.on("connection", (socket: Socket) => {
    console.log("a user connected");
    let timer: NodeJS.Timeout;
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

        await new Attendance(newAttendance).save();

        changeStream.on("change", async (change: any) => {

          //handle update data here
          //change data is array of ids
          //convert ids to list users data
          //send to client
          if (change.operationType == 'update') {
            console.log('change', change);

            // async.eachSeries(change.updateDescription.)
            const updateData = convertArrayDocsToObject(change.updateDescription.updatedFields, 'students');

            if (updateData.length > 0 && !Array.isArray(updateData[0])) {
              // async.eachSeries(updateData, async (studentId: string, callback: any) => {
              //   const student = await User.find({
              //     _id: studentId
              //   })
              //   callback(null, student)
              // })
              const updateStudentData = updateData.map((studentId: string) => new mongoose.Types.ObjectId(studentId));
              console.log('updateStudentData', updateStudentData);

              try {
                const students = await User.find({
                  _id: {
                    $in: updateStudentData
                  },
                  role: User.ROLES.USER
                });
                console.log('students', students);
                socket.emit(`updateAttendance_${classId}`, {
                  success: true,
                  data: students
                })
              } catch (e) {
                console.log(e);
              }
            }
          }
        })

        io.emit(`startAttendance_${classId}`, {
          success: true,
          data: newAttendance,
        });
        timer = setTimeout(() => {
          handleStopAttendance(socket, timer, classId)
        }, time * 60 * 1000)
      } catch (e) {
        console.log(e);
      }

      // socket.removeListener()
    });

    socket.on("stopAttendance", async (classId: string) => {
      handleStopAttendance(socket, timer, classId)
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
          attendance.students.push(new mongoose.Types.ObjectId(studentId));
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
