const { Kafka } = require('kafkajs');
const { EventProcessor } = require('./eventProcessor');

const CLIENT_ID = process.env.CLIENT_ID || 'insurance-application-processor';
const BROKERS = (process.env.KAFKA_BROKERS || 'localhost:9092').split(',');
const INPUT_TOPIC = process.env.INPUT_TOPIC || 'ASE_PROCESSED';
const OUTPUT_TOPIC = process.env.OUTPUT_TOPIC || 'CASE_PROCESSED';

const kafka = new Kafka({
    clientId: CLIENT_ID,
    brokers: BROKERS,
});

const producer = kafka.producer();
const consumer = kafka.consumer({ groupId: CLIENT_ID });
const eventProcessor = new EventProcessor();

let isRunning = true;

const run = async () => {
    await producer.connect();
    await consumer.connect();

    await consumer.subscribe({ topic: INPUT_TOPIC, fromBeginning: true });

    await consumer.run({
        eachMessage: async ({ topic, partition, message }) => {
            if (!isRunning) return; // Stop processing if shutdown initiated

            try {
                const event = JSON.parse(message.value.toString());
                console.log(`Received event: ${event.type} for application ${event.applicationId}`);

                const caseProcessedEvent = eventProcessor.processEvent(event);

                if (caseProcessedEvent) {
                    await producer.send({
                        topic: OUTPUT_TOPIC,
                        messages: [
                            { value: JSON.stringify(caseProcessedEvent), key: caseProcessedEvent.applicationId },
                        ],
                    });
                    console.log(`Produced CASE_PROCESSED event for application ${caseProcessedEvent.applicationId} with status ${caseProcessedEvent.validation.canProceedToReadiness ? 'can proceed' : 'cannot proceed'}`);
                }

                // Commit offset manually after successful processing and producing
                // This ensures at-least-once processing. For exactly-once, more complex logic is needed.
                await consumer.commitOffsets([{ topic, partition, offset: (parseInt(message.offset) + 1).toString() }]);

            } catch (error) {
                console.error(`Error processing message from topic ${topic}, partition ${partition}, offset ${message.offset}:`, error.message);
                // Depending on requirements, could send to a Dead Letter Topic (DLT) here
            }
        },
    });
};

const shutdown = async () => {
    console.log('Shutting down application...');
    isRunning = false; // Prevent new messages from being processed

    // Give some time for in-flight messages to complete, or implement more robust graceful shutdown
    await new Promise(resolve => setTimeout(resolve, 5000)); 

    try {
        await consumer.disconnect();
        console.log('Kafka consumer disconnected.');
    } catch (error) {
        console.error('Error disconnecting Kafka consumer:', error.message);
    }

    try {
        await producer.disconnect();
        console.log('Kafka producer disconnected.');
    } catch (error) {
        console.error('Error disconnecting Kafka producer:', error.message);
    }
    console.log('Application shutdown complete.');
    process.exit(0);
};

process.on('SIGTERM', shutdown);
process.on('SIGINT', shutdown);

run().catch(e => console.error(`[kafka-example] ${e.message}`, e));
