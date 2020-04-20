FROM node:11-alpine
RUN apk add curl
COPY / /app
WORKDIR /app
RUN rm /app/.env
RUN npm i --production
RUN export NODE_ENV=production
ENV LOG_LEVEL=INFO
ENV LOGIN_TYPE=PASSWORD
ENV SPARK_HOST=localhost
ENV MONGO=mongodb://localhost:27017
ENV USER_BLACKLIST=
ENV SPARK_QUEUE=
ENV SPARK_LIBRARIES=
EXPOSE 9085
HEALTHCHECK --start-period=10s --interval=1m --timeout=5s --retries=3 \
  CMD curl -f http://localhost:9085/ || exit 1
CMD node index.js
