const kafka = require("../config/kafka");
const producer = kafka.producer();

// connect producer once only
const connectProducer = async () => {
  try {
    await producer.connect();
    console.log("🚀 Kafka Producer Connected");
  } catch (err) {
    console.error("Producer Connection Error:", err);
  }
};


// exportable send function
const sendMessage = async (topic, data) => {
  try {
    await producer.send({
      topic,
      messages: [{ value: JSON.stringify(data) }],
    });
    console.log("📨 Kafka Message Sent:", data);
  } catch (err) {
    console.error("Error Sending Kafka Message:", err);
  }
};

module.exports = { sendMessage , connectProducer };
