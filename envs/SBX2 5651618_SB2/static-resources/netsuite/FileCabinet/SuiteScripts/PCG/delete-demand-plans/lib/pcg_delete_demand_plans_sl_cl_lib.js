/**
 * Library containing the various methods used in the Delete Demand Plans Suitelet's Client Module
 */
define(['N/currentRecord',
        'N/ui/message',
        'N/url',
        './pcg_delete_demand_plans_constants'],
function(currentRecord,
         message,
         url,
         PCG_DELETE_DEMAND_PLANS_CONSTANTS) {

    /**
     * Applies the Delete Demand Plan Filters by refreshing the page with the selected parameter values.
     * Displays a banner-style message to the user that the filters are being applied.
     */
    function applyFilters() {

        message.create({
            title: PCG_DELETE_DEMAND_PLANS_CONSTANTS.MESSAGE.APPLYING_FILTERS.TITLE,
            message: PCG_DELETE_DEMAND_PLANS_CONSTANTS.MESSAGE.APPLYING_FILTERS.MESSAGE,
            type: message.Type.INFORMATION
        }).show();

        const CUSTOM_DELETE_RECORDS_RECORD = currentRecord.get();

        const SUBSIDIARY_ID         = CUSTOM_DELETE_RECORDS_RECORD.getValue({fieldId: PCG_DELETE_DEMAND_PLANS_CONSTANTS.DELETE_DEMAND_PLANS_FORM.HEADER.FIELD.SUBSIDIARY.id});
        const LOCATION_ID           = CUSTOM_DELETE_RECORDS_RECORD.getValue({fieldId: PCG_DELETE_DEMAND_PLANS_CONSTANTS.DELETE_DEMAND_PLANS_FORM.HEADER.FIELD.LOCATION.id});
        const IS_SALEABLE           = CUSTOM_DELETE_RECORDS_RECORD.getValue({fieldId: PCG_DELETE_DEMAND_PLANS_CONSTANTS.DELETE_DEMAND_PLANS_FORM.HEADER.FIELD.IS_SALEABLE.id});
        const ITEM_NAME_STARTS_WITH = CUSTOM_DELETE_RECORDS_RECORD.getValue({fieldId: PCG_DELETE_DEMAND_PLANS_CONSTANTS.DELETE_DEMAND_PLANS_FORM.HEADER.FIELD.ITEM_NAME_STARTS_WITH.id});
        const ITEM_TYPE             = CUSTOM_DELETE_RECORDS_RECORD.getValue({fieldId: PCG_DELETE_DEMAND_PLANS_CONSTANTS.DELETE_DEMAND_PLANS_FORM.HEADER.FIELD.ITEM_TYPE.id});
        const ITEM_USAGE_ID         = CUSTOM_DELETE_RECORDS_RECORD.getValue({fieldId: PCG_DELETE_DEMAND_PLANS_CONSTANTS.DELETE_DEMAND_PLANS_FORM.HEADER.FIELD.ITEM_USAGE.id});

        var parameters = {};

        if (SUBSIDIARY_ID) {
            parameters[PCG_DELETE_DEMAND_PLANS_CONSTANTS.DELETE_DEMAND_PLANS_FORM.PARAMETER.SUBSIDIARY.id] = SUBSIDIARY_ID;
        }

        if (LOCATION_ID) {
            parameters[PCG_DELETE_DEMAND_PLANS_CONSTANTS.DELETE_DEMAND_PLANS_FORM.PARAMETER.LOCATION.id] = LOCATION_ID;
        }

        if (IS_SALEABLE) {
            parameters[PCG_DELETE_DEMAND_PLANS_CONSTANTS.DELETE_DEMAND_PLANS_FORM.PARAMETER.IS_SALEABLE.id] = IS_SALEABLE;
        }

        if (ITEM_NAME_STARTS_WITH) {
            parameters[PCG_DELETE_DEMAND_PLANS_CONSTANTS.DELETE_DEMAND_PLANS_FORM.PARAMETER.ITEM_NAME_STARTS_WITH.id] = ITEM_NAME_STARTS_WITH;
        }

        if (ITEM_TYPE) {
            parameters[PCG_DELETE_DEMAND_PLANS_CONSTANTS.DELETE_DEMAND_PLANS_FORM.PARAMETER.ITEM_TYPE.id] = ITEM_TYPE;
        }

        if (ITEM_USAGE_ID) {
            parameters[PCG_DELETE_DEMAND_PLANS_CONSTANTS.DELETE_DEMAND_PLANS_FORM.PARAMETER.ITEM_USAGE.id] = ITEM_USAGE_ID;
        }


        const DELETE_DEMAND_PLANS_URL = url.resolveScript({
            deploymentId: PCG_DELETE_DEMAND_PLANS_CONSTANTS.DELETE_DEMAND_PLANS_SUITELET.DEPLOYMENT_ID,
            scriptId: PCG_DELETE_DEMAND_PLANS_CONSTANTS.DELETE_DEMAND_PLANS_SUITELET.SCRIPT_ID,
            params: parameters
        });

        window.location = DELETE_DEMAND_PLANS_URL;
    }

    /**
     * Resets the Delete Demand Plan Filters by refreshing the page with no selected parameter values.
     */
    function resetFilters() {

        const DELETE_DEMAND_PLANS_URL = url.resolveScript({
            deploymentId: PCG_DELETE_DEMAND_PLANS_CONSTANTS.DELETE_DEMAND_PLANS_SUITELET.DEPLOYMENT_ID,
            scriptId: PCG_DELETE_DEMAND_PLANS_CONSTANTS.DELETE_DEMAND_PLANS_SUITELET.SCRIPT_ID,
            params: null
        });

        window.location = DELETE_DEMAND_PLANS_URL;
    }

    /**
     * Determines whether or not the user has selected at least one (1) Demand Plan to delete.
     *
     * Note:
     *  Only use from client side as server-side uses different variable names for the sublist fields.
     *
     * @returns {boolean}
     */
    function hasSelectedDemandPlan() {

        const DELETE_DEMAND_PLAN_RECORD = currentRecord.get();

        const ITEM_DEMAND_PLANS_LINE_COUNT = DELETE_DEMAND_PLAN_RECORD.getLineCount({
            sublistId: PCG_DELETE_DEMAND_PLANS_CONSTANTS.DELETE_DEMAND_PLANS_FORM.SUBLIST.DEMAND_PLAN.ID
        });

        for (var i = 0; i < ITEM_DEMAND_PLANS_LINE_COUNT; i++) {

            var isSelected = DELETE_DEMAND_PLAN_RECORD.getSublistValue({
                sublistId: PCG_DELETE_DEMAND_PLANS_CONSTANTS.DELETE_DEMAND_PLANS_FORM.SUBLIST.DEMAND_PLAN.ID,
                fieldId: PCG_DELETE_DEMAND_PLANS_CONSTANTS.DELETE_DEMAND_PLANS_FORM.SUBLIST.DEMAND_PLAN.FIELD.SELECT.id,
                line: i
            });

            if (isSelected) {
                return true;
            }
        }

        return false;
    }

    return {
        applyFilters: applyFilters,
        resetFilters: resetFilters,
        hasSelectedDemandPlan: hasSelectedDemandPlan
    };
});
