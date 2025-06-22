# Simple REST API (Educational Project)

This is a work-in-progress REST API built in Node.js with Express, as a learning and demonstration project.

## Features

- Basic CRUD support: `GET`, `POST`, `PUT`, `DELETE`, `OPTIONS` and `HEAD`
- File-based storage (currently handles only `.json` files)
- JSON validation and structured error handling
- Comment-heavy for learning and documentation purposes

## Goals

- Practice and demonstrate REST API fundamentals
- Serve as a base for future improvements (e.g. middleware, database support, security hardening)

## Usage

1. Clone the repo
2. Run `npm install`
3. Start the server: `node server.js` (or whatever your entry point is)
4. Server listens on port `3000` by default

## Notes

- This project is meant for educational and demonstration use only.
- Security protections (e.g. directory traversal, auth) are not yet implemented.
