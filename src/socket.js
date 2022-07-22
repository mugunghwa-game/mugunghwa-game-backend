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
        participant: room.participant.length,
        isProgress: isProgress,
      });

      if (room.player.filter((id) => id === socket.id).length !== 0) {
        return;
      }
    });

    socket.on(SOCKET.USER_COUNT, (payload) => {
      if (room.player.includes(payload.id)) {
        room.player = room.player.filter((id) => id !== payload.id);
        room.it = room.it.filter((id) => id !== payload.id);
        room.participant = room.participant.filter((id) => id !== payload.id);
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
        reayCount = 0;
      }
    });

    socket.on(SOCKET.ENTER_GAME, (payload) => {
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
      clickCount++;

      if (payload) {
        io.to(game[roomId]).emit(SOCKET.POSEDETECTION_START, true);
      }
    });

    socket.on(SOCKET.MOVED, (payload) => {
      if (payload.state) {
        participant.filter((item) =>
          item.id === payload.user && item.opportunity !== 0
            ? (item.opportunity -= 1)
            : null
        );
      }

      io.to(game[roomId]).emit(SOCKET.REMAINING_OPPORTUNITY, {
        participant: participant,
        count: clickCount,
      });

      if (participant.filter((item) => item.opportunity === 0).length === 2) {
        io.to(game[roomId]).emit(SOCKET.GAME_END, true);
      }

      if (clickCount === 5) {
        io.to(game[roomId]).emit(SOCKET.CLICK_COUNT_NONE, participant);
      }
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

      if (game[roomId] && game[roomId].length === 0) {
        isProgress = false;
      }

      io.to(game[roomId]).emit(SOCKET.USER_LEFT, socket.id);
    });
  });
};
