"use strict";
var should = require('should');
var _ = require ('lodash');
var JSMF = require('jsmf-core');
var mag = require ('../index');

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
s0.name = 'start';
var s1 = State.newInstance('test1');
s1.name = 'test1';
var s2 = State.newInstance('test2');
s2.name = 'test2';
var s3 = EndState.newInstance('finish');
s3.name = 'finish';

var t0 = Transition.newInstance('launchTest');
t0.name = 'launchTest';
t0.next = s1;
var t10 = Transition.newInstance('test1Succeeds');
t10.name = 'test1Succeeds';
t10.next = s2;
var t11 = Transition.newInstance('test1Fails');
t11.name = 'test1Fails';
t11.next = s0;
var t20 = Transition.newInstance('test2Succeeds');
t20.name = 'test2Succeeds';
t20.next = s3;
var t21 = Transition.newInstance('test2Fails');
t21.name = 'test2Fails';
t21.next = s0;

s0.transition = t0;
s1.transition = [t10, t11];
s2.transition = [t20, t21];

sample.setReferenceModel(FSM);
sample.setModellingElements([s0, s1, s2, s3, t0, t10, t11, t20, t21]);
unreferencedSample.setModellingElements([s0, s1, s2, s3, t0, t10, t11, t20, t21]);

describe('crawl', function () {
    it ('get the entrypoint if it is an instance of the desired class', function (done) {
        // Find all EndStates that can be reached from s3
        var res = mag.crawl({predicate: mag.hasClass(EndState)}, s3);
        res.should.eql([s3]);
        done();
    });
    it ('accept subclasses', function (done) {
        // Find all States (or its subclasses) that can be reached from s3
        var res = mag.crawl({predicate: mag.hasClass(State)}, s3);
        res.should.eql([s3]);
        done();
    });
    it ('finds nothing for non-corresponding isolated element', function (done) {
        // Find all Transition that can be reached from s3
        var res = mag.crawl({predicate: mag.hasClass(Transition)}, s3);
        res.should.be.empty();
        done();
    });
    it ('follows references', function (done) {
        // Find all States that can be reached from t20
        var res = mag.crawl({predicate: mag.hasClass(State)}, t20);
        res.should.have.lengthOf(1);
        res.should.eql([s3]);
        done();
    });
    it ('crawls the model (State example)', function (done) {
        // Find all States that can be reached from s2
        var res = mag.crawl({predicate: mag.hasClass(State)}, s2);
        res.should.have.lengthOf(4);
        res.should.containEql(s0);
        res.should.containEql(s1);
        res.should.containEql(s2);
        res.should.containEql(s3);
        done();
    });
    it ('crawls the model (Transition example)', function (done) {
        // Find all Transitions that can be reached from s2
        var res = mag.crawl({predicate: mag.hasClass(Transition)}, s2);
        res.should.have.lengthOf(5);
        res.should.containEql(t0);
        res.should.containEql(t10);
        res.should.containEql(t11);
        res.should.containEql(t20);
        res.should.containEql(t21);
        done();
    });
    it ('finds nothing for non-instanciated class', function (done) {
        // Find all Dummy that can be reached from s2
        var Dummy = Class.newInstance('Dummy');
        var res = mag.crawl({predicate: mag.hasClass(Dummy)}, s2);
        res.should.eql([]);
        done();
    });
    it ('only find the current object if depth is 0', function (done) {
        // Find all State that can be reached from s0 following 0 references
        var res = mag.crawl({predicate: mag.hasClass(State), depth: 0}, s0);
        res.should.have.lengthOf(1);
        res.should.containEql(s0);
        done();
    });
    it ('only find a subset if depth is limited', function (done) {
        // Find all State that can be reached from s0 following exactly 2 references
        // Reference 0: Transition
        // Reference 1: State
        var res = mag.crawl({predicate: mag.hasClass(State), depth: 2}, s0);
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
        a.name = "a";
        var x = A.newInstance();
        x.name = "x";
        var y = A.newInstance();
        y.name = "y";
        a.toX = x;
        a.toY = y;
        var f = mag.referenceMap({A: 'toX'})
        // Find all As that can be reached from `a` following only toX references
        var res = mag.crawl({predicate: mag.hasClass(A), followIf: f}, a);
        res.should.have.lengthOf(2);
        res.should.containEql(a);
        res.should.containEql(x);
        done();
    });
    it ('works with a custom "followIf" Based on elements name', function(done) {
        // Find all elements that can be reached from `s0` following only nodes that has a name containing 'start' or 'launchTest'
        var res = mag.crawl({followIf: function(x) { return _.contains(['start', 'launchTest'], x.name); }}, s0);
        res.should.have.lengthOf(3);
        res.should.containEql(s0);
        res.should.containEql(t0);
        res.should.containEql(s1);
        done();
    });
    it ('works with an excluded root', function(done) {
        // Find all states that are less than 2 references away from s0, without including s0.
        var res = mag.crawl({predicate: mag.hasClass(State), includeRoot: false, depth: 2}, s0);
        res.should.eql([s1]);
        done();
    });
    it ('works with "continueWhenFound" sets to false', function(done) {
        // Find one State from s0, then stops.
        var res = mag.crawl({predicate: mag.hasClass(State), includeRoot: false, continueWhenFound: false}, s0);
        res.should.eql([s1]);
        done();
    });
    it ('works with a custom "followIf" Based on elements name and reference', function(done) {
        // Crawl the model from s1, following the transition reference only if the transition name is test1 or if the reference name is next and the element name is test1Succeeds
        var res = mag.crawl({followIf: function(x, ref) {
            return (x.name == "test1" && ref == "transition")
               ||  (x.name == "test1Succeeds" && ref == "next");
        }}, s1);
        res.should.have.lengthOf(4);
        res.should.containEql(s1);
        res.should.containEql(t10);
        res.should.containEql(t11);
        res.should.containEql(s2);
        done();
    });
});

