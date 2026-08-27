const { Kafka } = require("kafkajs");

jest.mock("kafkajs", () => ({
  Kafka: jest.fn().mockImplementation(() => ({
    producer: jest.fn().mockReturnValue({
      connect: jest.fn(),
      disconnect: jest.fn(),
      send: jest.fn(),
    }),
    consumer: jest.fn().mockReturnValue({
      connect: jest.fn(),
      disconnect: jest.fn(),
      subscribe: jest.fn(),
      run: jest.fn(),
      commitOffsets: jest.fn(),
    }),
  })),
}));

describe("Kafka Client Configuration", () => {
  let originalKafkaUsername;
  let originalKafkaPassword;
  let originalBrokers;
  let originalClientId;

  beforeEach(() => {
    // Store original environment variables
    originalKafkaUsername = process.env.KAFKA_USERNAME;
    originalKafkaPassword = process.env.KAFKA_PASSWORD;
    originalBrokers = process.env.KAFKA_BROKERS;
    originalClientId = process.env.CLIENT_ID;

    // Clear mocks before each test
    Kafka.mockClear();

    // Set default environment variables for testing
    process.env.KAFKA_BROKERS = "localhost:9092";
    process.env.CLIENT_ID = "test-client";
  });

  afterEach(() => {
    // Restore original environment variables
    process.env.KAFKA_USERNAME = originalKafkaUsername;
    process.env.KAFKA_PASSWORD = originalKafkaPassword;
    process.env.KAFKA_BROKERS = originalBrokers;
    process.env.CLIENT_ID = originalClientId;

    // Clear module cache to re-require index.js and apply new env vars
    jest.resetModules();
  });

  test("should configure Kafka client with SASL when username and password are provided", () => {
    process.env.KAFKA_USERNAME = "testuser";
    process.env.KAFKA_PASSWORD = "testpassword";

    // Require the module after setting environment variables
    require("./index");

    expect(Kafka).toHaveBeenCalledWith({
      clientId: "test-client",
      brokers: ["localhost:9092"],
      sasl: {
        mechanism: "scram-sha-512",
        username: "testuser",
        password: "testpassword",
      },
    });
  });

  test("should configure Kafka client without SASL when username and password are not provided", () => {
    delete process.env.KAFKA_USERNAME;
    delete process.env.KAFKA_PASSWORD;

    // Require the module after setting environment variables
    require("./index");

    expect(Kafka).toHaveBeenCalledWith({
      clientId: "test-client",
      brokers: ["localhost:9092"],
    });
  });
});
