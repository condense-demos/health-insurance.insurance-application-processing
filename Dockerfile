# Use a Node.js base image
FROM node:18-alpine

# Set the working directory
WORKDIR /app

# Copy package.json and package-lock.json (if any)
COPY package*.json ./

# Install dependencies
RUN npm install

# Copy the application code
COPY insurance_app insurance_app

# Expose the port your app runs on (if any, not directly applicable here but good practice)
# EXPOSE 3000 

# Define environment variables (can be overridden at runtime)
ENV KAFKA_BROKERS="localhost:9092"
ENV INPUT_TOPIC="ASE_PROCESSED"
ENV OUTPUT_TOPIC="CASE_PROCESSED"
ENV CLIENT_ID="insurance-application-processor"

# Command to run the application
CMD ["npm", "start"]
