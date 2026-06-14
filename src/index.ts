import { createServer } from "node:http";
import { Server } from "socket.io";
import app from "./app.js";
import initSocketServer from "./sockets/index.js";

const server = createServer(app);

const io = new Server(server, {
  cors: {
    origin: "*",
    methods: ["GET", "POST"],
  },
});

initSocketServer(io);

const port = Number(process.env.PORT) || 3000;
server.listen(port, () => {
  console.log(`server running at port ${port}...`);
});
