/**
 * @NApiVersion 2.x
 * @NScriptType WorkflowActionScript
 */
define([], function () {
    function onAction(scriptContext) {
        log.debug({
            title: 'Start Script'
        });

        var newRecord = scriptContext.newRecord;
        newRecord.setValue("orderstatus", "A");
        log.debug("order status", "status changed to Pending Approval");
    }
    return {
        onAction: onAction
    }
});