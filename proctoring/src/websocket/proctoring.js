const { Server } = require('socket.io');
const {
    receiveProctoringData,
    finalizeProctoring
} = require('../controllers/proctoringController');

function setupSocketIO(server) {

    const io = new Server(server, {
        path: "/ws/socket.io",
        cors: {
            origin: '*',
            methods: ['GET', 'POST']
        }
    });

    const proctorNamespace = io.of('/proctor');

    proctorNamespace.on('connection', (socket) => {
        
        console.log("Proctor namespace connected:", socket.id);
        let sessionId = null;

        socket.on('proctoring:data', async (payload, ack) => {

            sessionId = payload.session_id;
            console.log(payload.cheating_probability , payload.session_id , payload.student_id , payload.exam_id);
            const response = await receiveProctoringData(payload);

            if (typeof ack === 'function') {
                ack(response);
            } else {
                socket.emit('proctoring:ack', response);
            }
        });

        socket.on('disconnect', async () => {

            if (sessionId) {
                await finalizeProctoring(sessionId);
            }

            console.log("Proctor socket disconnected:", sessionId);
        });

    });

    return io;
}

module.exports = { setupSocketIO };