FROM node:11-alpine as build
COPY / /app
WORKDIR /app/client
RUN npm i --production --no-audit
RUN npm run build
WORKDIR /app
RUN rm client -r

FROM node:11-alpine
RUN apk add curl
COPY --from=build /app /app
WORKDIR /app
RUN npm i --production --no-audit
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
CMD NODE_ENV=production node index.js
