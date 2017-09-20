const http = require('http');
const fs = require('fs');
const socketio = require('socket.io');

const port = process.env.PORT || process.env.NODE_PORT || 3000;

const index = fs.readFileSync(`${__dirname}/../client/client.html`);

const onRequest = (request, response) => {
  response.writeHead(200, { 'Content-Type': 'text/html' });
  response.write(index);
  response.end();
};

const app = http.createServer(onRequest).listen(port);

console.log(`listening on 127.0.0.1: ${port}`);

const io = socketio(app);

const users = {};

const onJoined = (sock) => {
  const socket = sock;
  socket.on('join', (data) => {
    const joinMsg = {
      name: 'server',
      msg: `There are ${Object.keys(users).length} other users online`,
    };
    users[data.name] = data.name;
    socket.name = data.name;
    socket.emit('msg', joinMsg);

    socket.join('room1');

    const response = {
      name: 'server',
      msg: `${data.name} has joined the room. `,
    };
    socket.broadcast.to('room1').emit('msg', response);

    console.dir(`${users[socket.name]} joined`);

    socket.emit('msg', { name: 'server', msg: 'You joined the room' });
  });
};

const onMsg = (sock) => {
  const socket = sock;

  socket.on('msgToServer', (data) => {
    const msg = data.msg;
    if (msg.includes('/me', 0)) {
      io.sockets.in('room1').emit('action', { msg: `   ${socket.name} ${msg.slice(3)}` });
    } else if (msg.includes('/time', 0)) {
      const date = new Date();
      socket.join(socket.name);
      io.sockets.in(socket.name).emit('action', { msg: `${date.getHours()}:${date.getMinutes()}:${date.getSeconds()}` });
      socket.leave(socket.name);
    } else if (msg.includes('/name', 0)) {
      const newName = msg.slice(6);
      if (users[newName] === newName) {
        socket.join(socket.name);
        io.sockets.in(socket.name).emit('action', { msg: 'name already exists' });
        socket.leave(socket.name);
      } else {
        const oldName = socket.name;
        delete users[socket.name];
        socket.name = newName;
        users[newName] = newName;
        io.sockets.in('room1').emit('action', { msg: `${oldName} is now known as ${newName}` });
      }
    } else {
      io.sockets.in('room1').emit('msg', { name: socket.name, msg: data.msg });
    }
  });
};

const onDisconnect = (sock) => {
  const socket = sock;
  delete users[socket.name];
};

io.sockets.on('connection', (socket) => {
  console.log('started');

  onJoined(socket);
  onMsg(socket);
  onDisconnect(socket);
});

console.log('Websocket server started');

