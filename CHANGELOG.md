# v0.1.2-alpha

### Bug Fixes
- Now errors when trying to raname a book show in the screen

### Quality of Life
- Changed connecting color rotation to better attract attention
- Added healthcheck to the docker image

### Internal
- Refactor of the log system (now it handles objects better)

# v0.1.1-alpha

### Bug Fixes
- Solves copying issues in some browsers
- Solves the use of ">" and "<" characters in code not being sent correctly
- Solves the sharing bugs when caption was involved

### Quality of Life
- Reduced tab size from 8 to 4
- Added the progress numbers recieved to the progress bar
- Added spark imported libraries enviroment variable
- Added a webpage icon

### Internal
- Automates docker image making with a script in package.json
- Changed default port from 9085 to 9099, docker-compose now owns the 9085 port
- Changed the log color schema
- Changed the level of some logs
- Changed the docker and enviroment variables (and some code) to better automate docker build
- Basic documentation

# v0.1-alpha

First alpha release