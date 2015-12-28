'use strict';

/**
 * Pterodactyl Daemon
 * Copyright (c) 2015 Dane Everitt <dane@daneeveritt.com>
 *
 * You should have received a copy of the GNU General Public License
 * along with this program.  If not, see <http://www.gnu.org/licenses/>.
 */
const Fs = require('fs-extra');
const Async = require('async');
const Path = require('path');

class FileSystem {
    constructor(server) {
        this.server = server;
    }

    write(file, data, next) {
        Fs.outputFile(this.server.path(file), data, function (err) {
            return next(err);
        });
    }

    read(file, next) {
        Fs.readFile(this.server.path(file), 'utf8', function (err, data) {
            return next(err, data);
        });
    }

    delete(path, next) {
        Fs.remove(this.server.path(path), function (err) {
            return next(err);
        });
    }

    move(path, newpath, next) {
        Fs.move(this.server.path(path), this.server.path(newpath), function (err) {
            return next(err);
        });
    }

    copy(path, newpath, opts, next) {
        if (typeof opts === 'function') {
            next = opts; // eslint-disable-line
            opts = {}; // eslint-disable-line
        }
        Fs.copy(this.server.path(path), this.server.path(newpath), {
            clobber: opts.clobber || false,
            preserveTimestamps: opts.timestamps || false,
        }, function (err) {
            return next(err);
        });
    }

    directory(path, next) {
        const files = [];
        const self = this;
        Async.series([
            function asyncDirectoryExists(callback) {
                Fs.stat(self.server.path(path), function (err, s) {
                    if (err) return callback(err);
                    if (!s.isDirectory()) {
                        return callback(new Error('The path requested is not a valid directory on the system.'));
                    }
                    return callback();
                });
            },
            function asyncDirectoryRead(callback) {
                Fs.readdir(self.server.path(path), function (err, contents) {
                    Async.each(contents, function asyncDirectoryReadAsyncEach(item, eachCallback) {
                        // Lets limit the callback hell
                        const stat = Fs.statSync(Path.join(self.server.path(path), item));
                        files.push({
                            'name': item,
                            'created': stat.ctime,
                            'modified': stat.mtime,
                            'size': stat.size,
                            'directory': stat.isDirectory(),
                            'file': stat.isFile(),
                            'symlink': stat.isSymbolicLink(),
                        });
                        eachCallback();
                    }, function () {
                        return callback(null, files);
                    });
                });
            },
        ], function (err, data) {
            return next(err, data[1]);
        });
    }
}

module.exports = FileSystem;