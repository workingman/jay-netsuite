/**
 * Delete Demand Plans Suitelet.
 *
 * @NApiVersion 2.x
 * @NScriptType Suitelet
 */
define(['N/runtime',
        '../lib/pcg_delete_demand_plans_lib',
        '../lib/pcg_delete_demand_plans_constants',
        '../../suitelet-form-builder/suitelet_form_builder'],
function(runtime,
         PCG_DELETE_DEMAND_PLANS_LIB,
         PCG_DELETE_DEMAND_PLANS_CONSTANTS,
         SUITELET_FORM_BUILDER) {

    function onRequest(context) {

        const HEADER_VALUES = PCG_DELETE_DEMAND_PLANS_LIB.getHeaderFieldValues({
            formConstants: PCG_DELETE_DEMAND_PLANS_CONSTANTS.DELETE_DEMAND_PLANS_FORM,
            suiteletParameters: context.request.parameters
        });

        const PARAMETERS = PCG_DELETE_DEMAND_PLANS_LIB.getParameters({
            formConstants: PCG_DELETE_DEMAND_PLANS_CONSTANTS.DELETE_DEMAND_PLANS_FORM,
            suiteletParameters: context.request.parameters
        });

        const CURRENT_USER = runtime.getCurrentUser();

        const IS_ADMIN = (CURRENT_USER.role === 3);

        const SUBSIDIARY_ID         = IS_ADMIN ? context.request.method === 'POST' ? HEADER_VALUES[PCG_DELETE_DEMAND_PLANS_CONSTANTS.DELETE_DEMAND_PLANS_FORM.HEADER.FIELD.SUBSIDIARY.id]                           : PARAMETERS[PCG_DELETE_DEMAND_PLANS_CONSTANTS.DELETE_DEMAND_PLANS_FORM.PARAMETER.SUBSIDIARY.id] : CURRENT_USER.subsidiary;
        const LOCATION_ID           = IS_ADMIN ? context.request.method === 'POST' ? HEADER_VALUES[PCG_DELETE_DEMAND_PLANS_CONSTANTS.DELETE_DEMAND_PLANS_FORM.HEADER.FIELD.LOCATION.id]                             : PARAMETERS[PCG_DELETE_DEMAND_PLANS_CONSTANTS.DELETE_DEMAND_PLANS_FORM.PARAMETER.LOCATION.id] : CURRENT_USER.location;
        const IS_SALEABLE           = context.request.method === 'POST' ? (HEADER_VALUES[PCG_DELETE_DEMAND_PLANS_CONSTANTS.DELETE_DEMAND_PLANS_FORM.HEADER.FIELD.IS_SALEABLE.id] === 'T' ? true : false) : (PARAMETERS[PCG_DELETE_DEMAND_PLANS_CONSTANTS.DELETE_DEMAND_PLANS_FORM.PARAMETER.IS_SALEABLE.id] === 'true' ? true : false);
        const ITEM_NAME_STARTS_WITH = context.request.method === 'POST' ? HEADER_VALUES[PCG_DELETE_DEMAND_PLANS_CONSTANTS.DELETE_DEMAND_PLANS_FORM.HEADER.FIELD.ITEM_NAME_STARTS_WITH.id]                : PARAMETERS[PCG_DELETE_DEMAND_PLANS_CONSTANTS.DELETE_DEMAND_PLANS_FORM.PARAMETER.ITEM_NAME_STARTS_WITH.id];
        const ITEM_TYPE             = context.request.method === 'POST' ? HEADER_VALUES[PCG_DELETE_DEMAND_PLANS_CONSTANTS.DELETE_DEMAND_PLANS_FORM.HEADER.FIELD.ITEM_TYPE.id]                            : PARAMETERS[PCG_DELETE_DEMAND_PLANS_CONSTANTS.DELETE_DEMAND_PLANS_FORM.PARAMETER.ITEM_TYPE.id];
        const ITEM_USAGE_ID         = context.request.method === 'POST' ? HEADER_VALUES[PCG_DELETE_DEMAND_PLANS_CONSTANTS.DELETE_DEMAND_PLANS_FORM.HEADER.FIELD.ITEM_USAGE.id]                           : PARAMETERS[PCG_DELETE_DEMAND_PLANS_CONSTANTS.DELETE_DEMAND_PLANS_FORM.PARAMETER.ITEM_USAGE.id];

        if (context.request.method === 'GET') {

            const ITEM_TYPES = PCG_DELETE_DEMAND_PLANS_LIB.getItemTypes();

            const ITEM_DEMAND_PLANS = PCG_DELETE_DEMAND_PLANS_LIB.getItemDemandPlans({
                subsidiaryId: SUBSIDIARY_ID,
                locationId: LOCATION_ID,
                isSaleable: IS_SALEABLE,
                itemNameStartsWith: ITEM_NAME_STARTS_WITH,
                itemType: ITEM_TYPE,
                itemUsageId: ITEM_USAGE_ID
            });

            var deleteRecordsForm = SUITELET_FORM_BUILDER.createSuiteletForm({
                formConstants: PCG_DELETE_DEMAND_PLANS_CONSTANTS.DELETE_DEMAND_PLANS_FORM
            });

            var itemTypeSelectField = deleteRecordsForm.getField({
                id: PCG_DELETE_DEMAND_PLANS_CONSTANTS.DELETE_DEMAND_PLANS_FORM.HEADER.FIELD.ITEM_TYPE.id
            });

            PCG_DELETE_DEMAND_PLANS_LIB.populateItemTypeSelectOptions({
                itemTypes: ITEM_TYPES,
                itemTypeSelectField: itemTypeSelectField
            });

            PCG_DELETE_DEMAND_PLANS_LIB.defaultFormParameters({
                form: deleteRecordsForm,
                subsidiaryId: SUBSIDIARY_ID,
                locationId: LOCATION_ID,
                isSaleable: IS_SALEABLE ? 'T' : 'F',
                itemNameStartsWith: ITEM_NAME_STARTS_WITH,
                itemType: ITEM_TYPE,
                itemUsageId: ITEM_USAGE_ID
            });

            var itemDemandPlansSublist = deleteRecordsForm.getSublist({
                id: PCG_DELETE_DEMAND_PLANS_CONSTANTS.DELETE_DEMAND_PLANS_FORM.SUBLIST.DEMAND_PLAN.ID
            });

            itemDemandPlansSublist.label += (': (' + ITEM_DEMAND_PLANS.length + ')');

            itemDemandPlansSublist.addMarkAllButtons();

            PCG_DELETE_DEMAND_PLANS_LIB.populateItemDemandPlansSublist({
                itemDemandPlansSublist: itemDemandPlansSublist,
                itemDemandPlans: ITEM_DEMAND_PLANS
            });

            context.response.writePage(deleteRecordsForm);
        } else if (context.request.method === 'POST') {

            const SELECTED_ITEM_DEMAND_PLAN_RECORD_IDS_TO_DELETE = PCG_DELETE_DEMAND_PLANS_LIB.getSelectedItemDemandPlanRecordIdsToDelete({
                request: context.request
            });

            const DELETE_ITEM_PLAN_SAVED_SEARCH_ID = PCG_DELETE_DEMAND_PLANS_LIB.createDeleteItemPlansSavedSearch({
                itemDemandPlanRecordIds: SELECTED_ITEM_DEMAND_PLAN_RECORD_IDS_TO_DELETE
            });

            if (!DELETE_ITEM_PLAN_SAVED_SEARCH_ID) {
                return;
            }

            PCG_DELETE_DEMAND_PLANS_LIB.startDeleteDemandPlansMapReduceScript({
                deleteItemPlanSavedSearchId: DELETE_ITEM_PLAN_SAVED_SEARCH_ID
            });

            PCG_DELETE_DEMAND_PLANS_LIB.redirectToHomeDashboard();
        }
    }

    return {
        onRequest: onRequest
    };
});
