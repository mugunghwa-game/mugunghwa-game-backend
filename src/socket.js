const socket = require("socket.io");
const { SOCKET } = require("./constants/constant");

module.exports = (server) => {
  const io = socket(server, {
    cors: {
      orogin: "*",
      methods: ["GET", "POST"],
    },
  });

  let socketToRoom = {};
  let room = {
    player: [],
    it: [],
    participant: [],
  };
  let users = {};
  let user = {
    id: "",
    opportunity: 0,
    role: "",
  };
  let participant = [];
  let reayCount = 0;

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
      socket.broadcast.emit(SOCKET.START, true);
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

    socket.on(SOCKET.IS_READY, (payload) => {
      payload ? reayCount++ : null;
      if (reayCount === 2) {
        socket.broadcast.emit(SOCKET.PREPARED_GAME, true);
        socket.emit(SOCKET.PREPARED, true);
      }
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

    socket.on(SOCKET.COUNT_END, (payload) => {
      socket.broadcast.emit(SOCKET.IT_END, true);
    });

    socket.on(SOCKET.IT_LOSER, (payload) => {
      socket.broadcast.emit(SOCKET.IT_LOSER_GAME_END, true);
    });

    socket.on(SOCKET.INFO_INITIALIZATION, (payload) => {
      if (payload) {
        socketToRoom = {};
        room = {
          player: [],
          it: [],
          participant: [],
        };
        users = {};
        user = {
          id: "",
          opportunity: 0,
          role: "",
        };
        participant = [];
        reayCount = 0;
      }
    });

    socket.on(SOCKET.DISCONNECT, () => {
      console.log("disconnect");
    });
  });
};
