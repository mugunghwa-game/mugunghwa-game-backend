const socket = require("socket.io");
const { SOCKET } = require("./constants/constant");

module.exports = (server) => {
  const io = socket(server, {
    cors: {
      orogin: "*",
      methods: ["GET", "POST"],
    },
  });
  const socketToRoom = {};
  const room = {
    player: [],
    it: [],
    participant: [],
  };
  const users = {};
  const user = {
    id: "",
    opportunity: 0,
    role: "",
  };
  const participant = [];

  io.on(SOCKET.CONNECTION, (socket) => {
    socket.on(SOCKET.JOINROOM, (roomId) => {
      socket.emit(SOCKET.SOCKET_ID, socket.id);

      if (users.gameRoom && users.gameRoom.find((id) => id === socket.id)) {
        return;
      }

      if (users.gameRoom) {
        users.gameRoom.push(socket.id);
      } else {
        users.gameRoom = [socket.id];
      }

      socketToRoom[socket.id] = roomId;

      socket.emit(SOCKET.ALL_USRS, users);
    });

    socket.on(SOCKET.USER_COUNT, (id) => {
      if (!users.gameRoom) {
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

      socket.emit(SOCKET.ROLE_COUNT, {
        it: room.it.length,
        participant: room.participant.length,
      });

      socket.broadcast.emit(SOCKET.ROLE_COUNTS, {
        it: room.it.length,
        participant: room.participant.length,
      });

      socket.emit(SOCKET.USER_INFO, room);
      socket.broadcast.emit(SOCKET.USER_INFO_UPDATE, room);
    });

    socket.on(SOCKET.READY, (payload) => {
      socket.broadcast.emit("start", true);
    });

    socket.on(SOCKET.ENTER_GAME, (payload) => {
      if (payload) {
        socket.emit(SOCKET.ALL_INFO, { room: room, participant: participant });
      }
    });

    socket.on(SOCKET.SENDING_SIGNAL, (payload) => {
      io.to(payload.userToSignal).emit(SOCKET.USER_JOINED, {
        signal: payload.signal,
        callerID: payload.callerID,
      });
    });

    socket.on(SOCKET.RETURNING_SIGNAL, (payload) => {
      io.to(payload.callerID).emit(SOCKET.RECEIVING_RETURNED_SIGNAL, {
        signal: payload.signal,
        id: socket.id,
      });
    });

    socket.on(SOCKET.MOTION_START, (payload) => {
      if (payload) {
        socket.broadcast.emit(SOCKET.START, true);
      }
    });

    socket.on(SOCKET.MOVED, (payload) => {
      participant.filter((item) =>
        item.id === payload && item.opportunity !== 0
          ? (item.opportunity -= 1)
          : null
      );
      socket.emit(SOCKET.REMAINING_OPPORTUNITY, participant);
      socket.broadcast.emit(SOCKET.PARTICIPANT_REMAINING_COUNT, participant);

      if (participant.filter((item) => item.opportunity === 0).length === 2) {
        socket.emit(SOCKET.GAME_END, true);
        socket.broadcast.emit(SOCKET.ANOTHER_USER_END, true);
      }
    });

    socket.on(SOCKET.DISCONNECT, () => {
      const roomID = socketToRoom[socket.id];
      let room = users[roomID];
      if (room) {
        room = room.filter((id) => id !== socket.id);
        users[roomID] = room;
      }
    });
  });
};
