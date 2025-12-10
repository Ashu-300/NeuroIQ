const { Kafka } = require("kafkajs");

const KAFKA_BROKERS = process.env.KAFKA_BROKERS || "localhost:9092";

const kafka = new Kafka({
  clientId: "salon-app",
  brokers: KAFKA_BROKERS.split(","),
});

module.exports = kafka;