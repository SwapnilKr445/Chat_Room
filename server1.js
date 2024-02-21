const express = require('express');
const http = require('http');
const socketIO = require('socket.io');

const app = express();
const server = http.createServer(app);
const io = socketIO(server);

app.get('/', (req, res) => {
    res.sendFile(__dirname + '/index.html');
});


io.on('connection', (socket) => {
    console.log('Client connected');

    socket.on('disconnect', () => {
        console.log('Client disconnected');
    });

    socket.on('join', (data) => {
        const { username, room } = data;
        socket.join(room);
        console.log(`${username} joined room ${room}`);
        io.to(room).emit('update_status', { username, status: 'online' });
    });

    socket.on('leave', (data) => {
        const { username, room } = data;
        socket.leave(room);
        console.log(`${username} left room ${room}`);
        io.to(room).emit('update_status', { username, status: 'offline' });
    });

    socket.on('message', (data) => {
        const { room, message, sender } = data;
        console.log(`Received message in room ${room} from ${sender}: ${message}`);
        io.to(room).emit('message', { sender, message });
    });
});
const PORT = process.env.PORT || 5000;
server.listen(PORT, () => {
    console.log(`Server is running on http://localhost:${PORT}`);
});
