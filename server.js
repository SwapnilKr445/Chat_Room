// const express = require('express');
// const http = require('http');
// const app = express();
// const socket = require('socket.io');
// const server = http.createServer(app);
// const io = socket(server);

// io.on('connection', (socket) => {
//     console.log('user connected');
//     socket.on('disconnect', () => {
//         console.log('user disconnected');
//     });
//     socket.on('message',(msg)=>{
//         console.log(msg);
//         io.emit('client message',msg+' from server');
//     })
// });

// app.get('/', (req, res) => {
//     res.sendFile(__dirname+'/views/index.html');
// });

// server.listen(3000, () => {
//     console.log("server is running on port 3000")
// });


// const express = require('express')
// const app = express()
// const server = require('http').Server(app)
// const io = require('socket.io')(server)


// app.set('views', './views')
// app.set('view engine', 'ejs')
// app.use(express.static('public'))
// app.use(express.urlencoded({ extended: true }))

// const rooms = { }

// app.get('/', (req, res) => {
//   res.render('index', { rooms: rooms })
// })

// app.post('/room', (req, res) => {
//   if (rooms[req.body.room] != null) {
//     return res.redirect('/')
//   }
//   rooms[req.body.room] = { users: {} }
//   res.redirect(req.body.room)
//   // Send message that new room was created
//   io.emit('room-created', req.body.room)
// })

// app.get('/:room', (req, res) => {
//   if (rooms[req.params.room] == null) {
//     return res.redirect('/')
//   }
//   res.render('room', { roomName: req.params.room })
// })

// server.listen(3000)

// io.on('connection', socket => {
//   socket.on('new-user', (room, name) => {
//     socket.join(room)
//     rooms[room].users[socket.id] = name
//     socket.to(room).broadcast.emit('user-connected', name)
//   })
//   socket.on('send-chat-message', (room, message) => {
//     socket.to(room).broadcast.emit('chat-message', { message: message, name: rooms[room].users[socket.id] })
//   })
//   socket.on('disconnect', () => {
//     getUserRooms(socket).forEach(room => {
//       socket.to(room).broadcast.emit('user-disconnected', rooms[room].users[socket.id])
//       delete rooms[room].users[socket.id]
//     })
//   })
// })

// function getUserRooms(socket) {
//   return Object.entries(rooms).reduce((names, [name, room]) => {
//     if (room.users[socket.id] != null) names.push(name)
//     return names
//   }, [])
// }





















const path = require("path");
const http = require("http");
const express = require("express");
const socketio = require("socket.io");
const formatMessage = require("./utils/messages");
const createAdapter = require("@socket.io/redis-adapter").createAdapter;
const redis = require("redis");
require("dotenv").config();
const { createClient } = redis;
const {
  userJoin,
  getCurrentUser,
  userLeave,
  getRoomUsers,
} = require("./utils/users");

const app = express();
const server = http.createServer(app);
const io = socketio(server);

// Set static folder
app.use(express.static(path.join(__dirname, "public")));

const botName = "ChatCord Bot";

(async () => {
  pubClient = createClient({ url: "redis://127.0.0.1:6379" });
  await pubClient.connect();
  subClient = pubClient.duplicate();
  io.adapter(createAdapter(pubClient, subClient));
})();

// Run when client connects
io.on("connection", (socket) => {
  console.log(io.of("/").adapter);
  socket.on("joinRoom", ({ username, room }) => {
    const user = userJoin(socket.id, username, room);

    socket.join(user.room);

    // Welcome current user
    socket.emit("message", formatMessage(botName, "Welcome to ChatCord!"));

    // Broadcast when a user connects
    socket.broadcast
      .to(user.room)
      .emit(
        "message",
        formatMessage(botName, `${user.username} has joined the chat`)
      );

    // Send users and room info
    io.to(user.room).emit("roomUsers", {
      room: user.room,
      users: getRoomUsers(user.room),
    });
  });

  // Listen for chatMessage
  socket.on("chatMessage", (msg) => {
    const user = getCurrentUser(socket.id);

    io.to(user.room).emit("message", formatMessage(user.username, msg));
  });

  // Runs when client disconnects
  socket.on("disconnect", () => {
    const user = userLeave(socket.id);

    if (user) {
      io.to(user.room).emit(
        "message",
        formatMessage(botName, `${user.username} has left the chat`)
      );

      // Send users and room info
      io.to(user.room).emit("roomUsers", {
        room: user.room,
        users: getRoomUsers(user.room),
      });
    }
  });
});

const PORT = process.env.PORT || 3000;

server.listen(PORT, () => console.log(`Server running on port ${PORT}`));