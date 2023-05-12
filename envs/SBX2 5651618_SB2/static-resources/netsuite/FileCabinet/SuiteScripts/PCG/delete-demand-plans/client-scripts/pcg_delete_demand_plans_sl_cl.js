/**
 * Client Script for the Delete Demand Plans Suitelet.
 *
 * pageInit
 * 1. Disables the "Are you sure you want to..." dialog to give a good UI experience.
 *
 * saveRecord
 * 1. Prompts the user to confirm they are sure they want to continue deleting the Demand Plan(s) and if so, allows the save. Otherwise, does not allow the save.
 *
 * @NApiVersion 2.x
 * @NScriptType ClientScript
 */
define(['N/ui/dialog',
        'N/ui/message',
        '../lib/pcg_delete_demand_plans_sl_cl_lib',
        '../lib/pcg_delete_demand_plans_constants'],
function(dialog,
         message,
         PCG_DELETE_DEMAND_PLANS_SL_CL_LIB,
         PCG_DELETE_DEMAND_PLANS_CONSTANTS) {

    /**
     * Apply Filters Client Script module passthrough function.
     */
    function applyFilters() {
        PCG_DELETE_DEMAND_PLANS_SL_CL_LIB.applyFilters();
    }

    /**
     * Reset Filters Client Script module passthrough function.
     */
    function resetFilters() {
        PCG_DELETE_DEMAND_PLANS_SL_CL_LIB.resetFilters();
    }

    /**
     * Page Init Entry Point
     *
     * 1. Disables the "Are you sure you want to..." dialog to give a good UI experience.
     *
     * @param {Object} context
     */
    function pageInit(context) {
        window.onbeforeunload = function(){};
    }

    /**
     * Save Record Entry Point
     *
     * 1. Prompts the user to confirm they are sure they want to continue deleting the Demand Plan(s) and if so, allows the save. Otherwise, does not allow the save.
     *
     * @param {Object} context
     *
     * @returns {boolean}
     */
    function saveRecord(context) {

        const HAS_SELECTED_DEMAND_PLAN = PCG_DELETE_DEMAND_PLANS_SL_CL_LIB.hasSelectedDemandPlan();

        if (!HAS_SELECTED_DEMAND_PLAN) {
            dialog.alert({
                title: PCG_DELETE_DEMAND_PLANS_CONSTANTS.MESSAGE.NO_DEMAND_PLAN_SELECTED.TITLE,
                message: PCG_DELETE_DEMAND_PLANS_CONSTANTS.MESSAGE.NO_DEMAND_PLAN_SELECTED.MESSAGE
            });

            return false;
        }

        const SHOULD_DELETE = confirm(PCG_DELETE_DEMAND_PLANS_CONSTANTS.MESSAGE.CONFIRM_DELETE); // Did not use dialog.confirm because it is currently asynchronous

        if (!SHOULD_DELETE) {
            return false;
        }

        message.create({
            title: PCG_DELETE_DEMAND_PLANS_CONSTANTS.MESSAGE.DELETE_STARTED.TITLE,
            message: PCG_DELETE_DEMAND_PLANS_CONSTANTS.MESSAGE.DELETE_STARTED.MESSAGE,
            type: message.Type.INFORMATION
        }).show();

        return true;
    }

    return {
        applyFilters: applyFilters,
        resetFilters: resetFilters,
        pageInit: pageInit,
        saveRecord: saveRecord
    };
});