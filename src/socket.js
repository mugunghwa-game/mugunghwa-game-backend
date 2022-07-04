const socket = require("socket.io");
const { SOCKET } = require("./constants/constant");

module.exports = (server) => {
  const io = socket(server, {
    cors: {
      orogin: "*",
      methods: ["GET", "POST"],
    },
  });

  const users = {};
  const socketToRoom = {};
  const room = {
    player: [],
    it: [],
    participant: [],
  };
  const user = {
    id: "",
    opportunity: 0,
    role: "",
  };
  const participant = [];

  io.on(SOCKET.CONNECTION, (socket) => {
    socket.on(SOCKET.JOINROOM, (roomId) => {
      socket.emit("socket-id", socket.id);

      if (
        users["gameRoom"] &&
        users["gameRoom"].find((id) => id === socket.id)
      ) {
        return;
      }

      if (users[roomId]) {
        users[roomId].push(socket.id);
      } else {
        users[roomId] = [socket.id];
      }
      socketToRoom[socket.id] = roomId;

      socket.emit("all users", users);
    });

    socket.on("user-count", (id) => {
      if (!users["gameRoom"]) {
        return;
      }

      if (room.player.includes(id.id)) {
        room.player = room.player.filter((ids) => ids !== id.id);
        room.it = room.it.filter((ids) => ids !== id.id);
        room.participant = room.participant.filter((ids) => ids !== id.id);
      }
      room.player.push(id.id);

      if (id.role === "it") {
        room.it.push(id.id);
        user.id = id.id;
        user.role = id.role;
        user.opportunity = 5;
      } else {
        room.participant.push(id.id);
        user.id = id.id;
        user.role = id.role;
        user.opportunity = 3;

        if (participant.find((item) => item.id === id.id)) {
          return;
        } else {
          participant.push({ id: id.id, opportunity: 3 });
        }
      }
      // console.log(room, parsrticipant);
      socket.emit("role-count", {
        it: room.it.length,
        participant: room.participant.length,
      });
      socket.broadcast.emit("role-counts", {
        it: room.it.length,
        participant: room.participant.length,
      });
      socket.emit("userInfo", room);
      socket.broadcast.emit("update", room);
    });

    socket.on("ready", (data) => {
      socket.broadcast.emit("start", true);
      console.log("participant", participant);

      // socket.emit("user", { room: room, participant: participant });
    });

    socket.on("enter", (data) => {
      if (data) {
        socket.emit("user", { room: room, participant: participant });
      }
    });

    socket.on("sending signal", (payload) => {
      io.to(payload.userToSignal).emit("user joined", {
        signal: payload.signal,
        callerID: payload.callerID,
      });
    });

    socket.on("returning signal", (payload) => {
      io.to(payload.callerID).emit("receiving returned signal", {
        signal: payload.signal,
        id: socket.id,
      });
    });

    socket.on("disconnect", () => {
      const roomID = socketToRoom[socket.id];
      let room = users[roomID];
      if (room) {
        console.log("disconnect");

        room = room.filter((id) => id !== socket.id);
        users[roomID] = room;
      }
    });
  });
};
