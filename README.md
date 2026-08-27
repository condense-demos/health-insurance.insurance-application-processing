# Insurance Application Processing Service

This service processes insurance application events from a Kafka input topic, applies business logic and validations, and publishes the resulting application state to a Kafka output topic.

## Features

- Consumes `APPLICATION_CREATED`, `HEALTH_QUESTIONS_COMPLETED`, and `CONSENT_RECEIVED` events.
- Maintains application state and applies various business rules and validations.
- Calculates `coverageIncomeRatio`.
- Maps tobacco use status (e.g., `N` to `NON_SMOKER`).
- Manages validation blockers and warnings.
- Determines if an application `canProceedToReadiness` for underwriting.
- Ignores duplicate events and out-of-order events (e.g., health/consent before application creation).
- Produces `CASE_PROCESSED` events with the current application state and validation results.

## Getting Started

### Prerequisites

- Node.js (version 18 or higher)
- Docker (for containerized deployment)
- A running Kafka cluster

### Local Development

1.  **Clone the repository (if applicable):**

    ```bash
    git clone <your-repo-url>
    cd insurance-application-processing
    ```

2.  **Install dependencies:**

    ```bash
    npm install
    ```

3.  **Configure Environment Variables:**

    The application uses environment variables for configuration. You can set them directly in your shell or use a `.env` file (though not directly supported by this setup, it's a common practice).

    See `env_variables.json` for a list of configurable variables.

    Example:

    ```bash
    export KAFKA_BROKERS="localhost:9092"
    export INPUT_TOPIC="ASE_PROCESSED"
    export OUTPUT_TOPIC="CASE_PROCESSED"
    npm start
    ```

4.  **Run the application:**

    ```bash
    npm start
    ```

### Docker

1.  **Build the Docker image:**

    ```bash
    docker build -t insurance-app-processor .
    ```

2.  **Run the Docker container:**

    You can pass environment variables directly to the container.

    ```bash
    docker run -d \
      -e KAFKA_BROKERS="your_kafka_broker:9092" \
      -e INPUT_TOPIC="ASE_PROCESSED" \
      -e OUTPUT_TOPIC="CASE_PROCESSED" \
      --name insurance-processor \
      insurance-app-processor
    ```

## Environment Variables

The following environment variables can be configured:

- `KAFKA_BROKERS`: Comma-separated list of Kafka broker addresses (e.g., `localhost:9092,kafka.example.com:9092`). Default: `localhost:9092`.
- `INPUT_TOPIC`: The Kafka topic from which to consume raw application events. Default: `ASE_PROCESSED`.
- `OUTPUT_TOPIC`: The Kafka topic to which processed `CASE_PROCESSED` events will be published. Default: `CASE_PROCESSED`.
- `CLIENT_ID`: A unique identifier for this Kafka client. Default: `insurance-application-processor`.

## Event Structure

### Input Events

The service expects events with a `type` and `applicationId` field, along with a `payload` specific to the event type.

Example `APPLICATION_CREATED` event:

```json
{
  "type": "APPLICATION_CREATED",
  "applicationId": "app-123",
  "timestamp": "2023-10-27T10:00:00Z",
  "payload": {
    "applicantName": "Jane Smith",
    "age": 30,
    "tobaccoUse": "N",
    "coverageAmount": 100000,
    "annualIncome": 50000
  }
}
```

### Output Event (`CASE_PROCESSED`)

The output event contains the full current state of the application, including all processed data, validation results, and readiness status.

```json
{
  "applicationId": "app-123",
  "timestamp": "2023-10-27T10:05:00Z",
  "status": "READY_FOR_UNDERWRITING_WITH_WARNINGS",
  "currentApplicationState": {
    /* ... combined application data ... */
  },
  "validation": {
    "blockers": [],
    "warnings": ["Applicant is on prescription medication."],
    "canProceedToReadiness": true
  }
}
```

## Health Check

(Not implemented in this basic version, but would typically involve an HTTP endpoint to check service status and Kafka connectivity.)

## To Do

- Implement proper logging.
- Add health check endpoint.
- Implement dead-letter queue (DLQ) for message processing failures.
- Enhance duplicate event detection (e.g., using event IDs and tracking latest processed event timestamp).
