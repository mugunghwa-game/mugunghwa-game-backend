const socket = require("socket.io");
const { SOCKET } = require("./constants/constant");

module.exports = (server) => {
  const io = socket(server, {
    cors: {
      orogin: "*",
      methods: ["GET", "POST"],
    },
  });

  io.on(SOCKET.CONNECTION, (socket) => {
    socket.on(SOCKET.JOINROOM, (roomId) => {
      console.log("roomId", roomId);
    });
  });
};
