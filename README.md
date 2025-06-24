# My REST API

![Node.js](https://img.shields.io/badge/node-v18.19.1-green)
![License: MIT](https://img.shields.io/badge/license-MIT-blue)

Simple REST API (Educational Project)

This is a work-in-progress REST API built in Node.js with Express, as a learning and demonstration project.

## Features

- Basic CRUD support: GET, POST, PUT, DELETE, OPTIONS, and HEAD
- File-based storage (currently handles only `.json` files)
- JSON validation and structured error handling
- Comment-heavy for learning and documentation purposes
- Includes a test script and Dockerfile

## Goals

- Practice and demonstrate REST API fundamentals
- Serve as a base for future improvements

## Usage

Clone the repo:

~~~bash
git clone https://github.com/iphinome404/my-rest-api.git
~~~

Install dependencies:

~~~bash
npm install
~~~

Start the server (default listens on port 3000):

~~~bash
node index.js
~~~

Run with Docker:

~~~bash
docker build -t my-rest-api .
docker run -p 3000:3000 my-rest-api
~~~

## Usage

### Get a JSON file

~~~bash
curl -H "Accept: application/json" http://localhost:3000/foldername/filename
~~~

### Head request (get headers only)

~~~bash
curl -I http://localhost:3000/foldername/filename
~~~

### Options request (check allowed methods)

~~~bash
curl -X OPTIONS http://localhost:3000/foldername/filename -i
~~~

### Create a new JSON file

~~~bash
curl -X POST -H "Content-Type: application/json" -d '{"key":"value"}' http://localhost:3000/foldername/filename
~~~

### Update a JSON file

~~~bash
curl -X PUT -H "Content-Type: application/json" -d '{"key":"new value"}' http://localhost:3000/foldername/filename
~~~

### Delete a JSON file

~~~bash
curl -X DELETE http://localhost:3000/foldername/filename
~~~

## Notes

- This project is intended for educational and demonstration use only.
- Uses Node.js version 18.19.1.

## License

This project is licensed under the MIT License. See the [LICENSE](LICENSE) file for details.
