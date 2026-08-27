# Use a Node.js base image
FROM node:20-slim

# Set the working directory
WORKDIR /app

# Copy package.json and package-lock.json (if any)
COPY health-insurance.insurance-application-processing/package*.json ./

# Install dependencies
RUN npm install

# Copy the application code
COPY health-insurance.insurance-application-processing/ .

# Command to run the application
CMD ["npm", "start"]
