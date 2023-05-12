/**
 * @NApiVersion 2.x
 * @NScriptType ClientScript
 * @NModuleScope SameAccount
 */
define(['N/record', 'N/runtime', 'N/search', 'N/error', 'N/ui/dialog'],
    /**


     * @param {record} record
     * @param {runtime} runtime
     * @param {search} search
     * @param {serverWidget} serverWidget

     */
    function (record, runtime, search, error, dialog) {

        /**
         * Function to be executed after page is initialized.
         *
         * @param {Object} scriptContext
         * @param {Record} scriptContext.currentRecord - Current form record
         * @param {string} scriptContext.mode - The mode in which the record is being accessed (create, copy, or edit)
         *
         * @since 2015.2
         */
        function pageInit(scriptContext) {

        }

        /**
         * Function to be executed when field is changed.
         *
         * @param {Object} scriptContext
         * @param {Record} scriptContext.currentRecord - Current form record
         * @param {string} scriptContext.sublistId - Sublist name
         * @param {string} scriptContext.fieldId - Field name
         * @param {number} scriptContext.lineNum - Line number. Will be undefined if not a sublist or matrix field
         * @param {number} scriptContext.columnNum - Line number. Will be undefined if not a matrix field
         *
         * @since 2015.2
         */
        function fieldChanged(scriptContext) {

        }

        /**
         * Function to be executed when field is slaved.
         *
         * @param {Object} scriptContext
         * @param {Record} scriptContext.currentRecord - Current form record
         * @param {string} scriptContext.sublistId - Sublist name
         * @param {string} scriptContext.fieldId - Field name
         *
         * @since 2015.2
         */
        function postSourcing(scriptContext) {

        }

        /**
         * Function to be executed after sublist is inserted, removed, or edited.
         *
         * @param {Object} scriptContext
         * @param {Record} scriptContext.currentRecord - Current form record
         * @param {string} scriptContext.sublistId - Sublist name
         *
         * @since 2015.2
         */
        function sublistChanged(scriptContext) {

        }

        /**
         * Function to be executed after line is selected.
         *
         * @param {Object} scriptContext
         * @param {Record} scriptContext.currentRecord - Current form record
         * @param {string} scriptContext.sublistId - Sublist name
         *
         * @since 2015.2
         */
        function lineInit(scriptContext) {

        }

        /**
         * Validation function to be executed when field is changed.
         *
         * @param {Object} scriptContext
         * @param {Record} scriptContext.currentRecord - Current form record
         * @param {string} scriptContext.sublistId - Sublist name
         * @param {string} scriptContext.fieldId - Field name
         * @param {number} scriptContext.lineNum - Line number. Will be undefined if not a sublist or matrix field
         * @param {number} scriptContext.columnNum - Line number. Will be undefined if not a matrix field
         *
         * @returns {boolean} Return true if field is valid
         *
         * @since 2015.2
         */
        function validateField(scriptContext) {

        }

        /**
         * Validation function to be executed when sublist line is committed.
         *
         * @param {Object} scriptContext
         * @param {Record} scriptContext.currentRecord - Current form record
         * @param {string} scriptContext.sublistId - Sublist name
         *
         * @returns {boolean} Return true if sublist line is valid
         *
         * @since 2015.2
         */
        function validateLine(scriptContext) {
            try {
                var currentRecord       = scriptContext.currentRecord;
                var sublistName         = scriptContext.sublistId;
                var scriptObj           = runtime.getCurrentScript();
                var itemDetailsSearch   = scriptObj.getParameter('custscript_cw_inv_adj_item_sr');

                if (isEmpty(itemDetailsSearch)) {
                    return true;
                }

                if (sublistName === 'inventory') {

                    var isCatchWeightItem = currentRecord.getCurrentSublistValue({
                        sublistId   : sublistName,
                        fieldId     : 'custcol_cw_item_ckbx'
                    });

                    //Functionality will work only if item is catch weight item
                    if (isCatchWeightItem) {

                        var currentItem = currentRecord.getCurrentSublistValue({
                            sublistId   : sublistName,
                            fieldId     : 'item'
                        });

                        var currentLocation = currentRecord.getCurrentSublistValue({
                            sublistId   : sublistName,
                            fieldId     : 'location'
                        });

                        var actualWeight = currentRecord.getCurrentSublistValue({
                            sublistId   : sublistName,
                            fieldId     : 'custcol_cw_act_wght'
                        });

                        var adjustQtyBy = currentRecord.getCurrentSublistValue({
                            sublistId   : sublistName,
                            fieldId     : 'adjustqtyby'
                        });

                        // Make sure we have catch weight entered
                        var catchWeight = currentRecord.getCurrentSublistValue({
                            sublistId: sublistName,
                            fieldId: 'custcol_cw_catch_weight'
                        });

                        log.debug('catchWeight', catchWeight);

                        if (!catchWeight && catchWeight !== 0) {
                            dialog.alert({
                                title: 'Missing Catch Weight',
                                message: 'Please enter a value for Catch Weight.'
                            });

                            return false;
                        }

                        var itemDetailsObject = getCatchWeightItemDetails(currentItem, currentLocation, itemDetailsSearch);

                        //functionality should work only if item is in search results
                        if (!isEmpty(itemDetailsObject)) {

                            var itemCost = itemDetailsObject.stdCost ? Number(itemDetailsObject.stdCost) : Number(itemDetailsObject.avgCost);

                            currentRecord.setCurrentSublistValue({
                                sublistId   : sublistName,
                                fieldId     : 'custcol_cw_price_um',//PriceUM
                                value       : itemCost
                            });

                            var avgWeight = getAVGWeight(itemDetailsObject);

                            if(!isEmpty(avgWeight)){
                                currentRecord.setCurrentSublistValue({
                                    sublistId   : sublistName,
                                    fieldId     : 'custcol_cw_avg_wght',
                                    value       : Number(avgWeight)
                                });
                            }

                            //If Actual Weight is Empty or 0 then (Price UM * Avg Weight * ADJUST QTY. BY)
                            if (isEmpty(actualWeight)) {

                                if(!isEmpty(avgWeight)){
                                    currentRecord.setCurrentSublistValue({
                                        sublistId   : sublistName,
                                        fieldId     : 'custcol_cw_inv_adj_exten_amt',
                                        value       : itemCost * Number(avgWeight) * Number(adjustQtyBy)
                                    });
                                }

                            } else {
                                //If Actual Weight is Not Empty then (Actual Weight * Price UM)

                                currentRecord.setCurrentSublistValue({
                                    sublistId   : sublistName,
                                    fieldId     : 'custcol_cw_inv_adj_exten_amt',
                                    value       : itemCost * Number(actualWeight)
                                });
                            }
                        }
                    }
                }

                return true;
            } catch (err) {
                log.error('validateLine error', JSON.stringify(err));
                throw err;
            }
        }

        /**
         * Validation function to be executed when sublist line is inserted.
         *
         * @param {Object} scriptContext
         * @param {Record} scriptContext.currentRecord - Current form record
         * @param {string} scriptContext.sublistId - Sublist name
         *
         * @returns {boolean} Return true if sublist line is valid
         *
         * @since 2015.2
         */
        function validateInsert(scriptContext) {

        }

        /**
         * Validation function to be executed when record is deleted.
         *
         * @param {Object} scriptContext
         * @param {Record} scriptContext.currentRecord - Current form record
         * @param {string} scriptContext.sublistId - Sublist name
         *
         * @returns {boolean} Return true if sublist line is valid
         *
         * @since 2015.2
         */
        function validateDelete(scriptContext) {

        }

        /**
         * Validation function to be executed when record is saved.
         *
         * @param {Object} scriptContext
         * @param {Record} scriptContext.currentRecord - Current form record
         * @returns {boolean} Return true if record is valid
         *
         * @since 2015.2
         */
        function saveRecord(scriptContext) {


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
         * This function calculated AVG weight = Conversion Rate * Item Weight (id: weight)
         * @param itemDetailsObject
         * @returns {null|number}
         */
        function getAVGWeight(itemDetailsObject) {

            var unitsTypeRec = record.load({
                type    : record.Type.UNITS_TYPE,
                id      : itemDetailsObject.unitsType,
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
                    sublistId   : 'uom',
                    fieldId     : 'internalid',
                    line        : j
                });

                if (currentUOMId.toString() === itemDetailsObject.stockUnits) {

                    conversionRate = unitsTypeRec.getSublistValue({
                        sublistId   : 'uom',
                        fieldId     : 'conversionrate',
                        line        : j
                    });
                    break;
                }
            }

            if (!isEmpty(conversionRate)) {
                return Number(itemDetailsObject.weight) * Number(conversionRate)
            }

            return null;
        }

        /**
         * This function searches item record and returns required values.
         * @param currentItem
         * @param currentLocation
         * @param itemDetailsSearch
         * @returns {null}
         */
        function getCatchWeightItemDetails(currentItem, currentLocation, itemDetailsSearch) {

            var filters = [];

            filters.push(search.createFilter({
                name    : 'internalid',
                operator: search.Operator.ANYOF,
                values  : currentItem
            }));

            filters.push(search.createFilter({
                name    : 'inventorylocation',
                operator: search.Operator.ANYOF,
                values  : currentLocation
            }));

            var results = extendedSearch(null, itemDetailsSearch, filters, null);

            if (results.length > 0) {

                var returnObject = {};

                for (var i = 0; i < results.length; i++) {

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

                    var avgCost = results[i].getValue({
                        name: 'averagecost'
                    });

                    var locationAvgCost = results[i].getValue({
                        name: 'locationaveragecost'
                    });

                    returnObject['stdCost']     = stdCost;
                    returnObject['unitsType']   = unitsType;
                    returnObject['stockUnits']  = stockUnits;
                    returnObject['weight']      = weight;
                    returnObject['avgCost']     = locationAvgCost || avgCost;
                }

                return returnObject;
            }

            return null;
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
            // pageInit: pageInit,
            //  fieldChanged: fieldChanged,
            //postSourcing: postSourcing,
            //sublistChanged: sublistChanged,
            //lineInit: lineInit,
            //validateField: validateField,
            validateLine: validateLine,
            //validateInsert: validateInsert,
            // validateDelete: validateDelete,
            //saveRecord: saveRecord
        };

    });
