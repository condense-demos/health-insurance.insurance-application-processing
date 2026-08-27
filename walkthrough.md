# Project Walkthrough: Insurance Application Processing Service

This document outlines the implementation of the Insurance Application Processing Service, a Node.js application designed to process real-time events related to insurance applications using Apache Kafka.

## 1. Project Structure

The project follows a modular structure to separate concerns:

```
insurance_app/
├── index.js
└── eventProcessor.js
package.json
.gitignore
Dockerfile
env_variables.json
README.md
```

- `insurance_app/eventProcessor.js`: Contains the core business logic for processing various event types, managing application state, and performing validations.
- `insurance_app/index.js`: Acts as the application's entry point, handling Kafka connectivity (consumer and producer), environment variable configuration, and orchestrating the event processing flow.
- `package.json`: Defines project metadata and dependencies, including `kafkajs` for Kafka interaction.
- `Dockerfile`: Provides instructions for building a Docker image of the application, ensuring a consistent deployment environment.
- `README.md`: Offers comprehensive documentation on how to set up, run, and configure the service.
- `.gitignore`: Specifies intentionally untracked files that Git should ignore.
- `env_variables.json`: Defines the schema and descriptions for all environment variables used by the application, facilitating platform integration and configuration.

## 2. Core Logic: `eventProcessor.js`

`eventProcessor.js` encapsulates the state management and business rules. It exports two main entities:

- **`ApplicationState` Class:** Represents the mutable state of an individual insurance application. It tracks `applicationId`, `status`, `data` (payload), `blockers`, `warnings`, `canProceedToReadiness` flag, and an `eventTimeline` to manage event order and prevent duplicates. Key methods include:
  - `addBlocker(message)`: Adds a blocking validation issue.
  - `addWarning(message)`: Adds a non-blocking warning.
  - `removeBlocker(message)`: Removes a specific blocker.
  - `updateCanProceedToReadiness()`: Recalculates the readiness flag based on current blockers.
  - `processApplicationCreated(event)`: Initializes the application state, performs initial validations (e.g., age, applicant name), maps tobacco status (`N` to `NON_SMOKER`), calculates `coverageIncomeRatio`, and sets the initial `canProceedToReadiness` state.
  - `processHealthQuestionsCompleted(event)`: Updates the state with health answers, performs health-related validations (e.g., major illness, doctor visit), and specifically notes that `prescriptionMedication=YES` is a warning, not a blocker.
  - `processConsentReceived(event)`: Stores consent metadata, performs final validations related to consent, and updates the overall application status.
  - `getCaseProcessedEvent()`: Formats the current application state into a `CASE_PROCESSED` event, including all data, validation results, and the `canProceedToReadiness` flag.

- **`EventProcessor` Class:** Manages multiple `ApplicationState` instances using a `Map` (keyed by `applicationId`). Its primary method is `processEvent(event)`, which:
  - Parses incoming events.
  - Retrieves or creates an `ApplicationState` instance for the given `applicationId`.
  - Handles out-of-order events (e.g., `HEALTH_QUESTIONS_COMPLETED` before `APPLICATION_CREATED`) by ignoring them.
  - Prevents reprocessing of duplicate event types for the same application.
  - Dispatches the event to the appropriate `ApplicationState` method (`processApplicationCreated`, `processHealthQuestionsCompleted`, `processConsentReceived`).
  - Returns a `CASE_PROCESSED` event representing the updated state, suitable for publishing to Kafka.

## 3. Kafka Integration: `index.js`

`index.js` sets up the Kafka consumer and producer using `kafkajs`:

- **Configuration:** Reads `KAFKA_BROKERS`, `INPUT_TOPIC`, `OUTPUT_TOPIC`, and `CLIENT_ID` from environment variables, with sensible defaults provided.
- **Consumer/Producer Setup:** Initializes `KafkaJS` consumer and producer instances.
- **Event Loop:** The `run` function connects to Kafka, subscribes to the `INPUT_TOPIC`, and processes messages in a loop. For each message:
  - It parses the event JSON.
  - Calls `eventProcessor.processEvent()` to update the application state.
  - If a `CASE_PROCESSED` event is returned, it publishes it to the `OUTPUT_TOPIC`.
  - Commits Kafka offsets to ensure at-least-once processing semantics.
- **Error Handling:** Includes basic error logging for message processing failures. A more advanced implementation would include dead-letter queue (DLQ) functionality.
- **Graceful Shutdown:** Implements `SIGTERM` and `SIGINT` (Ctrl+C) signal handling to ensure that the application can shut down cleanly, disconnecting Kafka clients and preventing new messages from being processed during shutdown.

## 4. Environment Variables (`env_variables.json`)

The `env_variables.json` file formally defines the expected environment variables, including their type, whether they are mandatory, default values, and a brief description. This is crucial for the Condense platform to correctly inject runtime parameters.

## 5. Dockerization (`Dockerfile`)

The `Dockerfile` provides a multi-stage build setup for efficient containerization:

- Uses a `node:18-alpine` base image for a lightweight runtime.
- Sets the working directory to `/app`.
- Copies `package.json` and installs Node.js dependencies.
- Copies the application code into the image.
- Defines default environment variables, which can be overridden at container runtime.
- Sets `npm start` as the default command to run the application.

## How to Run

Refer to the `README.md` for detailed instructions on local development and Docker deployment.

This service is now ready to consume, process, and produce insurance application events, maintaining state and applying complex business logic in an event-driven architecture.
