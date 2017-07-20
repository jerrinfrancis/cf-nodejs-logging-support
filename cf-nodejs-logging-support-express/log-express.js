// Log network activity for express applications

var uuid = require("uuid/v4");
var core;

var setCoreLogger = function (coreLogger) {
    core = coreLogger;
};

// Set the minimum logging level. Messages with a lower level, will not be forwarded. (Levels: error, warn, info, verbose, debug, silly)
var setLoggingLevel = function (level) {
    core.setLoggingLevel(level);
};

// Logs requests and responses
var logNetwork = function (req, res, next) {
    var logSent = false;

    var logObject = core.initLog();

    //rendering the given arguments failsave against missing fields
    if (typeof req.header != "function") {
        req.header = function () {
            return "";
        };
    }
    if (req.connection == null) {
        req.connection = {};
    }
    if (req.headers == null) {
        req.headers = {};
    }
    if (res.get == null) {
        res.get = function () {
            return "";
        };
    }

    if (req.header("X-CorrelationID") != null) {
        logObject.correlation_id = req.header("X-CorrelationID");
    } else if (req.header("x-vcap-request-id") != null) {
        logObject.correlation_id = req.header("x-vcap-request-id");
    } else {
        logObject.correlation_id = uuid();
    }

    logObject.request_id = req.header("x-vcap-request-id") == null ? "-" : req.header("x-vcap-request-id");
    logObject.type = "request";
    logObject.request = req.originalUrl == null ? "-" : req.originalUrl;
    logObject.referer = "-";
    logObject.response_status = -1; // Set later
    logObject.method = req.method == null ? "-" : req.method;
    logObject.response_size_b = -1; // Set later
    logObject.request_size_b = req.header("content-length") == null ? -1 : req.header("content-length");
    logObject.remote_host = req.connection.remoteAddress == null ? "-" : req.connection.remoteAddress;
    logObject.remote_port = req.connection.remotePort == null ? "-" : req.connection.remotePort.toString();
    logObject.remote_user = "-";
    logObject.x_forwarded_for = req.headers['x-forwarded-for'] == null ? "" : req.headers['x-forwarded-for'];
    logObject.protocol = "HTTP" + (req.httpVersion == null ? "" : "/" + req.httpVersion);
    logObject.remote_ip = logObject.remote_host;
    logObject.response_content_type = "-1"; //set later
    logObject.request_received_at = logObject.written_at;
    logObject.response_time_ms = -1; // Set later
    logObject.direction = "IN";

    req.logObject = logObject;
    req.logMessage = core.logMessage;
    req.getCorrelationId = core.getCorrelationId;
    req.setCorrelationId = core.setCorrelationId;


    var start = Date.now();

    res.on('finish', function () {
        finishLog();
    });

    res.on('header', function () {
        finishLog();
    });

    var finishLog = function () {
        if (!logSent) {
            var timeObj = new Date();
            logObject.response_sent_at = timeObj.toJSON();
            logObject.response_time_ms = timeObj.getTime() - start;
            logObject.response_size_b = res.get("content-length") == null ? -1 : res.get("content-length");
            logObject.response_content_type = res.get("content-type") == null ? "-" : res.get("content-type");
            logObject.response_status = res.statusCode;
            core.sendLog('info', logObject);
            logSent = true;
        }
    };

    next();
};

// Logs message and custom fields
var logMessage = function () {
    core.logMessage.apply(this, arguments);
};

var setLogPattern = function (pattern) {
    core.setLogPattern(pattern);
};

exports.setCoreLogger = setCoreLogger;
exports.setLoggingLevel = setLoggingLevel;
exports.logNetwork = logNetwork;
exports.logMessage = logMessage;
exports.setLogPattern = setLogPattern;
