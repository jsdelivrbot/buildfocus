'use strict';

import ko = require("knockout");
import _ = require("lodash");

import tracking = require('tracking/tracking');
import storeOnce = require('chrome-utilities/store-once');

import Score = require("score");
import SettingsRepository = require("repositories/settings-repository");
import TabsMonitor = require("url-monitoring/tabs-monitor");
import PomodoroService = require("pomodoro/pomodoro-service");
import FocusButton = require("focus-button");
import BadBehaviourMonitor = require("url-monitoring/bad-behaviour-monitor");

import IdleMonitor = require("idle-monitoring/idle-monitor");
import GoneMonitor = require("idle-monitoring/gone-monitor");

import NotificationService = require("notification-service");
import indicateFailure = require("failure-notification/failure-indicator");
import renderableConfigLoader = require('city/rendering/config/config-loader');

function showMainPage() {
  chrome.tabs.create({url: chrome.extension.getURL("main.html")});
}

function setupPomodoroWorkflow(notificationService: NotificationService, pomodoroService: PomodoroService) {
  var score = new Score();

  notificationService.onPomodoroStart(pomodoroService.start);
  pomodoroService.onPomodoroStart(notificationService.clearNotifications);

  pomodoroService.onPomodoroSuccess(function () {
    var newBuilding = score.addSuccess();
    notificationService.showSuccessNotification(newBuilding);
  });

  pomodoroService.onPomodoroFailure(function (tabId, url) {
    score.addFailure();
    indicateFailure(tabId, url);
  });
}

function setupBreaks(notificationService: NotificationService, pomodoroService: PomodoroService) {
  notificationService.onBreak(pomodoroService.takeABreak);
  pomodoroService.onBreakStart(notificationService.clearNotifications);
  pomodoroService.onBreakEnd(notificationService.showBreakNotification);
}

function setupIdleHandling(settings: SettingsRepository, pomodoroService: PomodoroService) {
  // You're Idle if you lock your machine, or touch nothing for idleTimeout millis (default 90 seconds)
  var idleMonitor = new IdleMonitor(settings);
  idleMonitor.onIdle(() => pomodoroService.pause());
  idleMonitor.onActive(() => pomodoroService.resume());

  // You're Gone if you stay idle for goneTimeout millis (default 15 minutes)
  var goneMonitor = new GoneMonitor(idleMonitor);
  goneMonitor.onGone(() => pomodoroService.reset());
}

function setupFocusButton(pomodoroService: PomodoroService) {
  var focusButton = new FocusButton(pomodoroService);
  focusButton.onClick(() => {
    tracking.trackEvent("open-page-from-focus-button");
    showMainPage();
  });
}

export = function setupBackgroundPage() {
  var settings = new SettingsRepository();
  var badBehaviourMonitor = new BadBehaviourMonitor(new TabsMonitor().activeTabs, settings);
  var pomodoroService = new PomodoroService(badBehaviourMonitor);
  var notificationService = new NotificationService(renderableConfigLoader);

  setupPomodoroWorkflow(notificationService, pomodoroService);
  setupBreaks(notificationService, pomodoroService);
  setupIdleHandling(settings, pomodoroService);
  setupFocusButton(pomodoroService);

  notificationService.onShowResult(showMainPage);

  storeOnce.isSetLocally("first-install-time", true).then((hasBeenInstalled) => {
    if (!hasBeenInstalled) {
      showMainPage();
      tracking.trackEvent("first-install");
    }
  });
}