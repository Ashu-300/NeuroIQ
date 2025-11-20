package kafka

import (
	"encoding/json"
	"log"
	"os"

	"github.com/IBM/sarama"
)

type Producer struct {
	AsyncProducer sarama.AsyncProducer
}

var producer *Producer

func NewProducer(brokers []string) (*Producer, error) {
	config := sarama.NewConfig()

	config.Producer.Return.Successes = true
	config.Producer.Return.Errors = true
	config.Producer.RequiredAcks = sarama.WaitForAll
	config.Producer.Retry.Max = 5
	config.Producer.Idempotent = true
	config.Net.MaxOpenRequests = 1 

	producer, err := sarama.NewAsyncProducer(brokers, config)
	if err != nil {
		return nil, err
	}

	p := &Producer{AsyncProducer: producer}

	go p.handleErrors()
	go p.handleSuccess()

	return p, nil
}

func (p *Producer) handleErrors() {
	for err := range p.AsyncProducer.Errors() {
		log.Println("❌ Producer error:", err.Error())
	}
}

func (p *Producer) handleSuccess() {
	for msg := range p.AsyncProducer.Successes() {
		log.Printf("✅ Message sent: topic=%s partition=%d offset=%d",
			msg.Topic, msg.Partition, msg.Offset)
	}
}


func (p *Producer) SendJSON(topic string, key string, payload interface{}) error {
	data, err := json.Marshal(payload)
	if err != nil {
		return err
	}

	msg := &sarama.ProducerMessage{
		Topic: topic,
		Key:   sarama.StringEncoder(key),
		Value: sarama.ByteEncoder(data),
	}

	p.AsyncProducer.Input() <- msg
	return nil
}


func (p *Producer) Close() {
	if err := p.AsyncProducer.Close(); err != nil {
		log.Println("Error closing producer:", err)
	}
}


func KafkaInit(){
	brokers := []string{os.Getenv("kAFKA_URL")}
	var err error
	producer, err = NewProducer(brokers)
	if err != nil {
		panic(err)
	}
	log.Println("✅ Kafka producer initialized")
}

func GetKafkaProducer() *Producer{
	return producer
}