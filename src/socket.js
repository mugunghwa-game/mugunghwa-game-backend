const socket = require("socket.io");
const { SOCKET } = require("./constants/constant");

module.exports = (server) => {
  const io = socket(server, {
    cors: {
      origin: "*",
    },
  });

  let rooms = {};

  io.on(SOCKET.CONNECTION, (socket) => {
    console.log("hello, here is socket");

    socket.on(SOCKET.ROOM_LIST, (payload) => {
      socket.join("roomListPage");

      io.emit(SOCKET.ROOM_INFO, { id: socket.id, rooms: rooms });
    });

    socket.on(SOCKET.CREATE_GAME, (payload) => {
      rooms[payload.id] = {
        player: [],
        it: [],
        participant: [],
        difficulty: [],
        participantList: [],
        reayCount: 0,
        clickCount: 0,
        isProgress: false,
        socketInRoom: [],
      };

      rooms[payload.id].player.push(payload.id);

      if (payload.role === "it") {
        rooms[payload.id].it.push(payload.id);
        rooms[payload.id].difficulty.push(payload.difficulty);
      }

      if (payload.role === "participant") {
        rooms[payload.id].participant.push(payload.id);
        rooms[payload.id].participantList.push({
          id: payload.id,
          opportunity: 3,
        });
      }

      socket.broadcast.emit(SOCKET.NEW_ROOM, rooms);
    });

    socket.on(SOCKET.JOINROOM, (roomId) => {
      if (rooms[roomId]) {
        socket.emit(SOCKET.SOCKET_ID, {
          id: socket.id,
          it: rooms[roomId].it.length,
          participant: rooms[roomId].participant.length,
          isProgress: rooms[roomId].isProgress,
        });
      }
    });

    socket.on(SOCKET.USER_COUNT, (payload) => {
      rooms[payload.roomId].player.push(payload.id);

      if (payload.role === "it") {
        rooms[payload.roomId].it.push(payload.id);
      } else {
        rooms[payload.roomId].participant.push(payload.id);
        rooms[payload.roomId].participantList.push({
          id: payload.id,
          opportunity: 3,
        });
      }

      if (payload.difficulty !== null) {
        rooms[payload.roomId].difficulty.push(payload.difficulty);
      }

      io.to(rooms[payload.roomId].player).emit(SOCKET.ROLE_COUNT, {
        it: rooms[payload.roomId].it.length,
        participant: rooms[payload.roomId].participant.length,
      });

      io.to("roomListPage").emit(SOCKET.ROOM_INFO, { rooms: rooms });
    });

    socket.on(SOCKET.LEAVE_ROOM, (payload) => {
      socket.leave(payload.roomId, rooms);

      rooms[payload.roomId].it = rooms[payload.roomId].it.filter(
        (id) => id !== payload.user
      );

      rooms[payload.roomId].participant = rooms[
        payload.roomId
      ].participant.filter((item) => item !== payload.user);

      rooms[payload.roomId].player = rooms[payload.roomId].player.filter(
        (id) => id !== payload.user
      );

      rooms[payload.roomId].participantList = rooms[
        payload.roomId
      ].participantList.filter((person) => person.id !== payload.user);

      rooms[payload.roomId].socketInRoom = rooms[
        payload.roomId
      ].socketInRoom.filter((id) => id !== payload.user);

      if (rooms[payload.roomId].player.length === 0) {
        delete rooms[payload.roomId];
      } else {
        io.to(rooms[payload.roomId].player).emit(
          SOCKET.UPDATE_USER,
          rooms[payload.roomId]
        );
      }

      io.to("roomListPage").emit(SOCKET.ROOM_INFO, { rooms: rooms });
    });

    socket.on(SOCKET.ALL_READY, (payload) => {
      io.to(rooms[roomId].player).emit(SOCKET.GO_GAME, true);
    });

    socket.on(SOCKET.READY, (payload) => {
      io.to(rooms[roomId].player).emit(SOCKET.START, true);
    });

    socket.on(SOCKET.IS_READY, (payload) => {
      payload ? rooms[payload.roomId].reayCount++ : null;

      if (rooms[payload.roomId].reayCount === 2) {
        socket.emit(SOCKET.PREPARED, true);

        io.to(rooms[payload.roomId].player).emit(SOCKET.PREPARED, true);

        rooms[payload.roomId].reayCount = 0;
      }
    });

    socket.on(SOCKET.ENTER_GAME, (payload) => {
      rooms[payload.roomId].isProgress = true;

      socket.emit(SOCKET.ALL_INFO, {
        socketInRoom: rooms[payload.roomId].socketInRoom,
        participant: rooms[payload.roomId].participantList,
        it: rooms[payload.roomId].it,
        difficulty: rooms[payload.roomId].difficulty,
      });

      if (
        rooms[payload.roomId].socketInRoom.filter((item) => item === socket.id)
          .length === 0
      ) {
        rooms[payload.roomId].socketInRoom.push(socket.id);
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
      rooms[payload.roomId].clickCount = rooms[payload.roomId].clickCount + 1;

      if (payload) {
        io.to(rooms[payload.roomId].player).emit(
          SOCKET.POSEDETECTION_START,
          true
        );
      }
    });

    socket.on(SOCKET.MOVED, (payload) => {
      if (payload.state) {
        rooms[payload.roomId].participantList.filter((item) =>
          item.id === payload.user && item.opportunity !== 0
            ? (item.opportunity -= 1)
            : null
        );
      }

      io.to(rooms[payload.roomId].player).emit(SOCKET.REMAINING_OPPORTUNITY, {
        participant: rooms[payload.roomId].participantList,
        count: rooms[payload.roomId].clickCount,
      });

      if (
        rooms[payload.roomId].participantList.filter(
          (item) => item.opportunity === 0
        ).length === 2
      ) {
        io.to(rooms[payload.roomId].player).emit(SOCKET.GAME_END, true);

        delete rooms[payload.roomId];
      }

      if (rooms[payload.roomId].clickCount === 5) {
        io.to(rooms[payload.roomId].player).emit(
          SOCKET.CLICK_COUNT_NONE,
          rooms[payload.roomId].participantList
        );

        delete rooms[payload.roomId];
      }
    });

    socket.on(SOCKET.IT_LOSER, (payload) => {
      io.to(rooms[payload.roomId].player).emit(SOCKET.IT_LOSER_GAME_END, true);

      delete rooms[payload.roomId];
    });

    socket.on(SOCKET.DISCONNECT, () => {
      console.log("disconnect", socket.id);
    });
  });
};
