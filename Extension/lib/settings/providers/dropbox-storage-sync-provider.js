/**
 * This file is part of Adguard Browser Extension (https://github.com/AdguardTeam/AdguardBrowserExtension).
 *
 * Adguard Browser Extension is free software: you can redistribute it and/or modify
 * it under the terms of the GNU Lesser General Public License as published by
 * the Free Software Foundation, either version 3 of the License, or
 * (at your option) any later version.
 *
 * Adguard Browser Extension is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
 * GNU Lesser General Public License for more details.
 *
 * You should have received a copy of the GNU Lesser General Public License
 * along with Adguard Browser Extension.  If not, see <http://www.gnu.org/licenses/>.
 */

/* global Dropbox, Promise */

/**
 * Dropbox sync settings provider
 * Documentation: http://dropbox.github.io/dropbox-sdk-js/Dropbox.html
 */
(function (api, adguard) { // jshint ignore:line

    'use strict';

    //TODO: Change to real
    var CLIENT_ID = 'bubtujvx7p81yjo';
    var TOKEN_STORAGE_PROP = 'dropbox-auth-token';

    var dropbox;
    var PROVIDER_NAME = 'DROPBOX';
    var accessToken = null;

    /**
     * Dropbox client
     */
    var DropboxClient = (function () {

        function makeRequest(url, token, params) {

            return new Promise(function (resolve, reject) {

                var xhr = new XMLHttpRequest();
                xhr.open('POST', url, true);
                if (token) {
                    xhr.setRequestHeader('Authorization', 'Bearer ' + token);
                }
                xhr.setRequestHeader('Content-Type', 'application/json');

                xhr.onload = function () {
                    var status = xhr.status;
                    if (status === 200) {
                        resolve(JSON.parse(xhr.responseText));
                    } else {
                        reject({status: status, error: new Error(xhr.statusText)});
                    }
                };

                xhr.onerror = function () {
                    reject({status: xhr.status, error: new Error(xhr.statusText)});
                };

                xhr.send(JSON.stringify(params));
            });
        }

        /**
         * https://www.dropbox.com/developers/documentation/http/documentation#files-list_folder
         * @returns {*}
         */
        var listFolder = function () {
            return makeRequest('https://api.dropboxapi.com/2/files/list_folder', accessToken, {
                path: '',
                include_deleted: true
            });
        };

        /**
         * https://www.dropbox.com/developers/documentation/http/documentation#files-list_folder-longpoll
         */
        var listFolderLongPoll = function (cursor) {
            return makeRequest('https://notify.dropboxapi.com/2/files/list_folder/longpoll', null, {
                cursor: cursor
            });
        };

        return {
            listFolder: listFolder,
            listFolderLongPoll: listFolderLongPoll
        };

    })();

    /**
     * Keeps local folder structure
     */
    var dropboxFolderState = {
        cursor: null,
        forceSync: true,
        files: {}
    };

    function readBlobFromResponse(response) {
        return new Promise(function (resolve, reject) {
            var fileReader = new FileReader();
            fileReader.onload = function () {
                try {
                    resolve(this.result);
                } catch (ex) {
                    reject(ex);
                }
            };
            fileReader.onerror = function (event) {
                reject(event.target.error);
            };
            fileReader.readAsText(response.fileBlob);
        });
    }

    function isInvalidToken(error) {
        return error && (error.status === 400 || error.status === 401);
    }

    function clearAccessToken() {
        accessToken = null;
        dropboxFolderState.forceSync = true;
        adguard.localStorage.removeItem(TOKEN_STORAGE_PROP);
    }

    /**
     * https://blogs.dropbox.com/developers/2013/12/efficiently-enumerating-dropbox-with-delta/
     * @returns {Promise.<T>}
     */
    function syncListFiles() {

        if (!dropboxFolderState.forceSync) {
            return Promise.resolve();
        }
        dropboxFolderState.forceSync = false;

        return DropboxClient.listFolder()
            .then(function (result) {
                // Updates cursor
                dropboxFolderState.cursor = result.cursor;
                var updated = false;
                var entries = result.entries;
                for (var i = 0; i < entries.length; i++) {
                    var metadata = entries[i];
                    var tag = metadata['.tag'];
                    if (tag === 'folder') {
                        // Skip directories
                        continue;
                    }
                    var name = metadata.name;
                    var prevMetadata = dropboxFolderState.files[name];
                    if (tag === 'deleted') {
                        delete dropboxFolderState.files[name];
                    } else {
                        dropboxFolderState.files[name] = metadata;
                    }
                    if (prevMetadata && metadata) {
                        if (prevMetadata.rev !== metadata.rev) {
                            updated = true;
                        }
                    } else {
                        updated = true;
                    }
                }
                if (updated) {
                    adguard.listeners.notifyListeners(adguard.listeners.SYNC_REQUIRED);
                }
            });
    }

    function callListFolderLongPollTimeout(timeoutMs) {
        setTimeout(function () {
            callListFolderLongPoll();
        }, timeoutMs);
    }

    function callListFolderLongPoll() {

        syncListFiles()
            .then(function () {
                return DropboxClient.listFolderLongPoll(dropboxFolderState.cursor);
            })
            .then(function (result) {
                if (result.reset || result.changes) {
                    dropboxFolderState.forceSync = true;
                }
                if (result.backoff) {
                    callListFolderLongPollTimeout(result.backoff * 1000);
                } else {
                    callListFolderLongPoll();
                }
            })
            .catch(function (error) {
                if (isInvalidToken(error)) {
                    clearAccessToken();
                }
                adguard.console.error('Error while poll changes from Dropbox {0}', JSON.stringify(error));
                // Retry after 5 minutes
                callListFolderLongPollTimeout(5 * 60 * 1000);
            });
    }

    /**
     * We have to check that file exists before trying to download it, because filesDownload throws error when there is no file to download
     * https://github.com/dropbox/dropbox-sdk-js/issues/84
     *
     * @param name File name
     */
    function isFileExists(name) {
        return syncListFiles()
            .then(function () {
                return name in dropboxFolderState.files;
            });
    }

    /**
     * Downloads file from Dropbox storage
     * http://dropbox.github.io/dropbox-sdk-js/Dropbox.html#filesDownload__anchor
     *
     * @param name File name
     * @param callback
     */
    var load = function (name, callback) {

        if (!isAuthorized()) {
            callback(false);
            return;
        }

        isFileExists(name)
            .then(function (exists) {
                if (exists) {
                    return dropbox
                        .filesDownload({path: '/' + name})
                        .then(readBlobFromResponse)
                        .then(JSON.parse);
                } else {
                    return Promise.resolve(null);
                }
            })
            .then(callback)
            .catch(function (error) {
                if (isInvalidToken(error)) {
                    clearAccessToken();
                }
                adguard.console.error('Error while downloading file {0} from Dropbox, {1}', name, JSON.stringify(error || {}));
                callback(false);
            });
    };

    /**
     * Uploads file to Dropbox storage
     * @param name File name
     * @param data File data
     * @param callback
     */
    var save = function (name, data, callback) {

        if (!isAuthorized()) {
            callback(false);
            return;
        }

        var contents = JSON.stringify(data);
        dropbox.filesUpload({path: '/' + name, mode: "overwrite", contents: contents})
            .then(function (metadata) {
                dropboxFolderState.files[name] = metadata;
                callback(true);
            })
            .catch(function (error) {
                if (isInvalidToken(error)) {
                    clearAccessToken();
                }
                adguard.console.error('Error while uploading file {0} to Dropbox, {1}', name, JSON.stringify(error || {}));
                callback(false);
            });
    };

    var isAuthorized = function () {
        if (!accessToken) {
            adguard.console.warn("Unauthorized! Please set access token first.");
            return false;
        }
        return true;
    };

    /**
     * Revokes Dropbox token
     *
     * http://dropbox.github.io/dropbox-sdk-js/Dropbox.html#authTokenRevoke__anchor
     */
    var logout = function (callback) {
        if (accessToken) {
            dropbox.authTokenRevoke().then(callback, callback);
            clearAccessToken();
        }
    };

    var init = function (token) {
        if (token) {
            accessToken = token;
            adguard.localStorage.setItem(TOKEN_STORAGE_PROP, token);
        } else {
            accessToken = adguard.localStorage.getItem(TOKEN_STORAGE_PROP);
        }
        if (accessToken) {
            dropbox = new Dropbox({accessToken: accessToken});
            callListFolderLongPoll();
        } else {
            dropbox = new Dropbox({clientId: CLIENT_ID});
            adguard.tabs.create({
                active: true,
                type: 'popup',
                url: dropbox.getAuthenticationUrl('https://injections.adguard.com?provider=' + PROVIDER_NAME)
            });
        }
    };

    // EXPOSE
    api.dropboxSyncProvider = {
        get name() {
            return PROVIDER_NAME;
        },
        // Storage api
        load: load,
        save: save,
        init: init,
        // Auth api
        isAuthorized: isAuthorized,
        logout: logout
    };

})(adguard.sync, adguard);