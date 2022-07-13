const socket = require("socket.io");
const { SOCKET } = require("./constants/constant");

module.exports = (server) => {
  const io = socket(server, {
    cors: {
      origin: "*",
      methods: ["GET", "POST"],
    },
  });

  let game = {};
  let room = {
    player: [],
    it: [],
    participant: [],
  };

  let participant = [];
  let reayCount = 0;
  let socketInRoom = [];
  let roomId = "gameRoom";

  io.on(SOCKET.CONNECTION, (socket) => {
    console.log("hello, here is socket");

    socket.on(SOCKET.JOINROOM, (roomId) => {
      console.log(socket.id, participant.length, room.participant);
      if (
        game[roomId] &&
        game[roomId].filter((id) => id === socket.id).length === 0
      ) {
        game[roomId].push(socket.id);
      }
      if (game[roomId] === undefined) {
        game[roomId] = [socket.id];
      }
      socket.emit(SOCKET.SOCKET_ID, {
        id: socket.id,
        it: room.it.length,
        participant: participant.length,
      });
      if (room.player.filter((id) => id === socket.id).length !== 0) {
        return;
      }
    });

    socket.on(SOCKET.USER_COUNT, (payload) => {
      console.log("game", game[roomId], game, payload.roomId);

      if (room.player.includes(payload.id)) {
        room.player = room.player.filter((ids) => ids !== payload.id);
        room.it = [];
        room.participant = room.participant.filter((ids) => ids !== payload.id);
      }
      room.player.push(payload.id);

      if (payload.role === "it") {
        room.it.push(payload.id);
      } else {
        room.participant.push(payload.id);

        if (participant.find((item) => item.id === payload.id)) {
          return;
        } else {
          participant.push({ id: payload.id, opportunity: 3 });
        }
      }

      io.to(game[roomId]).emit(SOCKET.ROLE_COUNT, {
        it: room.it.length,
        participant: room.participant.length,
      });
    });

    socket.on("leaveRoom", (payload) => {
      console.log(payload);
      socket.leave("gameRoom");

      room.it = room.it.filter((id) => id !== payload);
      room.participant = room.participant.filter((item) => item !== payload);
      room.player = room.player.filter((id) => id !== payload);
      participant = participant.filter((person) => person.id !== payload);
      socketInRoom = socketInRoom.filter((id) => id !== payload);
      game[roomId] = game[roomId].filter((id) => socket.id !== id);

      io.to(game[roomId]).emit("updateUser", room);
    });

    socket.on(SOCKET.ENTER_GAME, (payload) => {
      console.log("enter game");
      socket.emit(SOCKET.ALL_INFO, {
        socketInRoom: socketInRoom,
        room: room,
        participant: participant,
      });

      if (socketInRoom.filter((item) => item === socket.id).length === 0) {
        socketInRoom.push(socket.id);
      }
    });

    socket.on(SOCKET.READY, (payload) => {
      socket.broadcast.emit(SOCKET.START, true);
    });

    socket.on("sending signal", (payload) => {
      console.log(
        "here is sendingsignal",
        payload.callerID,
        payload.userToSignal,
        "~에게 보냄"
      );

      io.to(payload.userToSignal).emit("user joined", {
        signal: payload.signal,
        callerID: payload.callerID,
      });
    });

    socket.on("returning signal", (payload) => {
      console.log(
        "here is returningSignal",
        socket.id,
        "를",
        payload.callerID,
        "~에게 보냄"
      );
      io.to(payload.callerID).emit("receiving-returned-signal", {
        signal: payload.signal,
        id: socket.id,
      });
    });

    socket.on(SOCKET.IS_READY, (payload) => {
      payload ? reayCount++ : null;
      if (reayCount === 2) {
        socket.broadcast.emit(SOCKET.PREPARED_GAME, true);
        socket.emit(SOCKET.PREPARED, true);
        reayCount = 0;
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
        socketInRoom = [];
        game = {};
      }
    });

    socket.on(SOCKET.DISCONNECT, () => {
      console.log("disconnect", socket.id);
    });
  });
};