describe('crawl', function () {
    it ('gets the current object if it match the predicate', function (done) {
        var res = mag.crawl({predicate: _.matches({name: 'finish'})}, s3);
        res.should.have.lengthOf(1);
        res.should.eql([s3]);
        done();
    });
    it ('crawls the model for matches', function (done) {
        var res = mag.crawl({predicate: function (x) { return _.contains(x['name'], 'test'); }}, s0);
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
            res.should.eql([s0]);
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
            res.should.eql([s0]);
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

describe('filterModelElements', function () {
    it ('crawls the model for matches', function (done) {
        var res = mag.filterModelElements(function (x) { return x['name'].indexOf('test2') != -1; }, sample);
        res.should.have.lengthOf(3);
        res.should.containEql(s2);
        res.should.containEql(t20);
        res.should.containEql(t21);
        done();
    });
});

describe('follow', function () {
    it('get the current object on empty path', function(done) {
        var res = mag.follow({path: []}, s1);
        res.should.eql([s1]);
        done();
    });
    it('get the objects at the end of a single path', function(done) {
        var res = mag.follow({path: ['transition']}, s1);
        res.should.have.lengthOf(2);
        res.should.containEql(t10);
        res.should.containEql(t11);
        done();
    });
    it ('get the objects at the end on complex paths', function(done) {
        var res = mag.follow({path: ['transition', 'next', 'transition']}, s0);
        res.should.have.lengthOf(2);
        res.should.containEql(t10);
        res.should.containEql(t11);
        done();
    });
    it ('get objects along if "targetOnly" is set to false', function(done) {
        var res = mag.follow({path: ['transition', 'next', 'transition'], targetOnly: false}, s0);
        res.should.have.lengthOf(5);
        res.should.containEql(s0);
        res.should.containEql(t0);
        res.should.containEql(s1);
        res.should.containEql(t10);
        res.should.containEql(t11);
        done();
    });
    it ('works with all parameters sets', function(done) {
        var res = mag.follow({path: ['transition', 'next', 'transition'],
                              targetOnly: false,
                              predicate: mag.hasClass(Transition)}, s0);
        res.should.have.lengthOf(3);
        res.should.containEql(t0);
        res.should.containEql(t10);
        res.should.containEql(t11);
        done();
    });
    it ('works with path and predicate', function(done) {
        var res = mag.follow({path: ['transition',  'next', 'transition', _.matches({name: 'test1Succeeds'}), 'next'],
                              predicate: mag.hasClass(State)}, s0);
        res.should.eql([s2]);
        done();
    });
    it ('works with path, predicate and searchMethod that stop on first', function(done) {
        var res = mag.follow({path: ['transition',  'next', 'transition'],
                              searchMethod: mag.DFS_First,
                              predicate: function(x) {return _.contains(x.name, "test1");}} , s0);
        res.should.have.lengthOf(1);
        done();
    });
});
