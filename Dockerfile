# Use official Node.js runtime as a base image
FROM node:16

# Create and set working directory inside the container
WORKDIR /app

# Copy package.json and package-lock.json to install dependencies
COPY package*.json ./

# Install dependencies
RUN npm install

# Copy the rest of the app source code
COPY . .

# Expose the port your app listens on
EXPOSE 3000

# Command to run your app
CMD ["node", "index.js"]