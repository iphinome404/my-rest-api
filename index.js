//TODO more helper functions to make get post put and delete more generic

const fs = require('fs');
//Required for filesystem access
const path = require('path');
//Needed for path.normalize

//const projectRoot = __dirname;
//Needed for when I add director traversel proteciton

const API_PATH = "/:folder/:file";
//Request files with a name not an extension so as always to return .json

const express = require('express');
const app = express();
//Use express as the webserver

app.use(express.json());

const listenPort = 3000
//We may devise a way to find an open port to listen on and define it here later

//Utility Functions


function inputValidate(input) {
    //Function to verify if the input we're receiveing matches the expected file format
    //Currently this api only uses json files and JSON.stringify covers all use cases but
    //keeping inside a validate function allows easy adaption for more formats
    //Expected input is a string to validate, outputs false on error.
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
    //Function to recicve success codes and output them in json format
    //Creating a function allows future changes to the output format to be centralized
    //Input res, the http code to use and the data we're sending back.
    res.status(code).json({code, data});
}

function verboseError(res, code, msg) {
    //function to receive error codes and output them in json format
    //input res, the http code to use and the response message
    //It might be more secure to be _less_ verbose in the production rather than a development envrioment.
    res.status(code).json({code, error: msg});
};

function processError(res, code) {
    //Function to parse an error code and output it in human readable format and then send to the verboseError function
    //Input res, and the nodejs error code
    if (!code) {
        //On the chance that the error.code we've been sent is empty, throw an http 500 error.
        //This should be covered by the default ending in the switch statement but handles edge cases
        verboseError(res, 500, 'Unknown error occurred');
        return;
    }
    switch (code) {
        //Process individual error codes and default to 500 internal server error if none match
        //This should be sorted by likelyhood of error, but a list by http code is easier for debugging purposes
        case 'ENAMETOOLONG':
            verboseError(res, 400, 'Name too long');
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
        case 'EJSONPARSE':
            verboseError(res, 400, 'Invalid JSON format');
            break;
        case 'EISDIR':
            verboseError(res, 405, 'Is a directory');
            break;
        case 'EBADF':
            verboseError(res, 406, 'Bad file descriptor');
            break;
        case 'EMFILE':
            verboseError(res, 409, 'Too many open files');
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

app.get(API_PATH, (req, res) => {
    console.log(req.params);
    //Method for handling http GET requests
    //Input API_PATH and the resource requested in the format of folder/file

    const filePath = path.normalize(req.params.folder + "/" + req.params.file + ".json");
    //Normalize the path and add.json as that's the only file type this api handles

    //TODO: possible directory traversal protection

    fs.stat(req.params.folder, (error, stats) => {
        //Check if the folder we're trying to get exists.
        if (error) {
            //On error throw the correct error code to the processError function
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
    //The request parameter should be formated as /folder/file
    //add a debugging line here to echo the request to the console for checking

    const filePath = path.normalize(req.params.folder + "/" + req.params.file + ".json");
    //Normalize the path and add.json as that's the only file type this api handles
    
    //TODO: directory traversal proteciotn

    const fileHolder = inputValidate(req.body)
    if (!fileHolder) {
        processError(res, 'EJSONPARSE');
        return;
    }

    fs.stat(req.params.folder, (error, stats) => {
        //Check if the folder currently exists, if not, create it.
        if (error) {
            if (error.code === 'ENOENT') {
                //If the folder doesn't already exist, create it
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
                        //Since it passed the stringify test we can just send back req.body
                    });
                });
            } else {
                processError(res, error.code);
                return;
            }
        } else {
            //If the folder exists put the write here...
            fs.writeFile(filePath, fileHolder, error => {
                //Since the folder exists, write req.body as a file
                if (error) {
                    //Call processError if we don't have write permission
                    processError(res, error.code);
                    return;
                } else verboseSuccess(res, 201, req.body);
                //Since it passed the stringify test we can just send back req.body
            });
        }
    })
});

app.delete(API_PATH, (req, res) => {
    //Method for handling http DELETE requests
    //Input API_PATH and the resource requested in the format of folder/file without an extension as we only work with.json

    const filePath = path.normalize(req.params.folder + "/" + req.params.file + ".json");
    //Normalize the path and add.json as that's the only file type this api handles

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
                    //If the folder is empty, delete it, it's no longer needed
                    fs.rmdir(folderPath, (error) => {
                        if (error) {
                            //The file was deleted so report partial success
                            verboseSuccess(res, 200, 'File deleted');
                            return;
                        }
                        //Return that both the file and folder were deleted
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

//TODO app.put here
//follow  the practices outlined in rfc 7231 (http 1.1)

app.use((req, res) => {
    //Fallback function to throw a 404 for any request that isn't already handlded
    processError(res, 'ENOENT');
});

let functioning = app.listen(listenPort, () => {
    console.log("Listening on " + listenPort);
    //start our server listening for http requests
});

//Throw an error if listening doesn't work
functioning.on('error', error => console.log(error));
















