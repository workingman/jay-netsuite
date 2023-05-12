/**
 * Library containing the various methods used throughout the Delete Demand Plans process.
 */
define(['N/currentRecord',
        'N/record',
        'N/redirect',
        'N/search',
        'N/task',
        'N/url',
        './pcg_delete_demand_plans_constants'],
function(currentRecord,
         record,
         redirect,
         search,
         task,
         url,
         PCG_DELETE_DEMAND_PLANS_CONSTANTS) {

    /**
     * Creates a custom Item Demand Plan object.
     *
     * @param {Object} dataIn
     * @param {N/search.SearchResult} dataIn.searchResult - Single search result
     *
     * @returns {ItemDemandPlan}
     * @constructor
     */
    function ItemDemandPlan(dataIn) {

        const SEARCH_RESULT = dataIn.searchResult;

        return {
                          id: SEARCH_RESULT.getValue({name: PCG_DELETE_DEMAND_PLANS_CONSTANTS.RECORD.ITEM_DEMAND_PLAN.FIELD.INTERNAL_ID.ID}),
             itemDescription: SEARCH_RESULT.getValue({name: PCG_DELETE_DEMAND_PLANS_CONSTANTS.RECORD.ITEM.FIELD.DESCRIPTION.ID, join: PCG_DELETE_DEMAND_PLANS_CONSTANTS.RECORD.ITEM_DEMAND_PLAN.FIELD.ITEM.ID}),
                      itemId: SEARCH_RESULT.getValue({name: PCG_DELETE_DEMAND_PLANS_CONSTANTS.RECORD.ITEM_DEMAND_PLAN.FIELD.ITEM.ID}),
                    itemText: SEARCH_RESULT.getText({name: PCG_DELETE_DEMAND_PLANS_CONSTANTS.RECORD.ITEM_DEMAND_PLAN.FIELD.ITEM.ID}),
               itemUsageText: SEARCH_RESULT.getText({name: PCG_DELETE_DEMAND_PLANS_CONSTANTS.RECORD.ITEM.FIELD.HFA_USAGE_TYPE.ID, join: PCG_DELETE_DEMAND_PLANS_CONSTANTS.RECORD.ITEM_DEMAND_PLAN.FIELD.ITEM.ID}),
                    itemType: SEARCH_RESULT.getValue({name: PCG_DELETE_DEMAND_PLANS_CONSTANTS.RECORD.ITEM.FIELD.ITEM_TYPE.ID, join: PCG_DELETE_DEMAND_PLANS_CONSTANTS.RECORD.ITEM_DEMAND_PLAN.FIELD.ITEM.ID}),
            lastModifiedDate: SEARCH_RESULT.getValue({name: PCG_DELETE_DEMAND_PLANS_CONSTANTS.RECORD.ITEM_DEMAND_PLAN.FIELD.LAST_MODIFIED_DATE.ID}),
                locationText: SEARCH_RESULT.getText({name: PCG_DELETE_DEMAND_PLANS_CONSTANTS.RECORD.ITEM_DEMAND_PLAN.FIELD.LOCATION.ID}),
                  isSaleable: SEARCH_RESULT.getValue({name: PCG_DELETE_DEMAND_PLANS_CONSTANTS.RECORD.ITEM.FIELD.IS_SALEABLE.ID, join: PCG_DELETE_DEMAND_PLANS_CONSTANTS.RECORD.ITEM_DEMAND_PLAN.FIELD.ITEM.ID}),
              subsidiaryText: SEARCH_RESULT.getText({name: PCG_DELETE_DEMAND_PLANS_CONSTANTS.RECORD.ITEM_DEMAND_PLAN.FIELD.SUBSIDIARY.ID})
        };
    }

    /**
     * Creates a temporary "Delete Item Plans" Saved Searh from the specified Item Demand Plan Record IDs
     * for the Delete Demand Plans MR to pick up and process.
     *
     * @param {Object} dataIn
     * @param {string[]|number[]} dataIn.itemDemandPlanRecordIds - Item Demand Plan Record IDs
     *
     * @returns {string|number}
     */
    function createDeleteItemPlansSavedSearch(dataIn) {

        const ITEM_DEMAND_PLAN_RECORD_IDS = dataIn.itemDemandPlanRecordIds;

        const EPOCH_TIMESTAMP = new Date().getTime();

        var filters = [];

        if (ITEM_DEMAND_PLAN_RECORD_IDS.length) {
            filters.push([PCG_DELETE_DEMAND_PLANS_CONSTANTS.RECORD.DEMAND_PLAN.FIELD.INTERNAL_ID.ID, search.Operator.ANYOF, ITEM_DEMAND_PLAN_RECORD_IDS]);
        }

        return search.create({
            type: record.Type.ITEM_DEMAND_PLAN,
            title: PCG_DELETE_DEMAND_PLANS_CONSTANTS.DELETE_DEMAND_PLANS_SEARCH.TITLE + EPOCH_TIMESTAMP,
            id: PCG_DELETE_DEMAND_PLANS_CONSTANTS.DELETE_DEMAND_PLANS_SEARCH.ID + EPOCH_TIMESTAMP,
            filters: filters,
            columns: [
                {name: PCG_DELETE_DEMAND_PLANS_CONSTANTS.RECORD.DEMAND_PLAN.FIELD.INTERNAL_ID.ID}
            ]
        }).save();
    }

    /**
     * Defaults the passed in Delete Item Plans Suitelet Parameters on the form.
     *
     * @param {Object} dataIn
     * @param {N/ui/serverWidget.Form} dataIn.form - Delete Demand Plans Suitelet Form
     * @param {string|number} dataIn.subsidiaryId - Subsidiary ID
     * @param {string|number} dataIn.locationId - Location ID
     * @param {boolean} dataIn.isSaleable - Whether the Items should be saleable
     * @param {string} dataIn.itemNameStartsWith - "Item Name Starts With" value
     * @param {string} dataIn.itemType - "Item Type" value
     * @param {string|number} dataIn.itemUsageId - Item Usage ID
     */
    function defaultFormParameters(dataIn) {

        var form = dataIn.form;

        const SUBSIDIARY_ID         = dataIn.subsidiaryId;
        const LOCATION_ID           = dataIn.locationId;
        const IS_SALEABLE           = dataIn.isSaleable;
        const ITEM_NAME_STARTS_WITH = dataIn.itemNameStartsWith;
        const ITEM_TYPE             = dataIn.itemType;
        const ITEM_USAGE_ID         = dataIn.itemUsageId;

        form.getField({id: PCG_DELETE_DEMAND_PLANS_CONSTANTS.DELETE_DEMAND_PLANS_FORM.HEADER.FIELD.SUBSIDIARY.id}).defaultValue            = SUBSIDIARY_ID;
        form.getField({id: PCG_DELETE_DEMAND_PLANS_CONSTANTS.DELETE_DEMAND_PLANS_FORM.HEADER.FIELD.LOCATION.id}).defaultValue              = LOCATION_ID;
        form.getField({id: PCG_DELETE_DEMAND_PLANS_CONSTANTS.DELETE_DEMAND_PLANS_FORM.HEADER.FIELD.IS_SALEABLE.id}).defaultValue           = IS_SALEABLE;
        form.getField({id: PCG_DELETE_DEMAND_PLANS_CONSTANTS.DELETE_DEMAND_PLANS_FORM.HEADER.FIELD.ITEM_NAME_STARTS_WITH.id}).defaultValue = ITEM_NAME_STARTS_WITH;
        form.getField({id: PCG_DELETE_DEMAND_PLANS_CONSTANTS.DELETE_DEMAND_PLANS_FORM.HEADER.FIELD.ITEM_TYPE.id}).defaultValue             = ITEM_TYPE;
        form.getField({id: PCG_DELETE_DEMAND_PLANS_CONSTANTS.DELETE_DEMAND_PLANS_FORM.HEADER.FIELD.ITEM_USAGE.id}).defaultValue            = ITEM_USAGE_ID;
    }

    /**
     * Gets all header values from the specified custom Suitelet Form Builder object.
     *
     * @param {Object} dataIn
     * @param {Object} dataIn.formConstants - Custom Suitelet Form Builder constants
     * @param {Object} dataIn.suiteletParameters - Suitelet Parameters
     *
     * @returns {null|Object}
     */
    function getHeaderFieldValues(dataIn) {

        const FORM_CONSTANTS      = dataIn.formConstants;
        const SUITELET_PARAMETERS = dataIn.suiteletParameters;

        var fieldValues = null;

        Object.keys(FORM_CONSTANTS.HEADER.FIELD).forEach(function(headerField) {

            if (!fieldValues) {
                fieldValues = {}
            }

            fieldValues[FORM_CONSTANTS.HEADER.FIELD[headerField].id] = SUITELET_PARAMETERS[FORM_CONSTANTS.HEADER.FIELD[headerField].id];
        });

        return fieldValues;
    }

    /**
     * Gets Item Demand Plans for the specified filters.
     *
     * @param {Object} dataIn
     * @param {string|number} dataIn.subsidiaryId - Subsidiary ID
     * @param {string|number} dataIn.locationId - Location ID
     * @param {boolean} dataIn.isSaleable - Whether the Items should be saleable
     * @param {string} dataIn.itemNameStartsWith - "Item Name Starts With" value
     * @param {string} dataIn.itemType - "Item Type" value
     * @param {string|number} dataIn.itemUsageId - Item Usage ID
     *
     * @returns {ItemDemandPlan[]}
     */
    function getItemDemandPlans(dataIn) {

        const SUBSIDIARY_ID         = dataIn.subsidiaryId;
        const LOCATION_ID           = dataIn.locationId;
        const IS_SALEABLE           = dataIn.isSaleable;
        const ITEM_NAME_STARTS_WITH = dataIn.itemNameStartsWith;
        const ITEM_TYPE             = dataIn.itemType;
        const ITEM_USAGE_ID         = dataIn.itemUsageId;

        var itemDemandPlans = [];

        var filters = [];

        if (SUBSIDIARY_ID) {
            filters.push([PCG_DELETE_DEMAND_PLANS_CONSTANTS.RECORD.ITEM_DEMAND_PLAN.FIELD.SUBSIDIARY.ID, search.Operator.ANYOF, SUBSIDIARY_ID])
        }

        if (LOCATION_ID) {
            if (filters.length) {
                filters.push('AND');
            }
            filters.push([PCG_DELETE_DEMAND_PLANS_CONSTANTS.RECORD.ITEM_DEMAND_PLAN.FIELD.LOCATION.ID, search.Operator.ANYOF, LOCATION_ID])
        }

        if (IS_SALEABLE) {
            if (filters.length) {
                filters.push('AND');
            }
            filters.push([(PCG_DELETE_DEMAND_PLANS_CONSTANTS.RECORD.ITEM_DEMAND_PLAN.FIELD.ITEM.ID + '.' + PCG_DELETE_DEMAND_PLANS_CONSTANTS.RECORD.ITEM.FIELD.IS_SALEABLE.ID), search.Operator.IS, true])
        }

        if (ITEM_NAME_STARTS_WITH) {
            if (filters.length) {
                filters.push('AND');
            }
            filters.push([(PCG_DELETE_DEMAND_PLANS_CONSTANTS.RECORD.ITEM_DEMAND_PLAN.FIELD.ITEM.ID + '.' + PCG_DELETE_DEMAND_PLANS_CONSTANTS.RECORD.ITEM.FIELD.ITEM_ID.ID), search.Operator.STARTSWITH, ITEM_NAME_STARTS_WITH])
        }

        if (ITEM_TYPE > 0) {
            if (filters.length) {
                filters.push('AND');
            }
            filters.push([(PCG_DELETE_DEMAND_PLANS_CONSTANTS.RECORD.ITEM_DEMAND_PLAN.FIELD.ITEM.ID + '.' + PCG_DELETE_DEMAND_PLANS_CONSTANTS.RECORD.ITEM.FIELD.ITEM_TYPE.ID), search.Operator.IS, ITEM_TYPE])
        }

        if (ITEM_USAGE_ID) {
            if (filters.length) {
                filters.push('AND');
            }
            filters.push([(PCG_DELETE_DEMAND_PLANS_CONSTANTS.RECORD.ITEM_DEMAND_PLAN.FIELD.ITEM.ID + '.' + PCG_DELETE_DEMAND_PLANS_CONSTANTS.RECORD.ITEM.FIELD.HFA_USAGE_TYPE.ID), search.Operator.ANYOF, ITEM_USAGE_ID])
        }

        const ITEM_DEMAND_PLAN_SEARCH = search.create({
            type: record.Type.ITEM_DEMAND_PLAN,
            filters: filters,
            columns: [
                {name: PCG_DELETE_DEMAND_PLANS_CONSTANTS.RECORD.ITEM.FIELD.DESCRIPTION.ID, join: PCG_DELETE_DEMAND_PLANS_CONSTANTS.RECORD.ITEM_DEMAND_PLAN.FIELD.ITEM.ID},
                {name: PCG_DELETE_DEMAND_PLANS_CONSTANTS.RECORD.ITEM_DEMAND_PLAN.FIELD.INTERNAL_ID.ID},
                {name: PCG_DELETE_DEMAND_PLANS_CONSTANTS.RECORD.ITEM_DEMAND_PLAN.FIELD.ITEM.ID},
                //{name: PCG_DELETE_DEMAND_PLANS_CONSTANTS.RECORD.ITEM.FIELD.HFA_USAGE_TYPE.ID, join: PCG_DELETE_DEMAND_PLANS_CONSTANTS.RECORD.ITEM_DEMAND_PLAN.FIELD.ITEM.ID},
                {name: PCG_DELETE_DEMAND_PLANS_CONSTANTS.RECORD.ITEM.FIELD.ITEM_TYPE.ID, join: PCG_DELETE_DEMAND_PLANS_CONSTANTS.RECORD.ITEM_DEMAND_PLAN.FIELD.ITEM.ID},
                {name: PCG_DELETE_DEMAND_PLANS_CONSTANTS.RECORD.ITEM_DEMAND_PLAN.FIELD.LAST_MODIFIED_DATE.ID},
                {name: PCG_DELETE_DEMAND_PLANS_CONSTANTS.RECORD.ITEM_DEMAND_PLAN.FIELD.LOCATION.ID},
                //{name: PCG_DELETE_DEMAND_PLANS_CONSTANTS.RECORD.ITEM.FIELD.IS_SALEABLE.ID, join: PCG_DELETE_DEMAND_PLANS_CONSTANTS.RECORD.ITEM_DEMAND_PLAN.FIELD.ITEM.ID},
                {name: PCG_DELETE_DEMAND_PLANS_CONSTANTS.RECORD.ITEM_DEMAND_PLAN.FIELD.SUBSIDIARY.ID}
            ]
        });

        const ITEM_DEMAND_PLAN_SEARCH_RESULTS = ITEM_DEMAND_PLAN_SEARCH.runPaged({
            pageSize: 1000
        });

        ITEM_DEMAND_PLAN_SEARCH_RESULTS.pageRanges.forEach(function(pageRange) {
            ITEM_DEMAND_PLAN_SEARCH_RESULTS.fetch({index: pageRange.index}).data.forEach(function(searchResult) {
                itemDemandPlans.push(new ItemDemandPlan({
                    searchResult: searchResult
                }));
            });
        });

        return itemDemandPlans;
    }

    /**
     * Gets all Item Types for the Delete Demand Plans filter "Item Type"
     *
     * @returns {Object[]}
     */
    function getItemTypes() {

        var itemTypes = [];

        const ITEM_SEARCH = search.create({
            type: search.Type.ITEM,
            filters: [
                [PCG_DELETE_DEMAND_PLANS_CONSTANTS.RECORD.ITEM.FIELD.IS_INACTIVE.ID, search.Operator.IS, false]
            ],
            columns: [
                {name: PCG_DELETE_DEMAND_PLANS_CONSTANTS.RECORD.ITEM.FIELD.ITEM_TYPE.ID}
            ]
        });

        const ITEM_SEARCH_RESULTS = ITEM_SEARCH.runPaged({
            pageSize: 1000
        });

        var processedItemTypes = [];

        ITEM_SEARCH_RESULTS.pageRanges.forEach(function(pageRange) {
            ITEM_SEARCH_RESULTS.fetch({index: pageRange.index}).data.forEach(function(searchResult) {

                const ITEM_TYPE_ID   = searchResult.getValue({name: PCG_DELETE_DEMAND_PLANS_CONSTANTS.RECORD.ITEM.FIELD.ITEM_TYPE.ID});
                const ITEM_TYPE_TEXT = searchResult.getText({name: PCG_DELETE_DEMAND_PLANS_CONSTANTS.RECORD.ITEM.FIELD.ITEM_TYPE.ID});

                if (processedItemTypes.indexOf(ITEM_TYPE_ID) === -1) {
                    itemTypes.push({typeId: ITEM_TYPE_ID, typeText: ITEM_TYPE_TEXT});
                    processedItemTypes.push(ITEM_TYPE_ID);
                }
            });
        });

        return itemTypes;
    }

    /**
     * Gets all parameter values from the specified custom Suitelet Form Builder object.
     *
     * @param {Object} dataIn
     * @param {Object} dataIn.formConstants - Custom Suitelet Form Builder constants
     * @param {Object} dataIn.suiteletParameters - Suitelet Parameters
     *
     * @returns {null}
     */
    function getParameters(dataIn) {

        const FORM_CONSTANTS      = dataIn.formConstants;
        const SUITELET_PARAMETERS = dataIn.suiteletParameters;

        var parameters = null;

        Object.keys(FORM_CONSTANTS.PARAMETER).forEach(function(parameter) {

            if (!parameters) {
                parameters = {}
            }

            parameters[FORM_CONSTANTS.PARAMETER[parameter].id] = SUITELET_PARAMETERS[FORM_CONSTANTS.PARAMETER[parameter].id];
        });

        return parameters;
    }

    /**
     * Gets all selected Demand Plan Record IDs from the Delete Demand Plans Suitelet.
     *
     * Note:
     *  Only use from server side as client-side uses different variable names for the sublist fields.
     *
     * @param {Object} dataIn
     * @param {Object} dataIn.request - Suitelet Request object
     *
     * @returns {string[]}
     */
    function getSelectedItemDemandPlanRecordIdsToDelete(dataIn) {

        const REQUEST = dataIn.request;

        const ITEM_DEMAND_PLANS_LINE_COUNT = REQUEST.getLineCount({
            group: PCG_DELETE_DEMAND_PLANS_CONSTANTS.DELETE_DEMAND_PLANS_FORM.SUBLIST.DEMAND_PLAN.ID
        });

        var itemDemandPlanRecordIdsToDelete = [];

        for (var i = 0; i < ITEM_DEMAND_PLANS_LINE_COUNT; i++) {

            var isSelected = REQUEST.getSublistValue({
                group: PCG_DELETE_DEMAND_PLANS_CONSTANTS.DELETE_DEMAND_PLANS_FORM.SUBLIST.DEMAND_PLAN.ID,
                name: PCG_DELETE_DEMAND_PLANS_CONSTANTS.DELETE_DEMAND_PLANS_FORM.SUBLIST.DEMAND_PLAN.FIELD.SELECT.id,
                line: i
            }) === 'T' ? true : false;

            if (isSelected) {
                var itemDemandPlanRecordId = REQUEST.getSublistValue({
                    group: PCG_DELETE_DEMAND_PLANS_CONSTANTS.DELETE_DEMAND_PLANS_FORM.SUBLIST.DEMAND_PLAN.ID,
                    name: PCG_DELETE_DEMAND_PLANS_CONSTANTS.DELETE_DEMAND_PLANS_FORM.SUBLIST.DEMAND_PLAN.FIELD.DEMAND_PLAN_ID.id,
                    line: i
                });

                itemDemandPlanRecordIdsToDelete.push(itemDemandPlanRecordId);
            }
        }

        return itemDemandPlanRecordIdsToDelete;
    }

    /**
     * Populates the Delete Demand Plan Suitelet's "Demand Plans" sublist.
     *
     * @param {Object} dataIn
     * @param {N/record.Field} dataIn.itemDemandPlansSublist - Item Demand Plan Sublist
     * @param {ItemDemandPlan[]} dataIn.itemDemandPlans - Item Demand Plans
     */
    function populateItemDemandPlansSublist(dataIn) {

        var itemDemandPlanSublist = dataIn.itemDemandPlansSublist;

        const ITEM_DEMAND_PLANS = dataIn.itemDemandPlans;

        for (var i = 0; i < ITEM_DEMAND_PLANS.length; i++) {

            var demandPlanRecordURL = url.resolveRecord({
                recordType: record.Type.ITEM_DEMAND_PLAN,
                recordId: ITEM_DEMAND_PLANS[i].id
            });

            var itemRecordURL = PCG_DELETE_DEMAND_PLANS_CONSTANTS.ITEM_RECORD_NETSUITE_URL + ITEM_DEMAND_PLANS[i].itemId

            var demandPlanRecordAnchorTag = '<a href="' + demandPlanRecordURL + '">' + ITEM_DEMAND_PLANS[i].itemId   + '</a>';
            var itemRecordAnchorTag       = '<a href="' + itemRecordURL       + '">' + ITEM_DEMAND_PLANS[i].itemText + ' - ' + ITEM_DEMAND_PLANS[i].itemDescription + '</a>';

            itemDemandPlanSublist.setSublistValue({
                sublistId: PCG_DELETE_DEMAND_PLANS_CONSTANTS.DELETE_DEMAND_PLANS_FORM.SUBLIST.DEMAND_PLAN.ID,
                id: PCG_DELETE_DEMAND_PLANS_CONSTANTS.DELETE_DEMAND_PLANS_FORM.SUBLIST.DEMAND_PLAN.FIELD.DEMAND_PLAN.id,
                value: demandPlanRecordAnchorTag,
                line: i
            });

            itemDemandPlanSublist.setSublistValue({
                sublistId: PCG_DELETE_DEMAND_PLANS_CONSTANTS.DELETE_DEMAND_PLANS_FORM.SUBLIST.DEMAND_PLAN.ID,
                id: PCG_DELETE_DEMAND_PLANS_CONSTANTS.DELETE_DEMAND_PLANS_FORM.SUBLIST.DEMAND_PLAN.FIELD.DEMAND_PLAN_ID.id,
                value: ITEM_DEMAND_PLANS[i].id,
                line: i
            });

            itemDemandPlanSublist.setSublistValue({
                sublistId: PCG_DELETE_DEMAND_PLANS_CONSTANTS.DELETE_DEMAND_PLANS_FORM.SUBLIST.DEMAND_PLAN.ID,
                id: PCG_DELETE_DEMAND_PLANS_CONSTANTS.DELETE_DEMAND_PLANS_FORM.SUBLIST.DEMAND_PLAN.FIELD.SUBSIDIARY.id,
                value: ITEM_DEMAND_PLANS[i].subsidiaryText,
                line: i
            });

            itemDemandPlanSublist.setSublistValue({
                sublistId: PCG_DELETE_DEMAND_PLANS_CONSTANTS.DELETE_DEMAND_PLANS_FORM.SUBLIST.DEMAND_PLAN.ID,
                id: PCG_DELETE_DEMAND_PLANS_CONSTANTS.DELETE_DEMAND_PLANS_FORM.SUBLIST.DEMAND_PLAN.FIELD.LOCATION.id,
                value: ITEM_DEMAND_PLANS[i].locationText,
                line: i
            });

            itemDemandPlanSublist.setSublistValue({
                sublistId: PCG_DELETE_DEMAND_PLANS_CONSTANTS.DELETE_DEMAND_PLANS_FORM.SUBLIST.DEMAND_PLAN.ID,
                id: PCG_DELETE_DEMAND_PLANS_CONSTANTS.DELETE_DEMAND_PLANS_FORM.SUBLIST.DEMAND_PLAN.FIELD.ITEM.id,
                value: itemRecordAnchorTag,
                line: i
            });

            itemDemandPlanSublist.setSublistValue({
                sublistId: PCG_DELETE_DEMAND_PLANS_CONSTANTS.DELETE_DEMAND_PLANS_FORM.SUBLIST.DEMAND_PLAN.ID,
                id: PCG_DELETE_DEMAND_PLANS_CONSTANTS.DELETE_DEMAND_PLANS_FORM.SUBLIST.DEMAND_PLAN.FIELD.ITEM_TYPE.id,
                value: ITEM_DEMAND_PLANS[i].itemType,
                line: i
            });

            itemDemandPlanSublist.setSublistValue({
                sublistId: PCG_DELETE_DEMAND_PLANS_CONSTANTS.DELETE_DEMAND_PLANS_FORM.SUBLIST.DEMAND_PLAN.ID,
                id: PCG_DELETE_DEMAND_PLANS_CONSTANTS.DELETE_DEMAND_PLANS_FORM.SUBLIST.DEMAND_PLAN.FIELD.IS_SALEABLE.id,
                value: ITEM_DEMAND_PLANS[i].isSaleable === true ? 'T' : 'F',
                line: i
            });

            itemDemandPlanSublist.setSublistValue({
                sublistId: PCG_DELETE_DEMAND_PLANS_CONSTANTS.DELETE_DEMAND_PLANS_FORM.SUBLIST.DEMAND_PLAN.ID,
                id: PCG_DELETE_DEMAND_PLANS_CONSTANTS.DELETE_DEMAND_PLANS_FORM.SUBLIST.DEMAND_PLAN.FIELD.ITEM_USAGE.id,
                value: ITEM_DEMAND_PLANS[i].itemUsageText ? ITEM_DEMAND_PLANS[i].itemUsageText : ' ',
                line: i
            });

            itemDemandPlanSublist.setSublistValue({
                sublistId: PCG_DELETE_DEMAND_PLANS_CONSTANTS.DELETE_DEMAND_PLANS_FORM.SUBLIST.DEMAND_PLAN.ID,
                id: PCG_DELETE_DEMAND_PLANS_CONSTANTS.DELETE_DEMAND_PLANS_FORM.SUBLIST.DEMAND_PLAN.FIELD.LAST_MODIFIED_DATE.id,
                value: ITEM_DEMAND_PLANS[i].lastModifiedDate,
                line: i
            });
        }
    }

    /**
     * Populates the Delete Demand Plan Filter Item Type
     *
     * @param {Object} dataIn
     * @param {Object[]} dataIn.itemTypes - Item Types
     * @param {N/record.Field} dataIn.itemTypeSelectField - Item Type Select Field
     */
    function populateItemTypeSelectOptions(dataIn) {

        const ITEM_TYPES = dataIn.itemTypes;

        var itemTypeSelectField = dataIn.itemTypeSelectField;

        itemTypeSelectField.addSelectOption({
            value: '-1',
            text: ''
        });

        ITEM_TYPES.forEach(function(itemType) {
            itemTypeSelectField.addSelectOption({
                value: itemType.typeId,
                text: itemType.typeText
            });
        });
    }

    /**
     * Redirects the user to the home dashboard.
     */
    function redirectToHomeDashboard() {
        redirect.toTaskLink({
            id: PCG_DELETE_DEMAND_PLANS_CONSTANTS.TASK_LINK.DASHBOARD
        });
    }

    /**
     * Starts the Delete Demand Plans MR Script which handles the deleting of the Demand Plans
     * from the specified saved search.
     *
     * @param {Object} dataIn
     * @param {string|number} dataIn.deleteItemPlanSavedSearchId - Delete Item Plan Saved Search ID
     */
    function startDeleteDemandPlansMapReduceScript(dataIn) {

        const DELETE_ITEM_PLAN_SAVED_SEARCH_ID = dataIn.deleteItemPlanSavedSearchId;

        var params = {};
        params[PCG_DELETE_DEMAND_PLANS_CONSTANTS.DELETE_DEMAND_PLANS_MAP_REDUCE_SCRIPT.PARAMETER.SAVED_SEARCH_ID] = DELETE_ITEM_PLAN_SAVED_SEARCH_ID;

        task.create({
            taskType: task.TaskType.MAP_REDUCE,
            scriptId: PCG_DELETE_DEMAND_PLANS_CONSTANTS.DELETE_DEMAND_PLANS_MAP_REDUCE_SCRIPT.SCRIPT_ID,
            deploymentId: PCG_DELETE_DEMAND_PLANS_CONSTANTS.DELETE_DEMAND_PLANS_MAP_REDUCE_SCRIPT.DEPLOYMENT_ID,
            params: params
        }).submit();
    }

    return {
        createDeleteItemPlansSavedSearch: createDeleteItemPlansSavedSearch,
        defaultFormParameters: defaultFormParameters,
        getHeaderFieldValues: getHeaderFieldValues,
        getItemDemandPlans: getItemDemandPlans,
        getItemTypes: getItemTypes,
        getParameters: getParameters,
        getSelectedItemDemandPlanRecordIdsToDelete: getSelectedItemDemandPlanRecordIdsToDelete,
        populateItemDemandPlansSublist: populateItemDemandPlansSublist,
        populateItemTypeSelectOptions: populateItemTypeSelectOptions,
        redirectToHomeDashboard: redirectToHomeDashboard,
        startDeleteDemandPlansMapReduceScript: startDeleteDemandPlansMapReduceScript
    };
});
