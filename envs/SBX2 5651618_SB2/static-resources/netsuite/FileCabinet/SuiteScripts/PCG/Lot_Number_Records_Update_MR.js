/**
 * @NApiVersion 2.x
 * @NScriptType MapReduceScript
 * @NModuleScope SameAccount
 */
define(['N/record', 'N/runtime', 'N/search', 'N/file', 'N/format'],
    /**
     * @param {file} file
     * @param {record} record
     * @param {runtime} runtime
     * @param {search} search
     */
    function (record, runtime, search, file, format) {

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
                // load the file
                var fileObj = file.load({
                    id: 'TFI Files/Lot Number Records/LotNumberRecordsUpdate.csv' //'59872'
                });

                var key = fileObj.getContents();
                log.debug("key", key);

                var arrLines = key.split("\n");
                log.debug("count", arrLines.length);

                var lotNumberDetails = [];

                for (var i = 1; i < arrLines.length - 1; i++) {
                    //split the 1 line of data into an array.  If the file was a csv file, each array position holds a value from the columns of the 1 line of data
                    var content = arrLines[i].split(',');

                    var internalID = content[0];
                    var expirationDate = content[1];
                    var memo = content[2];
                    var availableSellDate = content[3];
                    var chilledAge = content[4];
                    var lotActualCases = content[5];
                    var lotActualWeight = content[6];
                    var ecoliCertificate = content[7];
                    var establishmentNumber = content[8];
                    var everFrozen = content[9];
                    var lotProductAge = content[10];
                    var lotInventoryCosetPerLB = content[11];
                    var thawingProcessApplied = content[12];
                    var freezeOrUseByDate = content[13];
                    var sellByDate = content[14];
                    var boxID = content[15];
                    var effectiveDate = content[16];
                    var packDate = content[17];
                    var shippingMark = content[18];
                    var lotAvailableCases = content[19];

                    // store data into an array
                    lotNumberDetails.push({
                        internalID: internalID,
                        expirationDate: expirationDate,
                        memo: memo,
                        availableSellDate: availableSellDate,
                        chilledAge: chilledAge,
                        lotActualCases: lotActualCases,
                        lotActualWeight: lotActualWeight,
                        ecoliCertificate: ecoliCertificate,
                        establishmentNumber: establishmentNumber,
                        everFrozen: everFrozen,
                        lotProductAge: lotProductAge,
                        lotInventoryCosetPerLB: lotInventoryCosetPerLB,
                        thawingProcessApplied: thawingProcessApplied,
                        freezeOrUseByDate: freezeOrUseByDate,
                        sellByDate: sellByDate,
                        boxID: boxID,
                        effectiveDate: effectiveDate,
                        packDate: packDate,
                        shippingMark: shippingMark,
                        lotAvailableCases: lotAvailableCases
                    });
                }

                log.debug('lotNumberDetails', JSON.stringify(lotNumberDetails))
                return lotNumberDetails;
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

                var data = JSON.parse(context.value);

                var lotNumberRecordId = data.internalID;

                // load lot number record and update the values
                var lotNumberedRec = record.load({
                    type: 'inventorynumber',
                    id: lotNumberRecordId,
                    isDynamic: true
                });

                // set values to lot number record
                if (!isNullOrEmpty(data.expirationDate)) {
                    log.debug('formatted date', NSFormatDate(data.expirationDate));
                    lotNumberedRec.setValue('expirationdate', NSFormatDate(data.expirationDate));
                }
                if (!isNullOrEmpty(data.memo)) {
                    lotNumberedRec.setValue('memo', data.memo);
                }
                if (!isNullOrEmpty(data.availableSellDate)) {
                    log.debug('availableSellDate formatted date', NSFormatDate(data.availableSellDate));
                    lotNumberedRec.setValue('custitemnumber_pcg_tfi_lot_avail_sell', NSFormatDate(data.availableSellDate));
                }
                if (!isNullOrEmpty(data.chilledAge)) {
                    lotNumberedRec.setValue('custitemnumber_pcg_tfi_chilled_lot_age_days', data.chilledAge);
                }
                if (!isNullOrEmpty(data.lotActualCases)) {
                    lotNumberedRec.setValue('custitemnumber_pcg_tfi_case_box_count', data.lotActualCases);
                }
                if (!isNullOrEmpty(data.lotActualWeight)) {
                    lotNumberedRec.setValue('custitemnumber_pcg_tfi_catch_weight', data.lotActualWeight);
                }
                if (!isNullOrEmpty(data.ecoliCertificate)) {
                    lotNumberedRec.setValue('custitemnumber_pcg_tfi_ecoli_cert_number', data.ecoliCertificate);
                }
                if (!isNullOrEmpty(data.establishmentNumber)) {
                    lotNumberedRec.setValue('custitemnumber_pcg_tfi_establishment_number', data.establishmentNumber);
                }
                if (!isNullOrEmpty(data.everFrozen)) {
                    lotNumberedRec.setText('custitemnumber_pcg_tfi_ever_frozen_checkbox', data.everFrozen);
                }
                if (!isNullOrEmpty(data.lotProductAge)) {
                    lotNumberedRec.setValue('custitemnumber_pcg_tfi_lot_age_days_old', data.lotProductAge);
                }
                if (!isNullOrEmpty(data.lotInventoryCosetPerLB)) {
                    lotNumberedRec.setValue('custitemnumber_pcg_tfi_lot_cost_per_lb', data.lotInventoryCosetPerLB);
                }
                if (!isNullOrEmpty(data.thawingProcessApplied)) {
                    lotNumberedRec.setText('custitemnumber_pcg_tfi_thawing_applied', data.thawingProcessApplied);
                }
                if (!isNullOrEmpty(data.freezeOrUseByDate)) {
                    log.debug('freezeOrUseByDate formatted date', NSFormatDate(data.freezeOrUseByDate));
                    lotNumberedRec.setValue('custitemnumbertfi_freeze_use_by_date', NSFormatDate(data.freezeOrUseByDate));
                }
                if (!isNullOrEmpty(data.sellByDate)) {
                    log.debug('sellByDate formatted date', NSFormatDate(data.sellByDate));
                    lotNumberedRec.setValue('custitemnumbertfi_sell_by_date', NSFormatDate(data.sellByDate));
                }
                if (!isNullOrEmpty(data.boxID)) {
                    lotNumberedRec.setValue('custitemnumber_qssiph_box_id', data.boxID);
                }
                if (!isNullOrEmpty(data.effectiveDate)) {
                    log.debug('effectiveDate formatted date', NSFormatDate(data.effectiveDate));
                    lotNumberedRec.setValue('custitemnumber_qssiph_effective_date', NSFormatDate(data.effectiveDate));
                }
                if (!isNullOrEmpty(data.packDate)) {
                    log.debug('packDate formatted date', NSFormatDate(data.packDate));
                    lotNumberedRec.setValue('custitemnumber_qssiph_pack_date', NSFormatDate(data.packDate));
                }
                if (!isNullOrEmpty(data.expirationDate)) {
                    lotNumberedRec.setValue('custitemnumber_qssiph_shipping_mark', data.shippingMark);
                }
                if (!isNullOrEmpty(data.lotAvailableCases)) {
                    lotNumberedRec.setValue('custitemnumber_tfi_pcg_lot_avail_cases', data.lotAvailableCases);
                }

                // save record
                var lotNumberRecordId = lotNumberedRec.save(true, true);
                log.debug('lotNumberRecordId', lotNumberRecordId);

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

        var NSFormatDate = function (date) {
            // var d = new Date(date); // current date

            // var dd = d.getDate();
            // var mm = d.getMonth() + 1;
            // var yyyy = d.getFullYear();

            var d = date.split('-');

            var dd = d[1];
            var mm = d[0];
            var yyyy = d[2];

            var formattedDate = mm + "/" + dd + "/" + yyyy;

            var parseDate = format.parse({
                value: date, // formattedDate,
                type: format.Type.DATE
            });
            return parseDate;
        };

        return {
            getInputData: getInputData,
            map: map,
            summarize: summarize
        };

    });
