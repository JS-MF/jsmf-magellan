var _ = require ('lodash');

/**
 * Crawl crawls la whole JSMF model from a given entry point
 *
 * @param {object} searchParameters  - The definition of how the model is crawled, the following object properties are inspected:
 *   - predicate: A predicate (a function that takes an object as parameter) that must be fullfilled by an object to be part of the result. If undefined, all the objects are accepted
 *   - depth: the number of references to be followed befor we stop crawling, if we don't want to limit crawling, use -1. If undefined, the default value is -1.
 *   - followIf: A function that take an object and a reference as parameters, if the function is evaluate to true, we follow this reference, otherwise, we stop crawling this branch. If undefined, all the references are followed.
 *   - searchMethod: The searchMethod used to crawl the model, see {@searchMethod} (default: DFS_All).
 *   - continueWhenFound: Set if we continue to crawl the model from this node when the expected predicate is found (default: true).
 *   - includeRoot: inc, searchMethod.DFS_OnePerBranch]lude the entrypoint in the result (default: True).
 *
 * @param {object} entrypoint  - The entrypoint object to crawl the model.
 *
 * See unit tests for examples.
 */
function crawl(searchParameters, entrypoint) {
    var predicate = searchParameters['predicate'] || _.constant(true);
    var depth = searchParameters['depth'];
    if (depth === undefined) { depth = -1; }
    var propertyFilter = searchParameters['followIf'] || _.constant(true);
    var method = searchParameters['searchMethod'] || DFS_All;
    var includeRoot = searchParameters['includeRoot'];
    if (includeRoot === undefined) { includeRoot = true; }
    var continueWhenFound = searchParameters['continueWhenFound'];
    if (continueWhenFound === undefined) { continueWhenFound = true; }
    var startingNodes = includeRoot ? [crawlEntry(entrypoint, depth)]
                                    : _.map(nodeChildren(propertyFilter, entrypoint),
                                            function(x) {return crawlEntry(x, nextDepth(depth));});
    return _crawl(predicate, propertyFilter, continueWhenFound, method, startingNodes).result;
}

function nextDepth(depth) {
  return depth > 0 ? depth - 1 : depth;
}

function _crawl(predicate, propertyFilter, continueWhenFound, method, entrypoints) {
    ctx = {visited: [], result: []};
    while (!(_.isEmpty(entrypoints))) {
        var current = entrypoints.pop();
        var entrypoint = current.elem;
        var depth = current.depth;
        var children = [];
        var found = false;
        if (entrypoint !== undefined && !(_.includes(ctx.visited, entrypoint))) {
            ctx.visited.push(entrypoint);
            found = predicate(entrypoint);
            if (found) {
                ctx.result.push(entrypoint);
                if (stopOnFirst(method)) {
                    return ctx;
                }
            }
            if (depth !== 0 && (!found || continueWhenFound)) {
                children = nodeChildren(propertyFilter, entrypoint)
            }
            var newDepth = nextDepth(depth)
            children = _.map(children, function(x) {return crawlEntry(x, newDepth);} );
        }
        if (isDFS(method)) {
            entrypoints = entrypoints.concat(children);
        } else {
            entrypoints = children.concat(entrypoints);
        }
    }
    return ctx;
}

function nodeChildren(filter, entrypoint) {
    var refs = entrypoint.conformsTo().getAllReferences();
    return _.flatten(_.map(refs, function(v, ref) {
        if (filter(entrypoint, ref)) {
            return entrypoint[ref];
        } else {
            return [];
        }
    }));
}

function crawlEntry(e, d) {
    return {elem: e, depth: d};
}

/**
 * Get all the modelingelements from a model that belongs to a class (according to their inheritance chain)
 * @param {Class} cls - The class we are looking for;
 * @param {Model} model - The inspected model.
 * @param {Boolean} strict - If strict is false, seek for instances of the clas or of any of its subclass. Otherwise, seek only exact instances of the class (default: false).
 */
