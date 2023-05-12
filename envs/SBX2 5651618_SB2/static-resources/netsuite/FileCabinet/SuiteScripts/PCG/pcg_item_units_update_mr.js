/**
 * @NApiVersion 2.x
 * @NScriptType MapReduceScript
 * @NModuleScope SameAccount
 */
define(['N/record', 'N/runtime', 'N/search', 'N/email', 'N/url'],
    /**
     * @param {file} file
     * @param {record} record
     * @param {runtime} runtime
     * @param {search} search
     */
    function (record, runtime, search, email, url) {

        /**
         * Marks the beginning of the Map/Reduce process and generates input data.
         *
         * @typedef {Object} ObjectRef
         * @property {number} id - Internal ID of the record instance
         * @property {string} type - Record type id
         *
         * @return {Array|Object|Search|RecordRef} inputSummary
         * @since 2015.1
         */

        function getInputData() {
            try {
                // make a search on item and get results
                var itemSearchObj = search.create({
                    type: "item",
                    filters: [
                        ['isinactive', 'is', false],
                        "AND",
                        ["unitstype", 'noneof', '@NONE@'],
                        // "AND",
                        // ["internalid", "anyof", "6630"]
                    ],
                    columns:
                        [
                            search.createColumn({
                                name: "internalid",
                                sort: search.Sort.ASC,
                                label: "Internal ID"
                            }),
                            search.createColumn({ name: "unitstype", label: "Units Type" }),
                            search.createColumn({ name: "type", label: "Type" }),
                            search.createColumn({ name: "islotitem", label: "Is Lot Numbered Item" }),
                            search.createColumn({ name: "isserialitem", label: "Is Serialized Item" })
                        ]
                });

                // execute the search and get results
                var itemSearchResults = executeSearch(itemSearchObj);
                log.debug("itemSearchResults count", itemSearchResults.length);

                var itemObj = {};

                // iterate search results
                for (var i = 0; i < itemSearchResults.length; i++) {
                    var itemId = itemSearchResults[i].id;
                    var unitsType = itemSearchResults[i].getValue('unitstype');
                    var itemType = itemSearchResults[i].getValue('type');
                    var isLotNumberedItem = itemSearchResults[i].getValue('islotitem');
                    var isserializedItem = itemSearchResults[i].getValue('isserialitem');

                    // prepare obj with item id and untis type values
                    itemObj[itemId] = {
                        unitsType: unitsType,
                        itemType: itemType,
                        isLotNumberedItem: isLotNumberedItem,
                        isserializedItem: isserializedItem
                    };
                }
                log.debug("itemObj", JSON.stringify(itemObj));

                return itemObj;

            } catch (e) {
                log.error('error in getinputdata', typeof e);
                var msg = '';
                if (e.hasOwnProperty('message')) {
                    msg = e.name + ': ' + e.message;
                    log.error({
                        title: 'System Error',
                        details: e.name + '' + e.message + '' + JSON.stringify(e.stack)
                    });
                } else {
                    msg = e.toString();
                    log.error({
                        title: 'Unexpected Error',
                        details: e.toString()
                    });
                }
                throw msg;
            }
        }
        /**
         * Executes when the map entry point is triggered and applies to each key/value pair.
         *
         * @param {MapSummary} context - Data collection containing the key/value pairs to process through the map stage
         * @since 2015.1
         */
        function map(context) {
            //   var contextObj = {};
            try {
                log.debug("context", context);

                var itemId = context.key;
                var data = JSON.parse(context.value);

                var itemRecordType = "";

                // get item values
                var unitsType = data.unitsType;
                var itemType = data.itemType;
                var isLotNumberedItem = data.isLotNumberedItem;
                var isSerialItem = data.isserializedItem;

                if (itemType == "InvtPart") {
                    if (isLotNumberedItem == 'T' || isLotNumberedItem == true) {
                        itemRecordType = "lotnumberedinventoryitem";
                    } else if (isserializedItem == 'T' || isserializedItem == true) {
                        itemRecordType = "serializedinventoryitem";
                    } else {
                        itemRecordType = "inventoryitem";
                    }
                }

                if (itemType == "NonInvtPart") {
                    itemRecordType = "noninventoryitem";
                }

                if (itemType == "Assembly") {
                    if (isLotNumberedItem == 'T' || isLotNumberedItem == true) {
                        itemRecordType = "lotnumberedassemblyitem";
                    } else if (isserializedItem == 'T' || isserializedItem == true) {
                        itemRecordType = "serializedassemblyitem";
                    } else {
                        itemRecordType = "assemblyitem";
                    }
                }

                var unitsTypeRec = record.load({
                    type: record.Type.UNITS_TYPE,
                    id: unitsType
                });
                var lbLine = unitsTypeRec.findSublistLineWithValue({
                    sublistId: 'uom',
                    fieldId: 'unitname',
                    value: 'LBS'
                });

                if (lbLine !== -1) {
                    var isBaseUnit = unitsTypeRec.getSublistValue({
                        sublistId: 'uom',
                        fieldId: 'baseunit',
                        line: lbLine
                    });

                    if (isBaseUnit == true || isBaseUnit == 'T') {
                        // get CS line
                        var csLine = unitsTypeRec.findSublistLineWithValue({
                            sublistId: 'uom',
                            fieldId: 'unitname',
                            value: 'CS'
                        });

                        if (csLine !== -1) {
                            var conversionRate = unitsTypeRec.getSublistValue({
                                sublistId: 'uom',
                                fieldId: 'conversionrate',
                                line: csLine
                            });
                            log.debug("conversionRate", conversionRate);

                            if (!isNullOrEmpty(itemRecordType)) {
                                // submit the record
                                record.submitFields({
                                    type: itemRecordType,
                                    id: itemId,
                                    values: {
                                        'custitem_pcg_tfi_item_lbs_cs': conversionRate,
                                    },
                                    options: {
                                        enableSourcing: false,
                                        ignoreMandatoryFields: true
                                    }
                                });
                            }
                        }
                    }
                }

            } catch (e) {
                log.error('error in map');
                var msg = '';

                if (e.hasOwnProperty('message')) {
                    msg = e.name + ': ' + e.message;
                    log.error({
                        title: 'Map System Error',
                        details: e.name + '' + e.message + '' + JSON.stringify(e.stack)
                    });
                } else {
                    msg = e.toString();
                    log.error({
                        title: 'Unexpected Error',
                        details: e.toString()
                    });
                }
            }
        }

        /**
         * Executes when the summarize entry point is triggered and applies to the result set.
         *
         * @param {Summary} summary - Holds statistics regarding the execution of a map/reduce script
         * @since 2015.1
         */
        function summarize(summary) {
            try {
                summary.output.iterator().each(function (key, value) {
                    log.debug("summary: " + key, value);
                    return true;
                });
            } catch (e) {
                log.error('error in summarize');
                var msg = '';

                if (e.hasOwnProperty('message')) {
                    msg = e.name + ': ' + e.message;
                    log.error({
                        title: 'summarize System Error',
                        details: e.name + '' + e.message + '' + JSON.stringify(e.stack)
                    });
                } else {
                    msg = e.toString();
                    log.error({
                        title: 'Unexpected Error',
                        details: e.toString()
                    });
                }
            }
        }

        /*
        * helper function to get the search results
        */
        function executeSearch(srch) {
            var results = [];

            var pagedData = srch.runPaged({
                pageSize: 1000
            });
            pagedData.pageRanges.forEach(function (pageRange) {
                var page = pagedData.fetch({
                    index: pageRange.index
                });
                page.data.forEach(function (result) {
                    results.push(result);
                });
            });
            return results;
        };

        /*
        * Validating if value is null or empty
        */
        function isNullOrEmpty(val) {
            if (val == null || val == '' || val == "" || val == 'undefined' || val == undefined || val == [] || val == {} || val == '{}' || val == NaN || val == '- None -') {
                return true;
            } else {
                return false;
            }
        };

        return {
            getInputData: getInputData,
            map: map,
            summarize: summarize
        };

    });
