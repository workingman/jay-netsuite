/**
 * @NApiVersion 2.1
 * @NScriptType MapReduceScript
 */
define([
    'N/file', 'N/format', 'N/record', 'N/search'
], (file, format, record, search) => {

    function getInputData() {

        let csvFile = null;

        try {
            csvFile = file.load({
                id: 'TFI Files/Lot Number Records/LotCSVUpload.csv'
            });
        } catch (e) {
            log.error({
                title: 'Get Input Data',
                details: e
            });
        }

        return csvFile;
    }

    function map(mapContext) {
        try {
            if (mapContext.key !== '0') {
                mapContext.write({
                    key: mapContext.key,
                    value: mapContext.value.split(',')
                });
            }
        } catch (e) {
            log.error({
                title: 'Map',
                details: e
            });
        }
    }

    function reduce(reduceContext) {
        try {

            const csvFileValues = JSON.parse(reduceContext.values);

            const itemName        = csvFileValues[0];
            const serialLotNumber = csvFileValues[1];

            const inventoryNumberSearch = search.create({
                type: search.Type.INVENTORY_NUMBER,
                filters: [[
                    'item.name', search.Operator.CONTAINS, itemName
                ], 'AND', [
                    'inventorynumber', search.Operator.IS, serialLotNumber
                ]]
            });

            const inventoryNumberSearchResults = inventoryNumberSearch.run().getRange({
                start: 0,
                end: 1
            });

            const lotHeaderValues = {
                                              'expirationdate': parseDate(csvFileValues[2]),
                                                        'memo': csvFileValues[3] || '',
                         'custitemnumber_pcg_tfi_catch_weight': csvFileValues[4] || '',
                          'custitemnumberpcg_lot_avail_weight': csvFileValues[5] || '',
                       'custitemnumber_pcg_tfi_case_box_count': csvFileValues[6] || '',
                      'custitemnumber_tfi_pcg_lot_avail_cases': csvFileValues[7] || '',
                   'custitemnumbertfi_pcg_initial_ratio_lb_cs': csvFileValues[8] || '',
                      'custitemnumber_pcg_tfi_lot_cost_per_lb': csvFileValues[9] || '',
                             'custitemnumber_qssiph_pack_date': parseDate(csvFileValues[10]),
                     'custitemnumber_pcg_tfi_lot_age_days_old': csvFileValues[11] || '',
                              'custitemnumbertfi_sell_by_date': parseDate(csvFileValues[12]),
                       'custitemnumber_pcg_tfi_lot_avail_sell': parseDate(csvFileValues[13]),
                        'custitemnumber_qssiph_effective_date': parseDate(csvFileValues[14]),
                        'custitemnumbertfi_freeze_use_by_date': parseDate(csvFileValues[15]),
                 'custitemnumber_pcg_tfi_chilled_lot_age_days': csvFileValues[16] || '',
                 'custitemnumber_pcg_tfi_ever_frozen_checkbox': parseBool(csvFileValues[17]),
                      'custitemnumber_pcg_tfi_thawing_applied': parseBool(csvFileValues[18]),
                                'custitemnumber_qssiph_box_id': csvFileValues[19] || '',
                 'custitemnumber_pcg_tfi_establishment_number': csvFileValues[20] || '',
                         'custitemnumber_qssiph_shipping_mark': csvFileValues[21] || '',
                    'custitemnumber_pcg_tfi_ecoli_cert_number': csvFileValues[22] || '',
                    'custitemnumber_tfi_pcg_source_trx_number': csvFileValues[23] || '',
                      'custitemnumber_tfi_pcg_source_trx_type': csvFileValues[24] || '',
                      'custitemnumber_tfi_pcg_source_location': csvFileValues[25] || '',
                      'custitemnumber_pcg_tfi_first_trx_line_id': csvFileValues[26] || '',
                      'custitemnumber_tfi_pcg_interface_notes': csvFileValues[27] || '',
                           'custitemnumber_tfi_pcg_source_tbd': csvFileValues[28] || '',
                    'custitemnumber_pcg_tfi_static_data_first': parseDatetime(csvFileValues[29]),
                     'custitemnumber_pcg_tfi_static_data_last': parseDatetime(csvFileValues[30]),
                   'custitemnumber_pcg_tfi_dynamic_data_first': parseDatetime(csvFileValues[31]),
                    'custitemnumber_pcg_tfi_dynamic_data_last': parseDatetime(csvFileValues[32]),
                  'custitemnumber_pcg_lot_hdr_noupdate_at_all': parseBool(csvFileValues[33]),
                 'custitemnumber_pcg_lot_hdr_caseqty_noupdate': parseBool(csvFileValues[34]),
                'custitemnumber_pcg_lot_hdr_ratiolbcs_noupdat': parseBool(csvFileValues[35]),
                 'custitemnumber_pcg_lot_hdr_cost_lb_noupdate': parseBool(csvFileValues[36]),
                  'custitemnumber_pcg_lot_hdr_trx_missing_qty': parseBool(csvFileValues[37]),
                'custitemnumber_pcg_lot_hdr_trx_missing_lotra': parseBool(csvFileValues[38]),
                'custitemnumber_pcg_lot_hdr_trx_missing_costl': parseBool(csvFileValues[39]),
                  'custitemnumber_qssiph_chilled_age_last_upd': parseDate(csvFileValues[40]),
                                      'custitemnumber_tfi_ttf': parseBool(csvFileValues[41]),
                                      'custitemnumber_tfi_ttc': parseBool(csvFileValues[42])
            };

            // Object.keys(lotHeaderValues).forEach((field) => {
            //     if (lotHeaderValues[field] === '') {
            //         delete lotHeaderValues[field];
            //     }
            // });

            const lotNumberRecordId = record.submitFields({
                type: record.Type.INVENTORY_NUMBER,
                id: inventoryNumberSearchResults[0].id,
                values: lotHeaderValues,
                options: {
                    ignoreMandatoryFields: true
                }
            });

            log.audit({
                title: 'Lot Number Record ID',
                details: lotNumberRecordId
            });
        } catch (e) {
            log.error({
                title: 'CSV Line: ' + (parseInt(reduceContext.key) + 1),
                details: e
            });
        }
    }

    function summarize() {}

    function parseBool(dataIn) {

        let parsedBool = '';

        switch (dataIn.toLowerCase()) {
            case 'f':
            case 'false':
            case 'n':
            case 'no':
                parsedBool = false;
                break;
            case 't':
            case 'true':
            case 'y':
            case 'yes':
                parsedBool = true;
                break;
            default:
                parsedBool = ''
        }

        return parsedBool;
    }

    function parseDate(dataIn) {

        let parsedDate = '';

        if (dataIn) {

            parsedDate = dataIn.replaceAll('-', '/');

            parsedDate = format.parse({
                type: format.Type.DATE,
                value: parsedDate
            });
        }

        return parsedDate;
    }

    function parseDatetime(dataIn) {

        let parsedDatetime = '';

        if (dataIn) {

            parsedDatetime = new Date(dataIn);

            parsedDatetime = format.parse({
                type: format.Type.DATETIME,
                value: parsedDatetime
            });
        }

        return parsedDatetime;
    }

    return {
        getInputData: getInputData,
        map: map,
        reduce: reduce,
        summarize: summarize
    };
});
