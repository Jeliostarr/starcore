FROM node:20

WORKDIR /app*.json
COPY package*.json ./
RUN npm install --production
COPY . .

EXPOSE 8000

CMD ["npm", "start"]
