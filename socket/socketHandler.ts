
import { Server } from "socket.io";
import { Socket } from "socket.io/dist/socket";
import { io } from "..";
const Class = require("../models/Class");


const socketHandler = (io: Server) => {
  io.on('connection', (socket: Socket) => {
    console.log('a user connected');
    socket.on('chat message', (message: string) => {

      console.log('user msg ', message);
      io.emit('chat message', message);
    })

    socket.on('startAttendance', (classId: string) => {
      console.log('startAttendance ', classId);
      io.emit('startAttendance', classId);
      // socket.removeListener()
    })

    socket.on('disconnect', () => {
      console.log('user disconnected');
    })

  })
}

export default socketHandler;