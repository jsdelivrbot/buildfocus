'use strict';

define(["knockout", "score", "pomodoro/proxy-pomodoro-service", "rollbar"],
  function (ko, score, ProxyPomodoroService) {
    function getQueryParameter(name) {
      var match = new RegExp('[?&]' + name + '=([^&]*)').exec(window.location.search);
      return match && decodeURIComponent(match[1].replace(/\+/g, ' '));
    }

    function closeThisTab() {
      chrome.tabs.query({currentWindow: true}, function (tabs) {
        // Only close this tab if there are other tabs in the window.
        if (tabs.length > 1) {
          chrome.tabs.getCurrent(function (tab) {
            chrome.tabs.remove(tab.id);
          });
        }
      });
    }

    return function RivetPageViewModel() {
      var pomodoroService = new ProxyPomodoroService();

      this.points = score.points;

      this.failed = (getQueryParameter("failed") === "true");

      this.startPomodoro = function () {
        pomodoroService.start();
        closeThisTab();
      };

      this.startBreak = function () {
        pomodoroService.takeABreak();
        closeThisTab();
      };

      this.notNow = function () {
        closeThisTab();
      };

      this.canStartPomodoro = ko.computed(function () {
        return !pomodoroService.isActive();
      });
      this.canStartBreak = ko.computed(function () {
        return !pomodoroService.isActive() && !pomodoroService.isBreakActive();
      });
      this.canSayNotNow = ko.computed(function () {
        return !pomodoroService.isActive() && !pomodoroService.isBreakActive();
      });
    };
  }
);