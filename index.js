// In-progress project
// Simple REST API implementing all basic CRUD operations
// Currently handles only JSON files, with filesystem-based storage
// Written for learning purposes — expect rough edges, work-in-progress features, and lots of comments

const fs = require('fs');
//Required for filesystem access
const path = require('path');
//Needed for path.normalize

//const projectRoot = __dirname;
//Needed for future directory traversel proteciton

const API_PATH = "/:folder/:file";
//Request files with a name not an extension so as always to return .json

const express = require('express');
const app = express();
//Use express as the webserver

app.use(express.json());

const listenPort = 3000
//We may devise a way to find an open port to listen on and define it here later

//TODO write more utility functions

//Utility Functions


function inputValidate(input) {
    //Function to validate that 'input' contains an acceptable file format.
    //inputValidate returns false for unacceptable types.
    //Currently, only JSON is accepted.
    //Keeping this inside a validate function allows easier adaption for more file formats later
    try {
        return JSON.stringify(input);
        //Try to return the input stringified
    } catch {
        return false;
        //otherwise return false
    }
}

//Error and success handling Functions

function verboseSuccess(res, code, data) {
    //Function to handle success responses and output them in JSON format.
    //Using a dedicated function means any future changes to success formatting can be made in one place.
    //Inputs: the response object, code – the HTTP status code, data – the response payload.
    res.status(code).json(data);
}

function verboseError(res, code, msg) {
    //Function to receive error codes and output them in JSON format
    //Creating a deticated function allows future changes to the output format to be centralized
    //input res, the HTTP code to use, and the response message
    //It might be more secure to be _less_ verbose in the production rather than a development envrioment.
    res.status(code).json({code, error: msg});
};

