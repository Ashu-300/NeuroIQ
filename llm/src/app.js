const express = require('express');
const cors = require('cors');
// const{connectProducer} = require('./src/kafka/producer')
// const{run} = require('./src/kafka/consumer')
const {router} = require('./routes/routes')
const morgan = require('morgan');


const app = express();

// CORS middleware
app.use(cors({
  origin: '*',
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS', 'PATCH'],
  allowedHeaders: ['Accept', 'Authorization', 'Content-Type', 'X-CSRF-Token'],
  exposedHeaders: ['Link'],
  credentials: true,
  maxAge: 300
}));

app.use(express.json());
app.use(morgan('dev'));
app.use("/api/llm", router);



module.exports = {app }