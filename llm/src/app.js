const express = require('express');
// const{connectProducer} = require('./src/kafka/producer')
// const{run} = require('./src/kafka/consumer')
const {router} = require('./routes/routes')
const morgan = require('morgan');


const app = express();

app.use(express.json());
app.use(morgan('dev'));
app.use("/api/llm", router);



module.exports = {app }