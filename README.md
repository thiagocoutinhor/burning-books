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
### From github repository

If you are felling adventurous and want a local running application:

    1. Clone the repository from github
    1. Set your enviroment variables on the `production.env` file
    1. Run `npm run build` to create the scafolding for the application (it only needs
    to be run once)
    1. Run `npm start` to start

When the need to update rises, update the application with a git pull and start from step 2.

If you want to debug or develop, you can skip all the steps after cloning the project, install
dependencies with `npm i` in the root directory and client directory and run the application in
development mode with `npm run dev`

## Connecting with identity files

If you need a identity file to login in your spark host (AWS users, for example), set the
enviroment variable `LOGIN_TYPE` to `SSH`. Changing it to `SSH` will make the login screen ask
for your identity file during the login.

## Enviroment Variables

| Variable          | Default                   | Meaning                                       |
|-------------------|---------------------------|-----------------------------------------------|
| LOG_LEVEL         | INFO                      | Level of the log messages                     |
| SPARK_HOST        | localhost                 | SSH host with spark-shell installed           |
| MONGO             | mongodb://localhost:27017 | Mongodb connection string                     |
| USER_BLACKLIST    |                           | Users to be denied access                     |
| SPARK_QUEUE       |                           | Default queue of all new spark-shell sessions |
| SPARK_LIBRARIES   |                           | Libraries in SPARK_HOST to be used            |
| LOGIN_TYPE        | PASSWORD                  | Type of login, between PASSWORD and SSH       |

## Editor

We are using [Ace](https://ace.c9.io/) as the code editor. It is the Cloud 9 editor and comes pre packaged with Scala, so it was an obvious choice.

For a list of the default keyboard shortcuts visit [here](https://github.com/ajaxorg/ace/wiki/Default-Keyboard-Shortcuts).