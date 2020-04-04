v0.1.3-alpha
===============================================================================

### Bug Fixes
- Corrects the progress bar calculation (was adding the numbers in parentesis
before)
- Progress bars are always marked as done when the chunk is done running
- Fixes the "run all above" bug where once activatede always runs to the end
- Fixes the progress bar bug when there where no "=" or ">" character
- Fixes the receit not following the chunk on move up and down

### Quality of Life
- Execution tags on the chunks
- Adds formatted tables to the result card

### Internal
- Protects the user password in the session store

v0.1.2-alpha
===============================================================================

### Bug Fixes
- Now errors when trying to raname a book show in the screen
- Trying to acess a non existent book brings the user back to the book list
- Removes the horizontal scrollbar from the book page
- Chunck don't appear as running when disconnected

### Quality of Life
- Changed connecting color rotation to better attract attention
- Added healthcheck to the docker image
- The chunks can be run by pressing Ctrl+Enter while editing
- Added hability to run everything before one chunk
- Added reordering of chunks
- Keep the connecion alive, no matter what
- Check credentials once per hour when changing pages
- Option to logout

### Internal
- Refactor of the log system (now it handles objects better)
- Added a timout mechanism to the ssh connection
- Corrects log timestamp

v0.1.1-alpha
================================================================================

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
- Changed the docker and enviroment variables (and some code) to better automate
docker build
- Basic documentation

# v0.1-alpha

First alpha release