const fs = require('fs');
//Required for filesystem access
const path = require('path');

const API_PATH = "/:folder/:file";
//Request files with a name not an extension so as always to return .json

const express = require('express');
const app = express();
//Use express as the webserver

app.use(express.json());

const listenPort = 3000
//We may devise a way to find an open port to listen on and define it here later

let jsonHolder = [];

//placeholder to hold our json in memory

function verboseError(res, code, msg) {
    //function to receive error codes and output them in json format
    //input res, the http code to use and the response message
    res.status(code).json({code, error: msg});
}

function processError(res, code) {
    //Function to parse an error code and output it in human readable form to the verboseError function
    //Input res, and the nodejs error code
    if (!code) {
        //On the chance that the error.code we've been sent is empty, throw an http 500 error.
        //this should be covered by the defualt ending in the switch statement but it handles edge cases
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
}


app.get(API_PATH, (req, res) => {
    console.log(req.params);
    //What to do when the server receives an http GET request
    //Input API_PATH and the resource requested in the format of folder/file

    const filePath = path.normalize(req.params.folder + "/" + req.params.file + ".json");
    //Normalize the path and add.json as that's the only file type this api handles

    fs.stat(req.params.folder, (error, stats) => {
        //Check if the folder we're trying to get exists.
        if (error) {
            //On error throw the correct error code to the processError function
            processError(res, error.code);
            return;
        }

        if (!stats.isDirectory()) {
            //Make sure the folder we're trying to get us a folder, not a file
            res.status(422).json({code: 422, error: 'Unprocessable Content'});
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
                res.status(200).json(json);
                //Reply with the contents of the json we requested
            } catch (parseError) {
                //Send an error if the JSON is invalid
                processError(res, 'EJSONPARSE');
        });

    });
});

app.post(API_PATH, (req, res) => {
    //What to do when the server gets an http POST request
    //The request parameter should be formated as /folder/file
    //add a debugging line here to echo the request to the console for checking
    
    const filePath = path.normalize(req.params.folder + "/" + req.params.file + ".json");

    //Normalize the path and add.json as that's the only file type this api handles
    
    const jsonHolder = req.body;
    
    //Holding container in memory for the body of the request

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
                    fs.writeFile(filePath, JSON.stringify(jsonHolder), error => {
                        //Write the contents of our holder array as a
                        if (error) {
                            processError(res, error.code);
                            return;
                        } else res.status(201).json(jsonHolder);
                    });

                    //we made the folder now its async so we write the file here
                });
            } else if (error.code === 'EACCES') {
                //Folder exists, but we don't have permission to access it, throw an error
                verboseError(res, 403, 'Permission denied');
                return;
            } else {
                //For any other error, throw 'Server Error'
                verboseError(res, 500, 'Server error');
                return;
            }


        }

        // uneeded right now res.status(201).json(jsonHolder);
        //placeholder that uses our jsonHolder array
    })
});

/// do app.delete next

let functioning = app.listen(listenPort, () => {
    console.log("Listening on " + listenPort);
    //start our server listening for http requests
});
functioning.on('error', error => console.log(error));

//Throw an error if listening doesn't work














