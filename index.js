var _ = require ('lodash');

/**
 * Crawl crawls la whole JSMF model from a given entry point
 *
 * @param {object} searchParameters  - The definition of how the model is crawled, the following object properties are inspected:
 *   - predicate: A predicate (a functino that takes an object as parameter) that must be fullfilled by an object to be part of the result. If undefined, all the objects are accepted
 *   - depth: the number of references to be followed befor we stop crawling, if we don't want to limit crawling, use -1. If undefined, the default value is -1.
 *   - propertyFilter: A function that take an object and a reference as parameters, if the function is evaluate to true, we follow this reference, otherwise, we stop crawling this branch. If undefined, all the references are followed.
 *
 * @param {object} entrypoint  - The entrypoint object to crawl the model.
 *
 * See unit tests for examples.
 */
function crawl(searchParameters, entrypoint) {
    var predicate      = searchParameters['predicate'] || _.constant(true);
    var depth          = searchParameters['depth'];
    if (depth === undefined) { depth = -1; }
    var propertyFilter = searchParameters['followIf'] || _.constant(true);
    return _crawl(predicate, depth, propertyFilter, entrypoint, {'visited': [], 'result': []}).result;
}

function _crawl(predicate, depth, propertyFilter, entrypoint, ctx) {
    if (entrypoint === undefined || _.contains(ctx.visited, entrypoint)) {
        return ctx;
    }
    ctx.visited.push(entrypoint);
    if (predicate(entrypoint)) { ctx.result.push(entrypoint); }
    if (depth === 0) { return ctx; }
    return _.reduce(
        entrypoint.conformsTo().getAllReferences(),
        function (ctx0, v, ref) {
            var newDepth = depth > 0 ? depth - 1 : depth;
            if (propertyFilter(entrypoint, ref)) {
                return _.reduce(
                    entrypoint[ref],
                    function (ctx1, refE) {return _crawl(predicate, newDepth, propertyFilter, refE, ctx1);},
                    ctx0
                );
            } else {
                return ctx0;
            }
        },
        ctx
    );
}

/**
 * Get all the modelingelements from a model that belongs to a class (according to their inheritance chain)
 * @param {Class} cls - The class we are looking for;
 * @param {Model} model - The inspected model.
 */
function allInstancesFromModel (cls, model) {
    var mm = model.referenceModel;
    if (mm !== {}) {
        var os = _.flatten(_.values(model.modellingElements));
        return _.filter(os, function (x) { return _.contains(x.conformsTo().getInheritanceChain(), cls)});
    } else {
        var clss = _.flatten(_.values(mm.modellingElements));
        var subOfCls = _.map(_.filter(os, function (x) { return _.contains(x.getInheritanceChain(), cls)}), '__name');
        return _.flatten(_.filter(subOfCls, function (v, k) {return _.contains(subOfCls, k)}));
    }
}

/**
 * Get all the modelingelements from a model that satisfies a predicate
 * @param {Class} cls - The class we are looking for;
 * @param {Model} model - The inspected model.
 */
function filterModelElements (predicate, model) {
    return _.filter(_.flatten(_.values(model.modellingElements)),
                    function (x) { return predicate(x) }
    );
}

/**
 * Get the elements down a given path from a given entrypoint of a model.
 * @param {object} searchParameters - The parameters of the search. The following properties are inspected:
 *  - path: The path to follow. A path is a list of reference names that must be followed. The last element can be an attribute name. If no value is given, the default value is the empty list.
 *  - predicate: Must be fullfilled by an object to be included in the answer. If the property is undefined, all the objects are included.
 *  - targetOnly: if true, we return only the objects at the end of the path otherwise, we also take objects we pass through during the search. Default value is 'true'.
 */
function follow(searchParameters, entrypoint) {
  var path = searchParameters['path'] || [];
  var predicate = searchParameters['predicate'] || _.constant(true);
  var targetOnly = searchParameters['targetOnly'];
  if (targetOnly === undefined) { targetOnly = true; }
  return _follow(path, predicate, targetOnly, entrypoint, []);
}

function _follow(path, predicate, targetOnly, entrypoint, acc) {
    function getValue(x) {
        if (!(x === undefined)) {
            if (x instanceof Function && x.length == 0) {
                return x();
            } else {
                return x;
            }
        }
    }
    if (!targetOnly || _.isEmpty(path)) {
        if (predicate(entrypoint)) { acc.push(entrypoint); }
    }
    if (_.isEmpty(path)) {
        return acc;
    }
    var pathElement = path[0];
    if (typeof(pathElement) === 'string') {
        var values = getValue(entrypoint[pathElement]);
        var getterName = 'get' + pathElement[0].toUpperCase(); + pathElement.slice(1);
        if (values === undefined) {
            values = getValue(entrypoint[getterName]);
        }
        if (values === undefined) {
            throw "Unsuppported method " + pathElement + " for object " + entrypoint;
        }
        return _.reduce(
            values,
            function (a,y) {
                return _follow(path.slice(1), predicate, targetOnly, y, a);
        },
        acc
        );
    } else if (pathElement instanceof Function) {
        if (pathElement(entrypoint)) {
            return _follow(path.slice(1), predicate, targetOnly, entrypoint, acc);
        } else {
            return acc;
        }
    } else {
        throw "invalid path element " + pathElement;
    }
}

/*********************
 * Predicate helpers *
 *********************/


/**
 * hasClass returns a function that checks if a given object belongs to the given JSMF Class.
 * @param {Class} cls - The expected Class.
 */
function hasClass(cls) {
  return function(x) {
      return _.contains(x.conformsTo().getInheritanceChain(), cls)
  };
}



/**************************
 * PropertyFilter helpers *
 **************************/


/**
 * A helper for the construction of the propertyFilter for @{allInstancesFromObject} and @{getObjectsFromObject}.
 * for a given clas, follows only the references provided in the corresponding map entry.
 */
function referenceMap(x) {
    return function(e, ref) {
        var hierarchy = e.conformsTo().getInheritanceChain();
        return _.any(hierarchy, function(c) { return _.contains(x[c.__name], ref); });
    };
}

module.exports = {
    crawl: crawl,
    follow: follow,
    allInstancesFromModel: allInstancesFromModel,
    filterModelElements: filterModelElements,
    hasClass: hasClass,
    referenceMap: referenceMap
}
