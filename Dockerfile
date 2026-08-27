# Use a Node.js base image
FROM node:20-slim

# Set the working directory
WORKDIR /app

# Copy package.json and package-lock.json (if any)
COPY package*.json ./

# Install dependencies
RUN npm install

# Copy the application code
COPY . .

# Command to run the application
CMD ["npm", "start"]
