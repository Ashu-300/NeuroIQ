const express = require('express');
// const{connectProducer} = require('./src/kafka/producer')
// const{run} = require('./src/kafka/consumer')
const {router} = require('./routes/routes')

const app = express();

app.use(express.json());
app.use("/llm-service", router);




module.exports = {app }