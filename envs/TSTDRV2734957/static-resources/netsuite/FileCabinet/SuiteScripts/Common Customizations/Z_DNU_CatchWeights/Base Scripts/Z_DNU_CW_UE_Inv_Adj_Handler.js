/**
 * @NApiVersion 2.x
 * @NScriptType UserEventScript
 * @NModuleScope SameAccount
 */
define(['N/error', 'N/record', 'N/runtime', 'N/ui', 'N/ui/serverWidget','N/search'],

    /**
     *
     * @param error
     * @param record
     * @param runtime
     * @param ui
     * @param serverWidget
     * @returns {{beforeSubmit: beforeSubmit, beforeLoad: beforeLoad}}
     */
    function (error, record, runtime, ui, serverWidget,search) {

        var LOG_START = ' :  ****** START ****** ';
        var LOG_END = ' :  ------ END ------ ';


        /**
         *
         * @param scriptContext
         * @returns {boolean}
         */
        function beforeLoad(scriptContext) {


        }


        /**
         *
         * @param scriptContext
         */
        function beforeSubmit(scriptContext) {


        }

        /**
         * Function definition to be triggered before record is loaded.
         *
         * @param {Object} scriptContext
         * @param {Record} scriptContext.newRecord - New record
         * @param {Record} scriptContext.oldRecord - Old record
         * @param {string} scriptContext.type - Trigger type
         * @Since 2015.2
         */
        function afterSubmit(scriptContext) {

            var stLogTitle = 'afterSubmit';

            log.audit({title: stLogTitle, details: stLogTitle + LOG_START});

            try {

                if (runtime.executionContext === runtime.ContextType.USER_INTERFACE ||
                    scriptContext.type !== scriptContext.UserEventType.CREATE) {
                    log.audit({title: stLogTitle, details: 'Script will not work in User Interface and non create contexts'});
                    return;
                }

                var scriptObj       = runtime.getCurrentScript();
                var currentRecord   = scriptContext.newRecord;
                var stdCostSearch   = scriptObj.getParameter('custscript_nsts_cw_std_cost_sr');

                if (isEmpty(stdCostSearch)) {
                    log.error({title: stLogTitle, details: 'Script Parameter is missing.'});
                    return;
                }

                var catchWeightItemsArray = createCatchWeightItemsArray(currentRecord);

                if (catchWeightItemsArray.length > 0) {

                    var itemDetailsObject = getCatchWeightItemDetails(catchWeightItemsArray, stdCostSearch);

                    if (!isEmpty(itemDetailsObject)) {

                        var recToUpdate = record.load({
                            type    : currentRecord.type,
                            id      : currentRecord.id,
                            isDynamic: true
                        });

                        updateCurrentRecord(itemDetailsObject, recToUpdate);

                        var recordId = recToUpdate.save({
                            enableSourcing      : true,
                            ignoreMandatoryFields: true
                        });
                    }

                } else {
                    log.audit({title: stLogTitle, details: 'No Catch Weight Items found on Inv Adjustment.'});
                    return;
                }

            } catch (e) {
                log.error(stLogTitle, e.message);
            }


            log.audit({title: stLogTitle, details: stLogTitle + LOG_END});
        }

        function updateCurrentRecord(itemDetailsObject, currentRecord) {

            try {

                var stLogTitle = 'updateCurrentRecord';

                log.audit({title: stLogTitle, details: stLogTitle + LOG_END});

                var sublistName     = 'inventory';
                var itemLineCount   = currentRecord.getLineCount({
                    sublistId: sublistName
                });


                for (var i = 0; i < itemLineCount; i++) {

                    var record = currentRecord.selectLine({
                        sublistId: sublistName,
                        line: i
                    });

                    var isCatchWeightItem = currentRecord.getCurrentSublistValue({
                        sublistId: sublistName,
                        fieldId: 'custcol_cw_item_ckbx'
                    });

                    if (isCatchWeightItem) {

                        var currentItem = currentRecord.getCurrentSublistValue({
                            sublistId: sublistName,
                            fieldId: 'item'
                        });

                        var currentLocation = currentRecord.getCurrentSublistValue({
                            sublistId: sublistName,
                            fieldId: 'location'
                        });

                        var actualWeight = currentRecord.getCurrentSublistValue({
                            sublistId: sublistName,
                            fieldId: 'custcol_cw_act_wght'
                        });

                        var adjustQtyBy = currentRecord.getCurrentSublistValue({
                            sublistId: sublistName,
                            fieldId: 'adjustqtyby'
                        });

                        var itemLoc = currentItem+'-'+currentLocation;
                        log.audit({title: stLogTitle, details: 'itemLoc : ' + itemLoc});

                        if(!(itemLoc in itemDetailsObject )){
                            continue;
                        }

                        var stdCost = Number(itemDetailsObject[itemLoc].stdCost);
                        var unitsType = Number(itemDetailsObject[itemLoc].unitsType);
                        var stockUnits = Number(itemDetailsObject[itemLoc].stockUnits);
                        var weight = Number(itemDetailsObject[itemLoc].weight);

                        currentRecord.setCurrentSublistValue({
                            sublistId: sublistName,
                            fieldId: 'custcol_cw_price_um',//PriceUM`
                            value: stdCost
                        });

                        var avgWeight = getAVGWeight(unitsType, stockUnits, weight);

                        if (!isEmpty(avgWeight)) {
                            currentRecord.setCurrentSublistValue({
                                sublistId: sublistName,
                                fieldId: 'custcol_cw_avg_wght',
                                value: Number(avgWeight)
                            });
                        }

                        //If Actual Weight is Empty or 0 then (Price UM * Avg Weight * ADJUST QTY. BY)
                        if (isEmpty(actualWeight)) {

                            if (!isEmpty(avgWeight)) {

                                currentRecord.setCurrentSublistValue({
                                    sublistId: sublistName,
                                    fieldId: 'custcol_cw_inv_adj_exten_amt',
                                    value: Number(stdCost) * Number(avgWeight) * Number(adjustQtyBy)
                                });
                            }

                        } else {
                            //If Actual Weight is Not Empty then (Actual Weight * Price UM)

                            currentRecord.setCurrentSublistValue({
                                sublistId: sublistName,
                                fieldId: 'custcol_cw_inv_adj_exten_amt',
                                value: stdCost * Number(actualWeight)
                            });
                        }

                        currentRecord.commitLine({
                            sublistId: sublistName
                        });
                    }
                }
            } catch (e) {
                log.error(stLogTitle, e.message);
            }

        }

        function getAVGWeight(unitsType, stockUnits, weight) {

            var stLogTitle = 'getAVGWeight';
            log.audit({title: stLogTitle, details: stLogTitle + LOG_START});


            var unitsTypeRec = record.load({
                type: record.Type.UNITS_TYPE,
                id: Number(unitsType),
                isDynamic: false,
            });


            // get line item count of Units Type
            var numLines = unitsTypeRec.getLineCount({
                sublistId: 'uom'
            });

            var conversionRate = '';

            // loop in the line items of Units Type
            for (var j = 0; j < numLines; j++) {

                var currentUOMId = unitsTypeRec.getSublistValue({
                    sublistId: 'uom',
                    fieldId: 'internalid',
                    line: j
                });

                if (currentUOMId.toString() === stockUnits.toString()) {

                    conversionRate = unitsTypeRec.getSublistValue({
                        sublistId: 'uom',
                        fieldId: 'conversionrate',
                        line: j
                    });
                    break;
                }
            }

            log.audit({title: stLogTitle, details: 'conversionRate : ' + conversionRate});

            if (!isEmpty(conversionRate)) {
                log.audit({title: stLogTitle, details: stLogTitle + LOG_END});
                return Number(weight) * Number(conversionRate)
            }

            log.audit({title: stLogTitle, details: 'Could Not get Conversion Rate'});

            return null;
        }


        /**
         * This function searches for catch weigh items and returns details in object format
         * @param catchWeightItemArray
         * @param stdCostSearch
         * @returns {null}
         */
        function getCatchWeightItemDetails(catchWeightItemArray, stdCostSearch) {

            var stLogTitle = 'getCatchWeightItemDetails';
            log.audit({title: stLogTitle, details: stLogTitle + LOG_START});

            var filters = [];

            filters.push(search.createFilter({
                name: 'internalid',
                operator: search.Operator.ANYOF,
                values: catchWeightItemArray
            }));


            var results = extendedSearch(null, stdCostSearch, filters, null);

            var returnObject = {};

            if (results.length > 0) {

                for (var i = 0; i < results.length; i++) {

                    var itemId = results[i].id;
                    var inventoryLoc = results[i].getValue({
                        name: 'inventorylocation'
                    });

                    var stdCost = results[i].getValue({
                        name: 'currentstandardcost'
                    });

                    var unitsType = results[i].getValue({
                        name: 'unitstype'
                    });

                    var stockUnits = results[i].getValue({
                        name: 'stockunit'
                    });

                    var weight = results[i].getValue({
                        name: 'weight'
                    });

                    var itemLoc = itemId+'-'+inventoryLoc;
                    returnObject[itemLoc] = {};
                    returnObject[itemLoc]['stdCost'] = stdCost;
                    returnObject[itemLoc]['unitsType'] = unitsType;
                    returnObject[itemLoc]['stockUnits'] = stockUnits;
                    returnObject[itemLoc]['weight'] = weight;
                }

                log.debug({title: stLogTitle, details: JSON.stringify(returnObject) });
                log.audit({title: stLogTitle, details: stLogTitle + LOG_END});

                return returnObject;

            } else {
                log.debug({title: stLogTitle, details: 'Could not create Catch Weight Details Object' });
                log.audit({title: stLogTitle, details: stLogTitle + LOG_END});
                return null;
            }

        }


        /**
         * This function creates an array of catch weight items
         * @param currentRecord
         * @returns {Array}
         */
        function createCatchWeightItemsArray(currentRecord) {

            var stLogTitle = 'createCatchWeightItemsArray';
            log.audit({title: stLogTitle, details: stLogTitle + LOG_START});

            var itemLineCount = currentRecord.getLineCount({
                sublistId: 'inventory'
            });

            var tempArray = [];

            for (var i = 0; i < itemLineCount; i++) {

                var isCatchWeightItem = currentRecord.getSublistValue({
                    sublistId: 'inventory',
                    fieldId: 'custcol_cw_item_ckbx',
                    line: i
                });

                if (isCatchWeightItem) {

                    var currentItem = currentRecord.getSublistValue({
                        sublistId: 'inventory',
                        fieldId: 'item',
                        line: i
                    });
                    tempArray.push(currentItem)
                }
            }

            return tempArray;
        }


        /**
         * Checks fields for empty
         * @param currentRecord
         * @param fieldsToCheck
         * @returns {boolean}
         */
        function validateFieldValues(currentRecord, fieldsToCheck) {

            var stLogTitle = 'validateFieldValues';
            var fieldsToCheckArray = fieldsToCheck.split(',');
            log.debug({title: stLogTitle, details: JSON.stringify(fieldsToCheckArray)});

            for (var i = 0; i < fieldsToCheckArray.length; i++) {

                var currentFieldValue = currentRecord.getValue({
                    fieldId: fieldsToCheckArray[i]
                });

                if (isEmpty(currentFieldValue)) {
                    log.error({title: stLogTitle, details: 'Missing Value for field: ' + fieldsToCheckArray[i]});
                    return true;
                }
            }

            return false;
        }


        /**
         * Null check utility function
         * @param value
         * @returns {boolean}
         */
        function isEmpty(value) {
            if (value == null)
                return true;
            if (value == undefined)
                return true;
            if (value == 'undefined')
                return true;
            if (value == '')
                return true;
            return false;
        }

        /**
         *
         * @param stRecordType
         * @param stSearchId
         * @param arrSearchFilter
         * @param arrSearchColumn
         * @returns {any[]}
         */
        function extendedSearch(stRecordType, stSearchId, arrSearchFilter, arrSearchColumn) {
            if (stRecordType == null && stSearchId == null) {
                error.create({
                    name: 'SSS_MISSING_REQD_ARGUMENT',
                    message: 'search: Missing a required argument. Either stRecordType or stSearchId should be provided.',
                    notifyOff: false
                });
            }

            var arrReturnSearchResults = new Array();
            var objSavedSearch;

            var maxResults = 1000;

            if (stSearchId != null) {
                objSavedSearch = search.load({
                    id: stSearchId
                });

                // add search filter if one is passed
                if (arrSearchFilter != null) {
                    if (arrSearchFilter[0] instanceof Array || (typeof arrSearchFilter[0] == 'string')) {
                        objSavedSearch.filterExpression = objSavedSearch.filterExpression.concat(arrSearchFilter);
                    } else {
                        objSavedSearch.filters = objSavedSearch.filters.concat(arrSearchFilter);
                    }
                }

                // add search column if one is passed
                if (arrSearchColumn != null) {
                    objSavedSearch.columns = objSavedSearch.columns.concat(arrSearchColumn);
                }
            } else {
                objSavedSearch = search.create({
                    type: stRecordType
                });

                // add search filter if one is passed
                if (arrSearchFilter != null) {
                    if (arrSearchFilter[0] instanceof Array || (typeof arrSearchFilter[0] == 'string')) {
                        objSavedSearch.filterExpression = arrSearchFilter;
                    } else {
                        objSavedSearch.filters = arrSearchFilter;
                    }
                }

                // add search column if one is passed
                if (arrSearchColumn != null) {
                    objSavedSearch.columns = arrSearchColumn;
                }
            }

            var objResultset = objSavedSearch.run();
            var intSearchIndex = 0;
            var arrResultSlice = null;
            do {
                arrResultSlice = objResultset.getRange(intSearchIndex, intSearchIndex + maxResults);
                if (arrResultSlice == null) {
                    break;
                }

                arrReturnSearchResults = arrReturnSearchResults.concat(arrResultSlice);
                intSearchIndex = arrReturnSearchResults.length;
            }
            while (arrResultSlice.length >= maxResults);

            return arrReturnSearchResults;
        }


        return {
            //beforeLoad: beforeLoad,
            //beforeSubmit: beforeSubmit,
            afterSubmit: afterSubmit
        };

    });
