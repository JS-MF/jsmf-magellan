var should = require('should');
var JSMF = require('jsmf');
var mag = require ('../index.js');

Class = JSMF.Class;

var State = Class.newInstance('State');
State.setAttribute('name', String);

var Transition = Class.newInstance('Transition');
Transition.setAttribute('name', String);
Transition.setReference('next', State, 1);
State.setReference('transition', Transition, -1);

var s0 = State.newInstance('start');
s0.setName('start');
var s1 = State.newInstance('test1');
s1.setName('test1');
var s2 = State.newInstance('test2');
s2.setName('test2');
var s3 = State.newInstance('finish');
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

describe('allInstanceOf', function () {
    it ('get the entrypoint if it is an instance of the desired class', function (done) {
        var res = mag.allInstancesOf(State, s3);
        res.should.have.lengthOf(1);
        res.should.containEql(s3);
        done();
    });
    it ('finds nothing for non-corresponding isolated element', function (done) {
        var res = mag.allInstancesOf(Transition, s3);
        res.should.eql([]);
        done();
    });
    it ('follows references', function (done) {
        var res = mag.allInstancesOf(State, t20);
        res.should.have.lengthOf(1);
        res.should.containEql(s3);
        done();
    });
    it ('crawls the model (State example)', function (done) {
        var res = mag.allInstancesOf(State, s2);
        res.should.have.lengthOf(4);
        res.should.containEql(s0);
        res.should.containEql(s1);
        res.should.containEql(s2);
        res.should.containEql(s3);
        done();
    });
    it ('crawls the model (Transition example)', function (done) {
        var res = mag.allInstancesOf(Transition, s2);
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
        var res = mag.allInstancesOf(Dummy, s2);
        res.should.eql([]);
        done();
    });

});

describe('getAllObjects', function () {
    it ('get the current object if it match the predicate', function (done) {
        var res = mag.getAllObjects(function (x) { return x['name'] == 'finish'; }, s3);
        res.should.have.lengthOf(1);
        res.should.eql([s3]);
        done();
    });
    it ('crawls the model for matches', function (done) {
        var res = mag.getAllObjects(function (x) { return x['name'].indexOf('test') != -1; }, s0);
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

module.exports.s0 = s0
module.exports.s1 = s1
module.exports.s2 = s2
module.exports.s3 = s3
module.exports.State = State
module.exports.t0 = s0
module.exports.t10 = t10
module.exports.t11 = t11
module.exports.t20 = t20
module.exports.t21 = t21
module.exports.Transition = Transition
