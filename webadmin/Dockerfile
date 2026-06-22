FROM node:18-alpine
WORKDIR /app
COPY package*.json ./
RUN npm install
COPY . .
EXPOSE 8084
CMD ["npx", "http-server", ".", "-p", "8084", "-a", "0.0.0.0", "-c-1"]
