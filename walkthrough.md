# Walkthrough: Kafka SCRAM-SHA-512 Authentication

This walkthrough details the changes made to `env_variables.json` and `index.js` to support SCRAM-SHA-512 authentication for Kafka.

## `env_variables.json` Updates

Two new environment variables have been added to `env_variables.json`:

- `KAFKA_USERNAME`: This is a `Password` type variable that will hold the username for Kafka authentication. It is marked as mandatory.
- `KAFKA_PASSWORD`: This is also a `Password` type variable for the Kafka password. It is mandatory.

These variables are crucial for connecting to Kafka brokers secured with SCRAM-SHA-512.

## `index.js` Updates

`index.js` has been modified to incorporate the new Kafka authentication mechanism:

1.  **Environment Variable Loading**: `KAFKA_USERNAME` and `KAFKA_PASSWORD` are now read from the environment variables using `process.env`.
2.  **Kafka Client Configuration**: The `Kafka` constructor call has been updated to include a `sasl` configuration object. This object specifies:
    -   `mechanism: 'scram-sha-512'`: Indicates the authentication mechanism to be used.
    -   `username: KAFKA_USERNAME`: Uses the loaded `KAFKA_USERNAME` for authentication.
    -   `password: KAFKA_PASSWORD`: Uses the loaded `KAFKA_PASSWORD` for authentication.

This ensures that the Kafka client can connect securely to brokers that require SCRAM-SHA-512 authentication.

## Testing

A new test file, `test.js`, has been created to verify the Kafka client configuration. It uses `jest` to mock the `kafkajs` library and checks two scenarios:

1.  **With SASL**: When `KAFKA_USERNAME` and `KAFKA_PASSWORD` are provided, the Kafka client should be initialized with the correct `sasl` configuration.
2.  **Without SASL**: When `KAFKA_USERNAME` and `KAFKA_PASSWORD` are not provided, the Kafka client should be initialized without the `sasl` configuration, maintaining backward compatibility.

To run the tests, first ensure `jest` is installed (`npm install`), then execute: `npm test`

