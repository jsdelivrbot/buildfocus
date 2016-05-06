import moment = require("moment");

import { activateTab, resetTabHelper } from "test/helpers/tab-helper";
import { givenBadDomains, distributeMetricsData } from "test/helpers/saved-state-helper";
import { MetricsRepository } from "app/scripts/repositories/metrics-repository";

const POMODORO_DURATION = 1000 * 60 * 25;

var clockStub: Sinon.SinonFakeTimers;
var chromeStub = <typeof SinonChrome> <any> window.chrome;

function startPomodoro() {
  chromeStub.runtime.onMessage.trigger({"action": "start-pomodoro"});
}

function completePomodoro() {
  startPomodoro();
  clockStub.tick(POMODORO_DURATION);
  distributeMetricsData();
}

function failPomodoro() {
  givenBadDomains("twitter.com");
  startPomodoro();
  activateTab("http://twitter.com");
  distributeMetricsData();
}

// TODO: Lots of time based tests here that might fail if you run these tests
// at *exactly* midnight. Probably just going to ignore for now.

// This test needs to run before any of the tests which reset the world.
// Or the tests need to stop resetting the world. That doesn't work, because
// we need to cut off subscriptions to things like notification clicks.

// Need to ensure this test is run early. Or need to isolate acceptance tests
// in a totally different browser context. Or reset the SUT.

describe("Acceptance: Metrics", () => {
  var metrics = new MetricsRepository();

  before(() => clockStub = sinon.useFakeTimers());
  after(() => clockStub.restore());

  beforeEach(() => {
    resetTabHelper();
    distributeMetricsData();
  });

  afterEach(() => {
    // Make sure any active pomodoros are definitely finished
    clockStub.tick(POMODORO_DURATION);
    clockStub.reset();
  });

  it("should add successful pomodoros to today's successes", () => {
    var initialSuccesses = metrics.successes.on(moment.today()).length;

    completePomodoro();

    var resultingSuccesses = metrics.successes.on(moment.today()).length;
    expect(resultingSuccesses).to.equal(initialSuccesses + 1);
  });

  it("should not add failed pomodoros to today's successes", () => {
    var initialSuccesses = metrics.successes.on(moment.today()).length;

    failPomodoro();

    var resultingSuccesses = metrics.successes.on(moment.today()).length;
    expect(resultingSuccesses).to.equal(initialSuccesses);
  });

  it("should add failed pomodoros to today's failures", () => {
    var initialFailures = metrics.failures.on(moment.today()).length;

    failPomodoro();

    var resultingFailures = metrics.failures.on(moment.today()).length;
    expect(resultingFailures).to.equal(initialFailures + 1);
  });

  it("should not include today's today in past metrics", () => {
    var initialFailuresBeforeToday = metrics.failures.between(moment.aYearAgo(), moment.yesterday()).length;
    failPomodoro();

    var failuresBeforeToday = metrics.failures.between(moment.aYearAgo(), moment.yesterday()).length;
    expect(failuresBeforeToday).to.equal(initialFailuresBeforeToday);
  });
});