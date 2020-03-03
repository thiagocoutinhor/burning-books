FROM node:11-alpine
COPY / /app
WORKDIR /app
ENV SPARK_HOST=hdcpx02.interno
ENV MONGO=mongodb://mongo:27017
ENV MONGO_USER=notebook
ENV MONGO_PASSWORD=sparkbook
ENV USER_BLACKLIST=sods3001,phdpdig
ENV SPARK_QUEUE=root.digital.users
EXPOSE 9085
CMD node index.js
