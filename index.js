var _ = require ('lodash');

/**
 * Crawl a model instance from the given entrypoint and returns all
 * the objects from a given instance recursively.
 * @cls The Class of the objects to be retrieved.
 * @entrypoint The starting point for the search.
 * @depth The depth of the search
 */
function allInstancesFromObject(cls, entrypoint, depth) {
    return getObjectsFromObject(function (x) {
            return _.contains(x.conformsTo().getInheritanceChain(), cls)
        }, entrypoint, depth);
}

/**
 * Crawl a model instance from the given entrypoint and returns all
 * the objects satisfying a given predicate recursively.
 * @predicate The predicate that must be checked by objects
 * @entrypoint The starting point for the search.
 * @depth The depth of the search
 */
function getObjectsFromObject (predicate, entrypoint, depth) {
    depth = _.isNumber(depth) ? depth : -1;
    var _getAllObjects = function (entrypoint, d, ctx) {
        if (entrypoint === undefined || _.contains(ctx.visited, entrypoint)) {
            return ctx;
        }
        ctx.visited.push(entrypoint);
        if (predicate(entrypoint)) {
            ctx.result.push(entrypoint);
        }
        if (d === 0) {
            return ctx;
        }
        return _.reduce(
            entrypoint.conformsTo().getAllReferences(),
            function (ctx0, v, ref) {
                var newDepth = d > 0 ? d - 1 : depth;
                return _.reduce(
                    entrypoint[ref],
                    function (ctx1, refE) {return _getAllObjects(refE, newDepth, ctx1);},
                    ctx0
                );
            },
            ctx
        );
    }
    return _getAllObjects(entrypoint, depth, {'visited': [], 'result': []}).result;
}

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

function getObjectsFromModel (predicate, model) {
    return _.filter(_.flatten(_.values(model.modellingElements)), function (x) { return predicate(x) });
}

module.exports = {
    'allInstancesFromObject': allInstancesFromObject,
    'getObjectsFromObject': getObjectsFromObject,
    'allInstancesFromModel': allInstancesFromModel,
    'getObjectsFromModel': getObjectsFromModel
}
