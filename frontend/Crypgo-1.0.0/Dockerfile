# Base image
FROM node:20-alpine

# Set working directory
WORKDIR /app

# Copy package files and install dependencies
COPY package*.json ./
RUN npm install

# Copy the rest of the frontend code
COPY . .

# Build the app
RUN npm run build

# Expose port
EXPOSE 3000

# Start the Next.js server (SSR)
CMD ["npm", "start"]