function processError(res, code) {
    //Function to parse an error code and output it in human readable format and then send to the verboseError function
    //Input res, and the nodejs error code
    if (!code) {
        //Check if the error.code is empty or at least falsey, throw an http 500 error.
        //This should be covered by the default ending in the switch statement but handles edge cases.
        verboseError(res, 500, 'Unknown error occurred');
        return;
    }
    switch (code) {
        //Aceepts the error code (expecting a string) and checks against the known list and sends information
        //to the verboseError function. It leave error handling and error reporting as discreet actions.
        //This should be sorted by likelyhood of error, but a list by http code is easier for debugging purposes
        case 'ENAMETOOLONG':
            verboseError(res, 400, 'Name too long');
            break;
        case 'EJSONPARSE':
            //Custom error code for handling JSON files
            verboseError(res, 400, 'Invalid JSON format');
            break;
        case 'ENOENT':
            verboseError(res, 404, 'Not found');
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


//Main API functions

app.get(API_PATH, (req, res) => {
    //Method for handling http GET requests.
    //The request should be formated as /folder/file
    //Per RFC 7231, all HTTP servers must respond to GET and HEAD requests

    const filePath = path.normalize(req.params.folder + "/" + req.params.file + ".json");
    //Normalize the requested file path and append '.json' since this API handles only JSON files.

    //TODO: possible directory traversal protection

    fs.stat(req.params.folder, (error, stats) => {
        //Check if the folder we're trying to get exists.
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

        fs.readFile(filePath, (error, data) => {
            //Read the json with the name requested in filePath, we always append .json so no attacker
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
    //The request should be formated as /folder/file
    //add a debugging line here to echo the request to the console for checking

    const filePath = path.normalize(req.params.folder + "/" + req.params.file + ".json");
    //Normalize the requested file path and append '.json' since this API handles only JSON files.

    //TODO: directory traversal protection

    const fileHolder = inputValidate(req.body)
    //Validate that req.body contains an acceptable file format.
    //inputValidate returns false for unacceptable types.
    //Currently, only JSON is accepted.
    if (!fileHolder) {
        processError(res, 'EJSONPARSE');
        //'EJSONPARSE' is a custom error code for handling JSON files
        return;
    }

    fs.stat(req.params.folder, (error, stats) => {
        //Check if the requested folder currently exists
        if (error) {
            if (error.code === 'ENOENT') {
                //If the folder does not exist, create it
                fs.mkdir(req.params.folder, error => {
                    //Call processError if we don't have write permission
                    if (error) {
                        processError(res, error.code);
                        return;
                    }
                    fs.writeFile(filePath, fileHolder, error => {
                        //We made the folder now its async so we write the file here
                        //Write the contents of the request body (which has been validated)
                        if (error) {
                            //Call processError if we don't have write permission
                            processError(res, error.code);
                            return;
                        } else verboseSuccess(res, 201, req.body);
                        //Report success by sending back req.body
                        //RFC7231 specifies using status code 201 for new file creations
                    });
                });
            } else {
                //Call processError for all other errors
                processError(res, error.code);
                return;
            }
        } else {
            //If the folder exists, do a quick check to see if the file already exists
            fs.stat(filePath, (error, stats) => {
                if (!error) {
                    //Throw a file already exists error,
                    //RFC7231 specifies that HTTP PUT, not POST, should be used to overwrite.
                    processError(res, 'EEXIST');
                    return;
                }
                //If the folder exists but not the file then write using fileHolder
                fs.writeFile(filePath, fileHolder, error => {
                    //Since the folder exists, write req.body as a file
                    if (error) {
                        //Call processError if we don't have write permission
                        processError(res, error.code);
                        return;
                    } else verboseSuccess(res, 201, req.body);
                    //Report success by sending back req.body
                    //RFC7231 specifies using status code 201 for new file creations
                });
            });
        }
    })
});

app.delete(API_PATH, (req, res) => {
    //Method for handling http DELETE requests
    //Input API_PATH and the resource requested in the format of folder/file without an extension as we only work with.json

    const filePath = path.normalize(req.params.folder + "/" + req.params.file + ".json");
    //Normalize the requested file path and append '.json' since this API handles only JSON files.

    const folderPath = path.normalize(req.params.folder);
    //Extra constant to hold just the path to the folder, this avoids the overhead of string manipulation functions

    //Possible directory traversal protection to be written later

    fs.stat(req.params.folder, (error, stats) => {
        //Check if the folder we're trying to look inside exists.
        if (error) {
            //On error throw the correct error code to the processError function
            processError(res, error.code);
            return;
            //Return as we have nothing to delete
        }

        if (!stats.isDirectory()) {
            //Make sure the folder we're trying to peek inside _is_ a folder, not a file
            processError(res, 'ENOTDIR');
            return;
            //If it's not a folder, throw an error
        }

        fs.unlink(filePath, (error) => {
            //Delete the json with the name requested in filePath, we always append .json so no attacker
            //should be able to delete other file extensions
            if (error) {
                //Attempt to delete the file, throw an error code to the processError function if it doesn't work
                processError(res, error.code);
                return;
            }
            //File either didnt' exist or is now deleted but we're still inside the unlink
            fs.readdir(folderPath, (error, files) => {
                //Read the contents of folderPath to see if the folder is now empty
                if (error) {
                    //Throw an error code if for some reason we were able to delete a file but not read the folder contents
                    processError(res, error.code);
                    return;
                }
                if (!files.length) {
                    fs.rmdir(folderPath, (error) => {
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

    const filePath = path.normalize(req.params.folder + "/" + req.params.file + ".json");
    //Normalize the requested file path and append '.json' since this API handles only JSON files.

    //TODO: directory traversal protection

    const fileHolder = inputValidate(req.body)
    //Validate that req.body contains an acceptable file format.
    //inputValidate returns false for unacceptable types.
    //Currently, only JSON is accepted.
    if (!fileHolder) {
        processError(res, 'EJSONPARSE');
        //'EJSONPARSE' is a custom error code for handling JSON files
        return;
    }

    fs.stat(req.params.folder, (error, stats) => {
        //Check if the requested folder currently exists, if not, create it.
        if (error) {
            if (error.code === 'ENOENT') {
                fs.mkdir(req.params.folder, error => {
                    if (error) {
                        //Call processError if write permission is denied
                        processError(res, error.code);
                        return;
                    }
                    fs.writeFile(filePath, fileHolder, error => {
                        //Folder created asynchronously. The write call is nested inside the mkdir callback.
                        //Write the validated contents to the file.
                        if (error) {
                            //Call processError if write permission is denied
                            processError(res, error.code);
                            return;
                        } else
                            verboseSuccess(res, 201, req.body);
                        //Report success by sending back req.body
                        //RFC7231 specifies using status code 201 for new file creations
                    });
                });
            } else {
                processError(res, error.code);
                return;
            }
        } else {
            fs.writeFile(filePath, fileHolder, error => {
                //If the already folder exists, write the validated file.
                if (error) {
                    //Call processError if write permission is denied
                    processError(res, error.code);
                    return;
                } else verboseSuccess(res, 200, req.body);
                //Report success by sending back req.body
            });
        }
    })
});

app.head(API_PATH, (req, res) => {
    //Handles HTTP HEAD requests. Expects request path as /folder/file.
    //Per RFC 7231, all HTTP servers must respond to both GET and HEAD

    const filePath = path.normalize(req.params.folder + "/" + req.params.file + ".json");
    //Normalize the requested file path and append '.json' since this API handles only JSON files.

    //TODO: possible directory traversal protection

    fs.stat(filePath, (error, stats) => {
        //See if the file exists
        if (error) {
            processError(res, error.code);
            //Throw any errors to the processError function. (likely 404)
            return;
        }

        //TODO: Output function that detects file format dynamically.
        //Current API only handles JSON files
        res.status(200).set({
            //.set is used to set HTTP headers
            'Content-Type': 'application/json',
            'Content-Length': stats.size,
        }).end();
        //.end is required to end the connection without sending a body
        //Expceted, per RFC 7231
    });
});

app.use((req, res) => {
    //This function serves as a simple catch-all for malformed requests
    //Throws a simple 404, not found for any request the API isn't designed to process.
    processError(res, 'ENOENT');
});

//Start up functions

const functioning = app.listen(listenPort, () => {
    //Starts the webserver listening on the specified TCP port (listenPort).
    console.log("Listening on " + listenPort);
});

functioning.on('error', error => console.log(error));
//Throws an error to the console if for any reason the server isn't listening.
















