/**
 * Receives a query object as parameter and sends it as Ajax request to the POST /query REST endpoint.
 *
 * @param query The query object
 * @returns {Promise} Promise that must be fulfilled if the Ajax request is successful and be rejected otherwise.
 */

CampusExplorer.sendQuery = function (query) {
    return new Promise(function (fulfill, reject) {
        try {
            let httpRequest = new XMLHttpRequest();
            httpRequest.open("POST", "/query");
            httpRequest.setRequestHeader("Content-Type", "application/json");
            httpRequest.onload = function () {
                if (httpRequest.status === 200) {
                    fulfill(JSON.parse(httpRequest.response));
                } else {
                    reject(httpRequest.status);
                }
            };
            try {
                httpRequest.send(JSON.stringify(query));
            } catch (e) {
                reject({error: e});
            }
        } catch (e) {
            reject({error: e});
        }
    });
};
