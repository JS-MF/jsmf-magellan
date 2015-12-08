"use strict";
var should = require('should');
var JSMF = require('jsmf');
var mag = require ('../index.js');

var Class = JSMF.Class;
var Model = JSMF.Model;

var FSM = new Model('FSM');
var State = Class.newInstance('State');
State.setAttribute('name', String);
var StartState = Class.newInstance('StartState');
StartState.setSuperType(State);
var EndState = Class.newInstance('EndState');
EndState.setSuperType(State);

var Transition = Class.newInstance('Transition');
Transition.setAttribute('name', String);
Transition.setReference('next', State, 1);
State.setReference('transition', Transition, -1);

FSM.setModellingElements([StartState, State, EndState, Transition]);

var sample = new Model('sample');
var unreferencedSample = new Model('sample');

var s0 = StartState.newInstance('start');
s0.setName('start');
var s1 = State.newInstance('test1');
s1.setName('test1');
var s2 = State.newInstance('test2');
s2.setName('test2');
var s3 = EndState.newInstance('finish');
s3.setName('finish');

var t0 = Transition.newInstance('launchTest');
t0.setName('launchTest');
t0.setNext(s1);
var t10 = Transition.newInstance('test1Succeeds');
t10.setName('test1Succeeds');
t10.setNext(s2);
var t11 = Transition.newInstance('test1Fails');
t11.setName('test1Fails');
t11.setNext(s0);
var t20 = Transition.newInstance('test2Succeeds');
t20.setName('test2Succeeds');
t20.setNext(s3);
var t21 = Transition.newInstance('test2Fails');
t21.setName('test2Fails');
t21.setNext(s0);

s0.setTransition(t0);
s1.setTransition([t10, t11]);
s2.setTransition([t20, t21]);

sample.setReferenceModel(FSM);
sample.setModellingElements([s0, s1, s2, s3, t0, t10, t11, t20, t21]);
unreferencedSample.setModellingElements([s0, s1, s2, s3, t0, t10, t11, t20, t21]);

describe('allInstancesFromObject', function () {
    it ('get the entrypoint if it is an instance of the desired class', function (done) {
        var res = mag.allInstancesFromObject(EndState, s3);
        res.should.have.lengthOf(1);
        res.should.containEql(s3);
        done();
    });
    it ('accept subclasses', function (done) {
        var res = mag.allInstancesFromObject(State, s3);
        res.should.have.lengthOf(1);
        res.should.containEql(s3);
        done();
    });
    it ('finds nothing for non-corresponding isolated element', function (done) {
        var res = mag.allInstancesFromObject(Transition, s3);
        res.should.eql([]);
        done();
    });
    it ('follows references', function (done) {
        var res = mag.allInstancesFromObject(State, t20);
        res.should.have.lengthOf(1);
        res.should.containEql(s3);
        done();
    });
    it ('crawls the model (State example)', function (done) {
        var res = mag.allInstancesFromObject(State, s2);
        res.should.have.lengthOf(4);
        res.should.containEql(s0);
        res.should.containEql(s1);
        res.should.containEql(s2);
        res.should.containEql(s3);
        done();
    });
    it ('crawls the model (Transition example)', function (done) {
        var res = mag.allInstancesFromObject(Transition, s2);
        res.should.have.lengthOf(5);
        res.should.containEql(t0);
        res.should.containEql(t10);
        res.should.containEql(t11);
        res.should.containEql(t20);
        res.should.containEql(t21);
        done();
    });
    it ('finds nothing for non-instanciated class', function (done) {
        var Dummy = Class.newInstance('Dummy');
        var res = mag.allInstancesFromObject(Dummy, s2);
        res.should.eql([]);
        done();
    });
    it ('only find the current object if depth is 0', function (done) {
        var res = mag.allInstancesFromObject(State, s0, 0);
        res.should.have.lengthOf(1);
        res.should.containEql(s0);
        done();
    });
    it ('only find a subset if depth is limited', function (done) {
        var res = mag.allInstancesFromObject(State, s0, 2);
        res.should.have.lengthOf(2);
        res.should.containEql(s0);
        res.should.containEql(s1);
        done();
    });
    it ('follows only some references', function(done) {
        var A = new Class("A");
        A.setAttribute("name", String);
        A.setReference("toX", A, 1);
        A.setReference("toY", A, 1);
        var a = A.newInstance();
        a.setName("a");
        var x = A.newInstance();
        x.setName("x");
        var y = A.newInstance();
        y.setName("y");
        a.setToX(x);
        a.setToX(y);
        var f = mag.referenceMap({A: 'toX'})
        var res = mag.allInstancesFromObject(A, a, -1, f);
        res.should.have.lengthOf(2);
        res.should.containEql(a);
        res.should.containEql(x);
        done();
    });
});

describe('getObjectsFromObject', function () {
    it ('get the current object if it match the predicate', function (done) {
        var res = mag.getObjectsFromObject(function (x) { return x['name'] == 'finish'; }, s3);
        res.should.have.lengthOf(1);
        res.should.eql([s3]);
        done();
    });
    it ('crawls the model for matches', function (done) {
        var res = mag.getObjectsFromObject(function (x) { return x['name'].indexOf('test') != -1; }, s0);
        res.should.have.lengthOf(6);
        res.should.containEql(s1);
        res.should.containEql(s2);
        res.should.containEql(t10);
        res.should.containEql(t11);
        res.should.containEql(t20);
        res.should.containEql(t21);
        done();
    });
});

describe('allInstancesFromModel', function () {
    describe('with reference model', function () {
        it ('find instances', function (done) {
            var res = mag.allInstancesFromModel(StartState, sample);
            res.should.have.lengthOf(1);
            res.should.containEql(s0);
            done();
        });
        it ('find children instances too', function (done) {
            var res = mag.allInstancesFromModel(State, sample);
            res.should.have.lengthOf(4);
            res.should.containEql(s0);
            res.should.containEql(s1);
            res.should.containEql(s2);
            res.should.containEql(s3);
            done();
        });
    });
    describe('without reference model', function () {
        it ('find instances', function (done) {
            var res = mag.allInstancesFromModel(StartState, unreferencedSample);
            res.should.have.lengthOf(1);
            res.should.containEql(s0);
            done();
        });
        it ('find children instances too', function (done) {
            var res = mag.allInstancesFromModel(State, unreferencedSample);
            res.should.have.lengthOf(4);
            res.should.containEql(s0);
            res.should.containEql(s1);
            res.should.containEql(s2);
            res.should.containEql(s3);
            done();
        });
    });
});
describe('getObjectsFromModel', function () {
    it ('crawls the model for matches', function (done) {
        var res = mag.getObjectsFromModel(function (x) { return x['name'].indexOf('test2') != -1; }, sample);
        res.should.have.lengthOf(3);
        res.should.containEql(s2);
        res.should.containEql(t20);
        res.should.containEql(t21);
        done();
    });
});

module.exports = {
  's0': s0,
  's1': s1,
  's2': s2,
  's3': s3,
  'State': State,
  't0': t0,
  't10': t10,
  't11': t11,
  't20': t20,
  't21': t21,
  'Transition': Transition,
  'FSM': FSM,
  'sample': sample,
  'unreferencedSample': unreferencedSample
}
