/* global describe, it */

(function () {
  'use strict';

  var POMODORO_DURATION = 1000 * 60 * 20;
  var pomodoroService;

  var clockStub;
  var badBehaviourMonitorFake;

  function announceBadBehaviour() {
    var badBehaviourCallback = badBehaviourMonitorFake.onBadBehaviour.firstCall.args[0];
    badBehaviourCallback();
  }

  describe('Pomodoro monitoring service', function () {
    beforeEach(function (done) {
      badBehaviourMonitorFake = {
        onBadBehaviour: sinon.spy(),
        removeBadBehaviourCallback: sinon.spy()
      };

      require(["pomodoro/pomodoro-service"], function (PomodoroService) {
        pomodoroService = new PomodoroService(badBehaviourMonitorFake);
        done();
      });

      clockStub = sinon.useFakeTimers();
    });

    afterEach(function () {
      clockStub.restore();
    });

    it('should not be running a pomodoro initially', function () {
      expect(pomodoroService.isActive()).to.equal(false);
    });

    it("should be running once a pomodoro's started", function () {
      pomodoroService.start(sinon.stub(), sinon.stub());
      expect(pomodoroService.isActive()).to.equal(true);
    });

    it("should call the success callback if pomodoro is completed ok", function () {
      var successCallback = sinon.stub(), errorCallback = sinon.stub();

      pomodoroService.start(successCallback, errorCallback);
      clockStub.tick(POMODORO_DURATION);

      expect(successCallback.calledOnce).to.equal(true);
      expect(errorCallback.called).to.equal(false);
    });

    it("should call the error callback if a bad URL is opened", function () {
      var successCallback = sinon.stub(), errorCallback = sinon.stub();

      pomodoroService.start(successCallback, errorCallback);
      announceBadBehaviour();

      expect(successCallback.called).to.equal(false);
      expect(errorCallback.calledOnce).to.equal(true);
    });

    it("should never call success after an error occurred, even after full duration", function () {
      var successCallback = sinon.stub(), errorCallback = sinon.stub();

      pomodoroService.start(successCallback, errorCallback);
      announceBadBehaviour();
      clockStub.tick(POMODORO_DURATION);

      expect(successCallback.called).to.equal(false);
      expect(errorCallback.calledOnce).to.equal(true);
    });
  });
})();