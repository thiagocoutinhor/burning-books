# Burning Books - SSH Driven Spark Notebook

Burning Books is a web notebook that conveys it commands to a cluster thorugh a SSH connection.
It uses the default SSH autentication to control access.

It is in **alpha** right now, use at your own risk.

## Dependences

This image depends on a mongodb instance running somewhere and an SSH host with spark installed to work.

## Running

There is a couple of ways that you can run this application. By default it poinst to the port 9085.

### With docker run

You can run using docker run and using the enviroment variables `MONGO` and `SPARK_HOST`.

`docker run -d -p 9085:9085 -e MONGO=[mongodb connection url] -e SPARK_HOST=[spark host] --name burning-books tcoutinho/burning-books`

### With a cocker-compose file

Docker compose let's you download and run a mongodb instance along this one in a neat service package.

docker-compose.yml
```yaml
version: '3'
services:
    web:
        image: tcoutinho/burning-books
        ports:
            - 9085:9085
        links:
            - mongo
        restart: always
        environment:
            MONGO: mongodb://burning:book@mongo:27017
            SPARK_HOST: [your host here]

    mongo:
        image: mongo
        restart: always
        ports:
            - 27017:27017
        enviroment:
            MONGO_INITDB_ROOT_USERNAME: burning
            MONGO_INITDB_ROOT_PASSWORD: book
```

## Enviroment Variables

| Variable          | Default                   | Meaning                                       |
|-------------------|---------------------------|-----------------------------------------------|
| LOG_LEVEL         | INFO                      | Level of the log messages                     |
| SPARK_HOST        | localhost                 | SSH host with spark-shell                     |
| MONGO             | mongodb://localhost:27017 | Mongodb connection string                     |
| USER_BLACKLIST    |                           | Users to be denied access                     |
| SPARK_QUEUE       |                           | Default queue of all new spark-shell sessions |
| SPARK_LIBRARIES   |                           | Libraries in SPARK_HOST to be used            |
