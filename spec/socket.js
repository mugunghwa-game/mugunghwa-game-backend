const { expect } = require("chai");
const Client = require("socket.io-client");
const http = require("http");

const socketModule = require("../src/socket");

describe("", () => {
  // this.timeout(2000);

  let clientSocket;

  before((done) => {
    const httpserver = http.createServer();

    socketModule(httpserver);

    httpserver.listen(() => {
      const port = httpserver.address().port;
      clientSocket = new Client(`http://localhost:${port}`);
      clientSocket.on("connect", done);
    });
  });

  after((done) => {
    clientSocket.close();
    done();
  });

  describe("소켓 통신으로 데이터 주고받기가 가능해야 합니다.", () => {
    it("1. 소켓아이디를 보내주고받기가 가능해야합니다", (done) => {
      const id = clientSocket.id;

      clientSocket.on("send user id", (data) => {
        expect(data).to.eq(id);

        done();
      });
      clientSocket.emit("request user id");
    });
  });
});
