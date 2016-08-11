"use strict";
var __extends = (this && this.__extends) || function (d, b) {
    for (var p in b) if (b.hasOwnProperty(p)) d[p] = b[p];
    function __() { this.constructor = d; }
    d.prototype = b === null ? Object.create(b) : (__.prototype = b.prototype, new __());
};
var BaseAction_1 = require('./BaseAction');
var MeteorBuilder_1 = require('../MeteorBuilder');
var os = require('os');
var uuid = require('uuid');
var propagate = require('propagate');
var format = require('util').format;
var extend = require('util')._extend;
var path = require('path');
var rimraf = require('rimraf');
var _ = require('underscore');
var DeployAction = (function (_super) {
    __extends(DeployAction, _super);
    function DeployAction() {
        _super.apply(this, arguments);
    }
    DeployAction.prototype.run = function (deployment, site, options) {
        var _this = this;
        if (options === void 0) { options = {}; }
        var appConfig = this.config.app;
        var appName = appConfig.name;
        var siteConfig = this.getSiteConfig(site);
        this._showKadiraLink();
        var getDefaultBuildDirName = function (appName, tag) {
            return (appName || "meteor") + "-" + (tag || uuid.v4());
        };
        var buildLocation = options.buildDir
            || process.env.METEOR_BUILD_DIR
            || path.resolve(os.tmpdir(), getDefaultBuildDirName(appName, deployment.tag));
        var bundlePath = options.bundleFile || path.resolve(buildLocation, 'bundle.tar.gz');
        this.debug("Deployment Tag: " + deployment.tag);
        this.debug("Build Location: " + buildLocation);
        this.debug("Bundle Path: " + bundlePath);
        var deployCheckWaitTime = this.config.deploy.checkDelay;
        var builder = new MeteorBuilder_1.MeteorBuilder(this.config);
        propagate(builder, this);
        return builder.buildApp(appConfig.directory, buildLocation, bundlePath, function () {
            _this.whenBeforeBuilding(deployment);
        }).then(function () {
            _this.log("Connecting to the servers...");
            // We only want to fire once for now.
            _this.whenBeforeDeploying(deployment);
            var sessionsMap = _this.createSiteSessionsMap(siteConfig);
            // An array of Promise<SummaryMap>
            var pendingTasks = _.map(sessionsMap, function (sessionGroup) {
                return new Promise(function (resolveTask, rejectTask) {
                    var taskBuilder = _this.getTaskBuilderByOs(sessionGroup.os);
                    var sessions = sessionGroup.sessions;
                    var hasCustomEnv = _.some(sessions, function (session) { return session._serverConfig.env; });
                    var env = _.extend({}, _this.config.env || {}, siteConfig.env || {});
                    console.log("merged environment", env);
                    var taskList = taskBuilder.deploy(_this.config, bundlePath, env, deployCheckWaitTime, appName);
                    propagate(taskList, _this);
                    taskList.run(sessions, function (summaryMap) {
                        resolveTask(summaryMap);
                    });
                });
            });
            return Promise.all(pendingTasks).then(function (results) {
                _this.pluginRunner.whenAfterDeployed(deployment);
                if (options.clean) {
                    _this.log("Cleaning up " + buildLocation);
                    rimraf.sync(buildLocation);
                }
                return Promise.resolve(results);
            }).catch(function (reason) {
                console.error("Failed", reason);
                return Promise.reject(reason);
            });
        });
    };
    DeployAction.prototype.whenBeforeBuilding = function (deployment) {
        return this.pluginRunner.whenBeforeBuilding(deployment);
    };
    DeployAction.prototype.whenBeforeDeploying = function (deployment) {
        return this.pluginRunner.whenBeforeDeploying(deployment);
    };
    /**
     * Return a callback, which is used when after deployed, clean up the files.
     */
    DeployAction.prototype.whenAfterDeployed = function (deployment, summaryMaps) {
        return this.whenAfterCompleted(deployment, summaryMaps);
    };
    return DeployAction;
}(BaseAction_1.BaseAction));
exports.DeployAction = DeployAction;
//# sourceMappingURL=DeployAction.js.map