function allInstancesFromModel (cls, model, strict) {
    var me = _.get(model, ['referenceModel', 'modellingElements']);
    if (_.isEmpty(me)) {
        var os = _.flatten(_.values(model.modellingElements));
        if (!strict)  {
            return _.filter(os, function (x) {
                return _.includes(x.conformsTo().getInheritanceChain(), cls)
            });
        } else {
                return x.conformsTo().__name === cls.__name;
        }
    } else if (!strict) {
        var clss = _.flatten(_.values(me));
        var subOfCls = _.map(
            _.filter(clss, function(x) {
                return (x.getInheritanceChain !== undefined)
                  && _.includes(x.getInheritanceChain(), cls);
            }),
            '__name');
        return _.flatten(_.map(
              subOfCls,
              function(x) {return model.modellingElements[x] || [];})
        );
    } else {
        return me[cls.__name] ;
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
 *  - searchMethod: The searchMethod used to crawl the model, see {@searchMethod} (default: DFS_All).
 */
function follow(searchParameters, entrypoint) {
    var path = searchParameters['path'] || [];
    path.reverse();
    var predicate = searchParameters['predicate'] || _.constant(true);
    var targetOnly = searchParameters['targetOnly'];
    if (targetOnly === undefined) { targetOnly = true; }
    var method = searchParameters['searchMethod'] || DFS_All;
    entrypoints = [followEntry(entrypoint, path)];
    return _follow(predicate, method, targetOnly, entrypoints);
}

function getValue(x) {
    if (!(x === undefined)) {
        if (x instanceof Function && x.length == 0) {
            return x();
        } else {
            return x;
        }
    }
}

function followEntry(e, p) {
    return {elem: e, path: p.slice()};
}

function _follow(predicate, method, targetOnly, entrypoints) {
    var acc = [];
    while (!(_.isEmpty(entrypoints))) {
        var current = entrypoints.pop();
        var entrypoint = current.elem;
        var path = current.path;
        if ((!targetOnly || _.isEmpty(path)) && predicate(entrypoint)) {
            acc.push(entrypoint);
            if (stopOnFirst(method)) { return acc; }
        }
        if (!(_.isEmpty(path))) {
            var pathElement = path.pop();
            if (typeof(pathElement) === 'string') {
                var values = getValue(entrypoint[pathElement]);
                if (values === undefined) {
                    values = getValue(entrypoint[pathElement[0]]);
                }
                if (values === undefined) {
                    throw "Unsuppported method " + pathElement + " for object " + entrypoint;
                }
                values = _.map(values, function(x) {return followEntry(x, path);});
                if (isDFS(method)) {
                    entrypoints = entrypoints.concat(values);
                } else {
                    entrypoints = values.concat(entrypoints);
                }
            } else if (pathElement instanceof Function) {
                if (pathElement(entrypoint)) {
                    entrypoints.push(followEntry(entrypoint, path));
                }
            } else {
                throw "invalid path element " + pathElement;
            }
        }
    }
    return acc;
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
      return _.includes(x.conformsTo().getInheritanceChain(), cls)
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
        return _.some(hierarchy, function(c) { return _.includes(x[c.__name], ref); });
    };
}

/******************
 * Search Methods *
 ******************/

/**
 * - DFS_All: Deep First Search, get all the elements that match the predicate.
 */
function DFS_All() {}

/**
 * BFS_All: Breadth First Search, get all the elements that match the predicate.
 */
function BFS_All() {}

/**
 * DFS_First: Deep First Search, get the first element that matches the predicate.
 */
function DFS_First() {}

/**
 * BFS_First: Breadth First Search, get the first element that matches the predicate.
 */
function BFS_First() {}

function isDFS(m) {
    return _.includes([DFS_All, DFS_First], m);
}

function stopOnFirst(m) {
    return _.includes([DFS_First, BFS_First], m);
}

module.exports = {
    crawl: crawl,
    follow: follow,
    allInstancesFromModel: allInstancesFromModel,
    filterModelElements: filterModelElements,
    DFS_All: DFS_All,
    DFS_First: DFS_First,
    BFS_All: BFS_All,
    BFS_First: BFS_First,
    hasClass: hasClass,
    referenceMap: referenceMap
}
