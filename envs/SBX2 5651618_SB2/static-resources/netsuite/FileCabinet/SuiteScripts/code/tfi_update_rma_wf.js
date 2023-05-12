/**
 * @NApiVersion 2.x
 * @NScriptType WorkflowActionScript
 */
 define([], function() {
    function onAction(scriptContext){
        log.debug({
            title: 'Start Script'
        });

        var newRecord = scriptContext.newRecord;
        newRecord.setValue("orderstatus", "B");
        log.debug("order status","status changed to Pending Receipt");
    }
    return {
        onAction: onAction
    }
});