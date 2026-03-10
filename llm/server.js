require("dotenv").config();
const {app} = require('./src/app');
const { startGrpcServer } = require('./src/grpcServer');

const port = process.env.PORT || 8003;
const grpcPort = process.env.GRPC_PORT || 50051;

// Start HTTP server
app.listen(port, () => {
    console.log(`🚀 HTTP Server started on port ${port}`);
});

// Start gRPC server
startGrpcServer(grpcPort);








