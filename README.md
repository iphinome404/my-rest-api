# My REST API

![Node.js](https://img.shields.io/badge/node-v18.19.1-green)
![License: MIT](https://img.shields.io/badge/license-MIT-blue)

Simple REST API (Educational Project)

A clean, minimal REST API built with Node.js and Express demonstrating robust file-based JSON CRUD operations, error handling, and HTTP compliance — designed for learning, extensibility, and real-world applicability.

## Features

- RESTful API built with Express.js
- Basic CRUD support: GET, POST, PUT, DELETE, plus OPTIONS and HEAD
- File-based storage (currently handles only `.json` files)
- RFC 7231 compliant
- JSON validation and structured error handling
- Comment-heavy for maintainability and educational purposes
- Includes basic test script for endpoint validation
- Deployment configuration with dockerfile and deployment.yaml

## Goals

- Serve as a base for future improvements
- Write clean, well-documented code as a learning aid and foundation for scalable APIs
- Demonstrate mastery of REST principles and HTTP methods (GET, POST, PUT, DELETE, OPTIONS, HEAD)
- Implement structured file-based JSON storage with validation
- Provide meaningful error responses aligned with HTTP standards

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

## API Usage Examples

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
- Express
- Uses Docker for containerization (dockerfile included)
- Uses JSON file storage (no database)

## License

This project is licensed under the MIT License. See the [LICENSE](LICENSE) file for details.
