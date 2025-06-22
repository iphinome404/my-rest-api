//In-progress project
//Simple REST API implementing all basic CRUD operations
//Currently handles only JSON files, with filesystem-based storage
//Written for learning purposes — expect rough edges, work-in-progress features, and lots of comments

const fs = require('fs');
//Required for filesystem access

const path = require('path');
//Needed for path.normalize

const projectRoot = __dirname;
const dataFolder = 'data';
//Needed for directory traversal protection

const API_PATH = "/:folder/:file";
//Request files with a name (no extension.) Always append '.json'
//Note: May change if/when support for more file types are added

const express = require('express');
const app = express();
//Use express as the webserver

app.use(express.json());
//Parse incoming JSON payloads

const listenPort = 3000
//TODO: consider dynamic port assignment

const ALLOWED_METHODS = 'GET, POST, PUT, DELETE, HEAD, OPTIONS';
//Needed for HTTP OPTIONS requests

//!------ Utility Functions

function sanitizeInput(input) {
    //Function to strip unusual/unwanted characters from 'input' (string)

    return input.replace(/[?*<>|:"]/g, '').trim();
}

function pathValidate(inputPath) {
    //Function to validate that 'inputPath' remains inside our data folder.
    //Returns a resolved path on success or false if it detects traversal.

    const dataDir = path.resolve(__dirname, dataFolder);
    const resolvedPath = path.resolve(dataDir, inputPath);

    if (!resolvedPath.startsWith(dataDir)) {
        return false;
        //Path does not resolve inside of dataDir. Return 'false'
    }
    return resolvedPath;
    //All clear, return the resolved path
}

function inputValidate(input) {
    //Function to validate that 'input' contains an acceptable file format.
    //Currently, ONLY JSON is accepted.
    //Returns JSON string on success or false if invalid.
    //Keeping this inside a validate function allows easier adaption for more file formats later

    try {
        return JSON.stringify(input);
        //Try to return the input stringified
    } catch {
        return false;
        //If input isn't in a valid file format, return 'false'
    }
}

//!------ Error and success handling Functions

function verboseSuccess(res, code, data) {
    //Function to handle success responses and output them in JSON format.
    //Using a dedicated function means any future changes to success formatting can be made in one place.
    //Inputs: res - the response object, code - the HTTP status code, data - the response payload.
    //TODO add optional 204 handler for 'null' data

    res.status(code).json(data);
}

function verboseError(res, code, msg) {
    //Function to receive error codes and output them in JSON format
    //Creating a dedicated function allows future changes to the output format to be centralized
    //Inputs: res - the response object, code - the HTTP status code, msg - the response payload.
    //It might be safer to be less verbose in production environments.

    res.status(code).json({code, error: msg});
};

function processError(res, code) {
    //Function to parse an error code and output it in human readable format and then send to the verboseError function
    //Inputs: res - the response object, code - the nodejs error code

    if (!code) {
        //Check if the error.code is empty or at least falsy, throw an http 500 error.
        //This should be covered by the default ending in the switch statement but handles edge cases.

        verboseError(res, 500, 'Unknown error occurred');
        return;
    }
    switch (code) {
        //Accepts the error code (expecting a string) and checks against the known list and sends information
        //to the verboseError function. It leaves error handling and error reporting as discrete actions.
        //This should be sorted by likelyhood of error, but a list by http code is easier for debugging purposes
        //Note: possible refinement - using an object map

        case 'ENAMETOOLONG':
            verboseError(res, 400, 'Name too long');
            break;
        case 'EJSONPARSE':
            //Custom error code for handling JSON files
            verboseError(res, 400, 'Invalid JSON format');
            break;
        case 'EACCES':
            verboseError(res, 403, 'Permission denied');
            break;
        case 'EPERM':
            verboseError(res, 403, 'Operation not permitted');
            break;
        case 'EROFS':
            verboseError(res, 403, 'Read only file system');
            break;
        case 'EISDIR':
            verboseError(res, 403, 'Is a directory');
            break;
        case 'ENOENT':
            verboseError(res, 404, 'Not found');
            break;
        case 'EMETHOD':
            verboseError(res, 405, 'Method not allowed');
            break;
        case 'EBADF':
            verboseError(res, 406, 'Bad file descriptor');
            break;
        case 'EMFILE':
            verboseError(res, 409, 'Too many open files');
            break;
        case 'EEXIST':
            verboseError(res, 409, 'File already exists');
            break;
        case 'ERR_FS_FILE_TOO_LARGE':
            verboseError(res, 413, 'Too large');
            break;
        case 'ENOTDIR':
            verboseError(res, 422, 'Not a directory');
            break;
        case 'EBUSY':
            verboseError(res, 423, 'Resource Busy');
            break;
        case 'ENOSPC':
            verboseError(res, 507, 'No space left on device');
            break;
        default:
            verboseError(res, 500, 'Unknown error occurred');
            break;
    }
    return;
};

//!------ Main API functions

app.get(API_PATH, (req, res) => {
    //Method for handling http GET requests.
    //The request should be formatted as /folder/file
    //Per RFC 7231 (section 4.1), all HTTP servers must respond to GET and HEAD requests

    const folder = sanitizeInput(req.params.folder);
    const file = (sanitizeInput(req.params.file) + ".json");
    //Sanitize the folder and file names, append .json since this API handles only JSON files

    const validatedPath = pathValidate(folder);
    //Validate that the requested folder resolves inside the APIs data directory
    //pathValidate returns false for unacceptable routes.

    if (!validatedPath) {
        processError(res, 'EACCES');
        return;
    }

    fs.stat(validatedPath, (error, stats) => {
        //Check if the folder we're trying to get exists.
        //Prevents API from treating a file like a directory
        if (error) {
            //On error throw the error code to the processError function
            processError(res, error.code);
            return;
        }

        if (!stats.isDirectory()) {
            //Make sure the folder we're trying to get _is_ a folder, not a file
            processError(res, 'ENOTDIR');
            return;
            //If it's not a folder, throw an error
        }

        fs.readFile(path.join(validatedPath, file), (error, data) => {
            //Read the file with the name requested in 'file', we always append .json so no attacker
            //should be able to read other file extensions
            if (error) {
                //Attempt to read the file, throw an error code to the processError function if it doesn't work
                processError(res, error.code);
                return;
            }
            try {
                const json = JSON.parse(data.toString());
                verboseSuccess(res, 200, json);
                //Reply with the contents of the json we requested
            } catch (parseError) {
                //Send an parse error if the JSON is invalid
                processError(res, 'EJSONPARSE');
            }
        });

    });
});

app.post(API_PATH, (req, res) => {
    //Method for handling http POST requests
    //The request should be formatted as /folder/file
    //Debugging: uncomment the line below to log incoming requests
    //console.log('POST request body:', req.body);

    const folder = sanitizeInput(req.params.folder);
    const file = (sanitizeInput(req.params.file) + ".json");
    //Sanitize the folder and file names, append .json since this API handles only JSON files

    const validatedPath = pathValidate(folder);
    //Validate that the requested folder resolves inside the APIs data directory
    //pathValidate returns false for unacceptable routes.

    if (!validatedPath) {
        processError(res, 'EACCES');
        return;
    }

    const validatedInput = inputValidate(req.body)
    //Validate that req.body contains an acceptable file format.
    //inputValidate returns false for unacceptable types.
    //Currently, only JSON is accepted.

    if (!validatedInput) {
        processError(res, 'EJSONPARSE');
        //'EJSONPARSE' is a custom error code for handling JSON files
        return;
    }

    fs.stat(validatedPath, (error, stats) => {
        //Check if the requested folder currently exists
        if (error) {
            if (error.code === 'ENOENT') {
                //If the folder does not exist, create it

                fs.mkdir(validatedPath, error => {
                    //Call processError if we don't have write permission

                    if (error) {
                        processError(res, error.code);
                        return;
                    }
                    fs.writeFile(path.join(validatedPath, file), validatedInput, error => {
                        //We made the folder now - it's async, so we write the file here
                        //Write the contents of the request body (which has been validated)

                        if (error) {
                            //Call processError if we don't have write permission
                            processError(res, error.code);
                            return;
                        } else {
                            //Report success by sending back req.body
                            //RFC 7231 (section 4.3.3) specifies using status code 201 for new file creations
                            verboseSuccess(res, 201, req.body);
                            return;
                        }
                    });
                });
            } else {
                //Call processError for all other errors

                processError(res, error.code);
                return;
            }
        } else {
            //If the folder exists, do a quick check to see if the file already exists

            fs.stat(path.join(validatedPath, file), (error, stats) => {
                if (!error) {
                    //Throw a file already exists error,
                    //RFC 7231 (section 4.3.4) specifies that HTTP PUT, not POST, should be used to overwrite.

                    processError(res, 'EEXIST');
                    return;
                }
                //If the folder exists but not the file then write using validatedInput

                fs.writeFile(path.join(validatedPath, file), validatedInput, error => {
                    //Since the folder exists, write req.body as a file

                    if (error) {
                        //Call processError if we don't have write permission
                        processError(res, error.code);
                        return;
                    } else {
                        //Report success by sending back req.body
                        //RFC 7231 (section 4.3.3) specifies using status code 201 for new file creations

                        verboseSuccess(res, 201, req.body);
                        return;
                    }
                });
            });
        }
    })
});

app.delete(API_PATH, (req, res) => {
    //Method for handling http DELETE requests
    //Input API_PATH and the resource requested in the format of folder/file without an extension as we only work with.json

    const folder = sanitizeInput(req.params.folder);
    const file = (sanitizeInput(req.params.file) + ".json");
    //Sanitize the folder and file names, append .json since this API handles only JSON files

    const validatedPath = pathValidate(folder);
    //Validate that the requested folder resolves inside the APIs data directory
    //pathValidate returns false for unacceptable routes.

    if (!validatedPath) {
        processError(res, 'EACCES');
        return;
    }

    fs.stat(validatedPath, (error, stats) => {
        //Check if the folder we're trying to look inside exists.

        if (error) {
            //On error throw the correct error code to the processError function

            if (error.code === 'ENOENT') {
                //Note: Per RFC 7231, report success if file not found. HTTP 204 does not send a message body
                //so there's no reason to call verboseSuccess

                res.status(204).end();
            } else {
                processError(res, error.code);
            }
            return;
            //Return as we have nothing to delete
        }

        if (!stats.isDirectory()) {
            //Make sure the folder we're trying to peek inside _is_ a folder, not a file

            processError(res, 'ENOTDIR');
            return;
            //If it's not a folder, throw an error
        }

        fs.unlink(path.join(validatedPath, file), (error) => {
            //Delete the json with the name contained in 'file', we always append .json so no attacker
            //should be able to delete other file extensions

            if (error) {
                if (error.code === 'ENOENT') {
                    //Note: Per RFC 7231, report success if file not found. HTTP 204 does not send a message body
                    //so there's no reason to call verboseSuccess

                    res.status(204).end();
                } else {
                    //Attempt to delete the file, throw an error code to the processError function if it doesn't work

                    processError(res, error.code);
                }
                return;
            }
            //File either didn't exist or is now deleted but we're still inside the unlink

            fs.readdir(validatedPath, (error, files) => {
                //Read the contents of validatedPath to see if the folder is now empty
                if (error) {
                    //Throw an error code if for some reason we were able to delete a file but not read the folder contents

                    processError(res, error.code);
                    return;
                }
                if (!files.length) {
                    fs.rmdir(validatedPath, (error) => {
                        //Delete the folder if it is empty

                        if (error) {
                            //The file was deleted so report partial success

                            verboseSuccess(res, 200, 'File deleted');
                            return;
                        }
                        //Report success. Both the file and folder were deleted

                        verboseSuccess(res, 200, 'File and folder deleted');
                    });
                } else {
                    //No Errors, report success

                    verboseSuccess(res, 200, 'File deleted');
                }
            });
        });

    });
});

app.put(API_PATH, (req, res) => {
    //Handles HTTP PUT requests. Expects request path as /folder/file.
    //Per RFC 7231, creates the file if it doesn't exist.
    //Note: For non-verbose success responses, 204, No Content is preferred.
    //but here we send back req.body for clarity

    const folder = sanitizeInput(req.params.folder);
    const file = (sanitizeInput(req.params.file) + ".json");
    //Sanitize the folder and file names, append .json since this API handles only JSON files

    const validatedPath = pathValidate(folder);
    //Validate that the requested folder resolves inside the API's data directory
    //pathValidate returns false for unacceptable routes.

    if (!validatedPath) {
        processError(res, 'EACCES');
        return;
    }

    const validatedInput = inputValidate(req.body)
    //Validate that req.body contains an acceptable file format.
    //inputValidate returns false for unacceptable types.
    //Currently, only JSON is accepted.

    if (!validatedInput) {
        processError(res, 'EJSONPARSE');
        //'EJSONPARSE' is a custom error code for handling JSON files
        return;
    }

    fs.stat(validatedPath, (error, stats) => {
        //Check if the requested folder currently exists, if not, create it.

        if (error) {
            if (error.code === 'ENOENT') {
                fs.mkdir(validatedPath, error => {
                    if (error) {
                        //Call processError if write permission is denied

                        processError(res, error.code);
                        return;
                    }
                    fs.writeFile(path.join(validatedPath, file), validatedInput, error => {
                        //Folder created asynchronously. The write call is nested inside the mkdir callback.
                        //Write the validated contents to the file.

                        if (error) {
                            //Call processError if write permission is denied

                            processError(res, error.code);
                            return;
                        } else {
                            //Report success by sending back req.body
                            //RFC 7231 specifies using status code 201 for new file creations

                            verboseSuccess(res, 201, req.body);
                        }
                    });
                });
            } else {
                processError(res, error.code);
                return;
            }
        } else {
            fs.writeFile(path.join(validatedPath, file), validatedInput, error => {
                //If the folder already exists, write the validated file.

                if (error) {
                    //Call processError if write permission is denied

                    processError(res, error.code);
                    return;
                } else {
                    //Report success by sending back req.body

                    verboseSuccess(res, 200, req.body);
                }
            });
        }
    })
});

app.head(API_PATH, (req, res) => {
    //Handles HTTP HEAD requests. Expects request path as /folder/file.
    //Per RFC 7231 (section 4.1), all HTTP servers must respond to both GET and HEAD

    //Express automatically handles HEAD requests by calling the matching GET handler
    //We implement this explicitly to comply with RFC 7231.
    //And maintain predictable behavior if Express is swapped for another HTTP server.

    //Current API only supports JSON files.

    const folder = sanitizeInput(req.params.folder);
    const file = (sanitizeInput(req.params.file) + ".json");
    //Sanitize the folder and file names, append .json since this API handles only JSON files

    const validatedPath = pathValidate(folder);
    //Validate that the requested folder resolves inside the APIs data directory
    //pathValidate returns false for unacceptable routes.

    if (!validatedPath) {
        processError(res, 'EACCES');
        return;
    }

    fs.stat(path.join(validatedPath, file), (error, stats) => {
        //See if the file exists
        if (error) {
            processError(res, error.code);
            //Throw any errors to the processError function. (likely 404)
            return;
        }

        //Note: Current API only handles JSON files
        //Note: For dynamic typing, use middleware

        res.status(200).set({
            //.set is used to set HTTP headers
            'Content-Type': 'application/json',
            'Content-Length': stats.size,
            //Note: For compressed content, Content-Length may differ.

        }).end();
        //.end is required to end the connection without sending a body
        //Expected, per RFC 7231 (section 4.3.2)
    });
});

app.options(API_PATH, (req, res) => {
    //Method for handling HTTP OPTIONS requests Expects request path as /folder/file

    res.set('Allow', ALLOWED_METHODS);
    //.set is used to set HTTP headers
    res.sendStatus(204);
    //Code 204 sends success without a response body
});

app.options(/^\/.*$/, (req, res) => {
    //Method for handling HTTP OPTIONS requests when only an asterik "*" is sent
    //Per RFC 7231 (section 4.3.7), the "*" request is only useful as a
    //"ping" or "no-op" type of method.

    //'/^\/.*$/' needed as a catch-all instead of '*' due to regexp@8.x being extremely strict
    //Just use it, don't fall down the rabbit-hole I did working this out.

    res.set('Allow', ALLOWED_METHODS);
    //.set is used to set HTTP headers

    res.sendStatus(204);
    //Code 204 sends success without a response body
});


app.use((req, res) => {
    //Fallback to catch all unmatched requests.
    //Throws a simple 405, not allowed, for any request the API isn't designed to process.
    processError(res, 'EMETHOD');
});

//Start up functions

const functioning = app.listen(listenPort, () => {
    //Starts the webserver listening on the specified TCP port (listenPort).
    console.log("Listening on " + listenPort);
});

functioning.on('error', error => console.log(error));
//Throws an error to the console if for any reason the server isn't listening.
















