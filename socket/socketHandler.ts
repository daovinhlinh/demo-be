import { Server } from "socket.io";
import { Socket } from "socket.io/dist/socket";
import { io } from "..";

const Attendance = require("../models/Attendance");

const socketHandler = (io: Server) => {
  io.on("connection", (socket: Socket) => {
    console.log("a user connected");
    socket.on("startAttendance", async (classId: string) => {
      console.log(`startAttendance class ${classId}`);

      try {
        const newAttendance = {
          classId: classId,
          startTime: Date.now(),
          endTime: Date.now() + 5 * 60 * 1000,
          students: [],
        };

        await new Attendance(newAttendance).save();
        io.emit(`startAttendance_${classId}`, newAttendance);
      } catch (e) {
        console.log(e);
      }

      // socket.removeListener()
    });

    socket.on("disconnect", () => {
      console.log("user disconnected");
    });
  });
};

export default socketHandler;
