'use strict';

const testConfig: ApplicationConfig = {
  pomodoroDuration: 1000 * 60 * 20,
  breakDuration: 1000 * 60 * 5,
  timerFrequency: 1000,

  rollbarConfig: {
    enabled: false
  },

  trackingConfig: {
    enabled: false,
    extraInfo: { }
  }
};

export = testConfig;