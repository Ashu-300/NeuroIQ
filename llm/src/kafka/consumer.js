const kafka = require("../config/kafka");

const consumer = kafka.consumer({ groupId: "question-group" });

const receiveMessages = async () => {
  await consumer.subscribe({ topic: "syallabus", fromBeginning: true });

  await consumer.run({
    eachMessage: async ({ message }) => {
      console.log("📩 Received:", message.value.toString());
    },
  });
};

const run = async () => {
  await consumer.connect(); // ⬅️ connection only
  await receiveMessages();
};

module.exports = {run}
