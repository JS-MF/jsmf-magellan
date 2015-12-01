var _ = require ('lodash');

/**
 * Crawl a model instance from the given entrypoint and returns all
 * the objects from a given instance recursively.
 *
 */
function allInstancesOf(cls, entrypoint) {
    return getAllObjects(function (x) { return _.contains(x.conformsTo().getInheritanceChain(), cls)}, entrypoint);
}

function getAllObjects (predicate, entrypoint) {
    var _getAllObjects = function (entrypoint, ctx) {
        if (entrypoint === undefined || _.contains(ctx.visited, entrypoint)) {
            return ctx;
        }
        ctx.visited.push(entrypoint);
        if (predicate(entrypoint)) {
            ctx.result.push(entrypoint);
        }
        return _.reduce(
            entrypoint.conformsTo().__references,
            function (ctx0, v, ref) {
                return _.reduce(
                    entrypoint[ref],
                    function (ctx1, refE) {return _getAllObjects(refE, ctx1);},
                    ctx0
                );
            },
            ctx
        );
    }
    return _getAllObjects(entrypoint, {'visited': [], 'result': []}).result;

}


module.exports = {
    'allInstancesOf': allInstancesOf,
    'getAllObjects': getAllObjects
}
