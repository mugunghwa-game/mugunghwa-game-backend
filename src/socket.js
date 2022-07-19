const socket = require("socket.io");
const { SOCKET } = require("./constants/constant");

module.exports = (server) => {
  const io = socket(server, {
    cors: {
      origin: "*",
    },
  });

  let game = {};
  let room = {
    player: [],
    it: [],
    participant: [],
    difficulty: [],
  };
  let participant = [];
  let reayCount = 0;
  let socketInRoom = [];
  let roomId = "gameRoom";
  let clickCount = 0;
  let isProgress = false;

  io.on(SOCKET.CONNECTION, (socket) => {
    console.log("hello, here is socket");

    socket.on(SOCKET.JOINROOM, (roomId) => {
      console.log(socket.id, participant.length, room.participant, game);

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
        isProgress: isProgress,
      });

      if (room.player.filter((id) => id === socket.id).length !== 0) {
        return;
      }
    });

    socket.on(SOCKET.USER_COUNT, (payload) => {
      console.log("game", payload, game[roomId], game, payload.roomId);
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
      if (payload.difficulty !== undefined) {
        room.difficulty.push(payload.difficulty);
      }

      io.to(game[roomId]).emit(SOCKET.ROLE_COUNT, {
        it: room.it.length,
        participant: room.participant.length,
      });
    });

    socket.on(SOCKET.LEAVE_ROOM, (payload) => {
      console.log(payload);
      socket.leave("gameRoom");

      room.it = room.it.filter((id) => id !== payload);
      room.participant = room.participant.filter((item) => item !== payload);
      room.player = room.player.filter((id) => id !== payload);
      participant = participant.filter((person) => person.id !== payload);
      socketInRoom = socketInRoom.filter((id) => id !== payload);
      game[roomId] = game[roomId].filter((id) => payload !== id);

      io.to(game[roomId]).emit(SOCKET.UPDATE_USER, room);
    });

    socket.on(SOCKET.ALL_READY, (payload) => {
      io.to(game[roomId]).emit(SOCKET.GO_GAME, true);
    });

    socket.on(SOCKET.READY, (payload) => {
      io.to(game[roomId]).emit(SOCKET.START, true);
    });

    socket.on(SOCKET.IS_READY, (payload) => {
      payload ? reayCount++ : null;

      if (reayCount === 2) {
        socket.broadcast.emit(SOCKET.PREPARED_GAME, true);
        socket.emit(SOCKET.PREPARED, true);
        // io.to(game[roomId]).emit("gameStart", true);
        reayCount = 0;
      }
    });

    socket.on(SOCKET.ENTER_GAME, (payload) => {
      console.log("enter game", game);
      isProgress = true;

      socket.emit(SOCKET.ALL_INFO, {
        socketInRoom: socketInRoom,
        room: room,
        participant: participant,
        it: room.it,
        difficulty: room.difficulty,
      });

      if (socketInRoom.filter((item) => item === socket.id).length === 0) {
        socketInRoom.push(socket.id);
      }
    });

    socket.on("sending signal", (payload) => {
      console.log(
        "here is sendingsignal",
        payload.callerID,
        payload.userToSignal,
        "~에게 보냄"
      );

      io.to(payload.userToSignal).emit(SOCKET.USER_JOINED, {
        signal: payload.signal,
        callerID: payload.callerID,
      });
    });

    socket.on(SOCKET.RETURNING_SIGNAL, (payload) => {
      console.log(
        "here is returningSignal",
        socket.id,
        "를",
        payload.callerID,
        "~에게 보냄"
      );

      io.to(payload.callerID).emit(SOCKET.RECEIVING_RETURNED_SIGNAL, {
        signal: payload.signal,
        id: socket.id,
      });
    });

    socket.on(SOCKET.MOTION_START, (payload) => {
      console.log("motion start", payload);
      if (payload) {
        io.to(game[roomId]).emit(SOCKET.POSEDETECTION_START, true);
      }
    });

    socket.on(SOCKET.MOVED, (payload) => {
      console.log("움직였어", payload, clickCount);
      participant.filter((item) =>
        item.id === payload && item.opportunity !== 0
          ? (item.opportunity -= 1)
          : null
      );

      console.log(participant, "움직임 이후 기회의 수 차감");

      io.to(game[roomId]).emit(SOCKET.REMAINING_OPPORTUNITY, {
        participant: participant,
        count: clickCount,
      });

      if (participant.filter((item) => item.opportunity === 0).length === 2) {
        io.to(game[roomId]).emit(SOCKET.GAME_END, true);
      }

      clickCount++;
    });

    socket.on(SOCKET.IT_LOSER, (payload) => {
      io.to(game[roomId]).emit(SOCKET.IT_LOSER_GAME_END, true);
    });

    socket.on(SOCKET.INFO_INITIALIZATION, (payload) => {
      isProgress = false;

      if (payload) {
        room = {
          player: [],
          it: [],
          participant: [],
          difficulty: [],
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
        clickCount = 0;
      }
    });

    socket.on(SOCKET.DISCONNECT, () => {
      console.log("disconnect", socket.id);

      room.it = room.it.filter((id) => id !== socket.id);
      room.participant = room.participant.filter((item) => item !== socket.id);
      room.player = room.player.filter((id) => id !== socket.id);
      participant = participant.filter((person) => person.id !== socket.id);

      if (socketInRoom && game[roomId]) {
        socketInRoom = socketInRoom.filter((id) => id !== socket.id);
        game[roomId] = game[roomId].filter((id) => socket.id !== id);
      }

      if (!game[roomId].length) {
        isProgress = false;
      }
      console.log(room.player, isProgress);
    });
  });
};
