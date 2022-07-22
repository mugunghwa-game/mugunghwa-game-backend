const { expect } = require("chai");
const Client = require("socket.io-client");
const http = require("http");

const socketModule = require("../src/socket");

describe("1. 소켓 테스트", function () {
  this.timeout(10000);

  let clientSocket;

  before((done) => {
    const httpserver = http.createServer();

    socketModule(httpserver);

    httpserver.listen(() => {
      const port = httpserver.address().port;
      clientSocket = new Client(`http://localhost:${port}`);
      clientSocket.on("connection", done);
    });
  });

  after((done) => {
    clientSocket.close();
    done();
  });

  describe("소켓 통신으로 데이터 주고받기가 가능해야 합니다.", () => {
    it("1. 소켓아이디를 보내주고받기가 가능해야합니다", (done) => {
      const id = clientSocket.id;

      clientSocket.on("join-room", (data) => {
        expect(data).to.eq(id);

        done();
      });
      clientSocket.emit("join-room", "gameRoom");
    });
  });

  describe("역할을 선택하면 room 객체에 저장되어야 합니다.", () => {
    it("1. 역할을 선택하면 값이 적절하게 들어와야 합니다.", (done) => {
      clientSocket.on("user-count", (data) => {
        expect(data).to.eq({
          id: "12",
          role: "it",
          difficulty: "어려움",
        });

        done();
      });

      clientSocket.emit("user-count", {
        id: "12",
        role: "it",
        difficulty: "어려움",
      });
    });
  });
});
