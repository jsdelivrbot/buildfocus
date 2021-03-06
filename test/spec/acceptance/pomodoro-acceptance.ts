'use strict';

import NotificationHelper = require("test/helpers/notification-test-helper");

import {
  currentCityData,
  currentCityValue,
  currentCitySize,
  givenBadDomains
} from "test/helpers/saved-state-helper";

import {
  startPomodoro,
  startBreak
} from "test/helpers/messaging-helper";

import {
  resetTabHelper,
  activateTab,
  closeTab
} from "test/helpers/tab-helper";

import {
  POMODORO_COLOUR,
  BREAK_COLOUR,
  BADGE_TEXT_COLOUR,
  BADGE_BACKGROUND_COLOUR,
  getBadgePixel,
  badgeTextColour,
} from "test/helpers/badge-helper";

const POMODORO_DURATION = 1000 * 60 * 25;
const BREAK_DURATION = 1000 * 60 * 5;

var clockStub: Sinon.SinonFakeTimers;
var notificationHelper = new NotificationHelper(() => clockStub);
var chromeStub = <typeof SinonChrome> <any> window.chrome;

describe('Acceptance: Pomodoros', function () {
  this.timeout(5000);

  before(() => clockStub = sinon.useFakeTimers());
  after(() => clockStub.restore());

  var initialCityValue: number;

  beforeEach(() => {
    resetTabHelper();
    notificationHelper.resetNotificationSpies();

    initialCityValue = currentCityValue();
  });

  afterEach(() => {
    // Make sure any active pomodoros are definitely finished
    clockStub.tick(POMODORO_DURATION);
    clockStub.reset();
  });

  it("should open the pomodoro page if the button is clicked", async () => {
    chromeStub.browserAction.onClicked.trigger();

    expect(chromeStub.tabs.create.calledOnce).to.equal(true);
  });

  it("should add a building for a successful pomodoros", async () => {
    await startPomodoro();

    clockStub.tick(POMODORO_DURATION);

    var resultingCityValue = currentCityValue();
    expect(resultingCityValue).to.equal(initialCityValue + 1);
  });

  it("should remove a building for failed pomodoros", async () => {
    givenBadDomains("twitter.com");
    await startPomodoro();
    clockStub.tick(POMODORO_DURATION);
    var initialCitySize = currentCitySize();

    await startPomodoro();
    activateTab("http://twitter.com");

    var resultingCitySize = currentCitySize();
    expect(resultingCitySize).to.equal(initialCitySize - 1);
  });

  it("should do nothing if a pomodoro is started while one's already running", async () => {
    await startPomodoro();
    await startPomodoro();
    clockStub.tick(POMODORO_DURATION - 1);
    await startPomodoro();
    clockStub.tick(1);

    var resultingCityValue = currentCityValue();
    expect(resultingCityValue).to.equal(initialCityValue + 1);
    clockStub.tick(POMODORO_DURATION);
    expect(resultingCityValue).to.equal(initialCityValue + 1);
  });

  describe("Notifications", () => {
    beforeEach(async () => {
      await startPomodoro();
      clockStub.tick(POMODORO_DURATION + 1);
      notificationHelper.resetNotificationSpies();
    });

    it("should appear when a pomodoro is completed successfully", async () => {
      await startPomodoro();
      clockStub.tick(POMODORO_DURATION);

      expect(notificationHelper.spyForResultNotificationCreation().callCount).to.equal(1);
      expect(notificationHelper.spyForActionNotificationCreation().callCount).to.equal(1);
    });

    it("should show the new building, if you complete a pomodoro", async () => {
      await startPomodoro();
      clockStub.tick(POMODORO_DURATION);

      expect(notificationHelper.spyForResultNotificationCreation().args[0][1].iconUrl).to.include("images/city/");
    });

    it("should open the focus page if you click the new building notification", async () => {
      notificationHelper.clickViewCity();
      expect(chromeStub.tabs.create.calledOnce).to.equal(true);
    });

    it("should let you start a new pomodoro", async () => {
      await notificationHelper.clickStartPomodoro();
      expect(badgeTextColour()).to.be.rgbPixel(POMODORO_COLOUR);
    });

    it("should let you take a break after your pomodoro", async () => {
      notificationHelper.clickTakeABreak();
      clockStub.tick(BREAK_DURATION / 2);

      expect(badgeTextColour()).to.be.rgbPixel(BREAK_COLOUR);
      expect(notificationHelper.spyForNotificationCreation().callCount).to.equal(0);
    });

    it("should trigger again after your break is up", async () => {
      notificationHelper.clickTakeABreak();
      clockStub.tick(BREAK_DURATION);

      expect(notificationHelper.spyForNotificationCreation().callCount).to.equal(1);
      expect(notificationHelper.spyForNotificationCreation().args[0][1].title).to.equal("Break time's over");
    });

    it("should cancel your break if you start a new pomodoro", async () => {
      notificationHelper.clickTakeABreak();
      await startPomodoro();
      clockStub.tick(BREAK_DURATION);

      expect(notificationHelper.spyForNotificationCreation().callCount).to.equal(0);
    });

    it("should let you cancel pomodoro-ing after your pomodoro", async () => {
      notificationHelper.clickNotNow();

      expect(badgeTextColour()).to.be.rgbPixel(BADGE_TEXT_COLOUR);
      expect(notificationHelper.spyForNotificationCreation().callCount).to.equal(0);

      clockStub.tick(POMODORO_DURATION);
      expect(badgeTextColour()).to.be.rgbPixel(BADGE_TEXT_COLOUR);
      expect(notificationHelper.spyForNotificationCreation().callCount).to.equal(0);

      expect(chromeStub.tabs.create.callCount).to.equal(0);
    });

    it("should let you punish yourself", async () => {
      var initialCitySize = currentCitySize();

      notificationHelper.clickIGotDistracted();
      notificationHelper.clickConfirmIGotDistracted();

      var resultingCitySize = currentCitySize();
      expect(resultingCitySize).to.equal(initialCitySize - 2);
      expect(chromeStub.tabs.create.calledOnce).to.equal(true);
    });

    it("should not punish you if you can punishing yourself half-way through", async () => {
      var initialCitySize = currentCitySize();

      notificationHelper.clickIGotDistracted();
      notificationHelper.cancelConfirmIGotDistracted();

      var resultingCitySize = currentCitySize();
      expect(resultingCitySize).to.equal(initialCitySize);
      expect(chromeStub.tabs.create.calledOnce).to.equal(false);
    });
  });

  describe("OnMessage", () => {
    beforeEach(() => notificationHelper.resetNotificationSpies());

    it("should start a pomodoro when a start message is received", async () => {
      await startPomodoro();

      expect(badgeTextColour()).to.be.rgbPixel(POMODORO_COLOUR);
    });

    it("should clear all notifications when a start pomodoro message is received", async () => {
      await startPomodoro();

      expect(notificationHelper.spyForNotificationClearing().callCount).to.equal(3);
    });

    it("should start a break when a break message is received", async () => {
      startBreak();

      expect(badgeTextColour()).to.be.rgbPixel(BREAK_COLOUR);
      expect(chromeStub.notifications.create.called).to.equal(false);

      clockStub.tick(BREAK_DURATION);

      expect(notificationHelper.spyForNotificationCreation().callCount).to.equal(1);
      expect(notificationHelper.spyForNotificationCreation().args[0][1].title).to.equal("Break time's over");
    });

    it("should clear all notifications when a start break message is received", async () => {
      startBreak();

      expect(notificationHelper.spyForNotificationClearing().callCount).to.equal(3);
    });
  });

  it("should show a failure page when a pomodoro is failed", async () => {
    givenBadDomains("twitter.com");

    await startPomodoro();
    activateTab("http://twitter.com");
    clockStub.tick(1000);

    expect(chromeStub.tabs.update.calledOnce).to.equal(true, "should update tab url to failure page");
    expect(chromeStub.tabs.update.args[0][1].url).to.contain("main.html?failed=true&failingUrl=http%3A%2F%2Ftwitter.com");

    expect(chromeStub.tabs.create.calledOnce).to.equal(false, "should not open new failure tab");
  });

  it("should show a separate failure page when a pomodoro is failed if the tab's immediately closed", async () => {
    givenBadDomains("twitter.com");

    await startPomodoro();
    activateTab("http://twitter.com");
    closeTab();

    clockStub.tick(1000);
    expect(chromeStub.tabs.update.calledOnce).to.equal(true, "should try and update tab url to failure page");
    expect(chromeStub.tabs.create.calledOnce).to.equal(true, "should open new failure tab when tab update doesn't work");
  });

  describe("Progress bar", () => {
    describe("for pomodoros", () => {
      it("shouldn't be shown initially", async () => {
        expect(getBadgePixel(0, 0)).to.be.rgbPixel(BADGE_BACKGROUND_COLOUR);
      });

      it("should be 0% after starting a pomodoro", async () => {
        await startPomodoro();

        expect(getBadgePixel(0, 0)).to.be.transparent();
      });

      it("should be 50% half way through a pomodoro", async () => {
        await startPomodoro();
        clockStub.tick(POMODORO_DURATION / 2);

        expect(getBadgePixel(0, 0)).to.be.rgbPixel(POMODORO_COLOUR);
        expect(getBadgePixel(18, 18)).to.be.rgbPixel(POMODORO_COLOUR);
        expect(getBadgePixel(0, 18)).to.be.transparent();
      });

      it("should be 99% when a pomodoro is nearly completed", async () => {
        await startPomodoro();
        clockStub.tick(POMODORO_DURATION - 1);

        expect(getBadgePixel(0, 0)).to.be.rgbPixel(POMODORO_COLOUR);
        expect(getBadgePixel(18, 18)).to.be.rgbPixel(POMODORO_COLOUR);
        expect(getBadgePixel(0, 18)).to.be.rgbPixel(POMODORO_COLOUR);
        expect(getBadgePixel(0, 5)).to.be.rgbPixel(POMODORO_COLOUR);
      });

      it("shouldn't be shown after a pomodoro is completed", async () => {
        await startPomodoro();
        clockStub.tick(POMODORO_DURATION);

        expect(getBadgePixel(0, 0)).to.be.rgbPixel(BADGE_BACKGROUND_COLOUR);
      });

      it("shouldn't be shown after a pomodoro is failed", async () => {
        givenBadDomains("twitter.com");

        await startPomodoro();
        clockStub.tick(POMODORO_DURATION / 2);
        activateTab("http://twitter.com");

        expect(getBadgePixel(0, 0)).to.be.rgbPixel(BADGE_BACKGROUND_COLOUR);
      });
    });

    describe("for breaks", () => {
      it("should be 0% after starting a break", async () => {
        startBreak();
        expect(getBadgePixel(0, 0)).to.be.transparent();
      });

      it("should be 50% half way through a break", async () => {
        startBreak();
        clockStub.tick(BREAK_DURATION / 2);

        expect(getBadgePixel(0, 0)).to.be.rgbPixel(BREAK_COLOUR);
        expect(getBadgePixel(18, 18)).to.be.rgbPixel(BREAK_COLOUR);
        expect(getBadgePixel(0, 18)).to.be.transparent();
      });

      it("should be 99% when a break is nearly completed", async () => {
        startBreak();
        clockStub.tick(BREAK_DURATION - 1);

        expect(getBadgePixel(0, 0)).to.be.rgbPixel(BREAK_COLOUR);
        expect(getBadgePixel(18, 18)).to.be.rgbPixel(BREAK_COLOUR);
        expect(getBadgePixel(0, 18)).to.be.rgbPixel(BREAK_COLOUR);
        expect(getBadgePixel(0, 5)).to.be.rgbPixel(BREAK_COLOUR);
      });

      it("shouldn't be shown after a break is completed", async () => {
        startBreak();
        clockStub.tick(BREAK_DURATION);

        expect(getBadgePixel(0, 0)).to.be.rgbPixel(BADGE_BACKGROUND_COLOUR);
      });
    });
  });
});
