FROM node:11-alpine
COPY / /app
WORKDIR /app
RUN rm /app/.env
RUN npm i --production
ENV LOG_LEVEL=INFO
ENV SPARK_HOST=localhost
ENV MONGO=mongodb://localhost:27017
ENV USER_BLACKLIST=
ENV SPARK_QUEUE=
ENV SPARK_LIBRARIES=
EXPOSE 9085
HEALTHCHECK --start-period=5s --interval=1m --timeout=3s \
  CMD curl -f http://localhost:9085/ || exit 1
CMD node index.js
