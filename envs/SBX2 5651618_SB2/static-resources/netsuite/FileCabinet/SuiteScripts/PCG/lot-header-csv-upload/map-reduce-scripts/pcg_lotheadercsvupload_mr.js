/**
 * @NApiVersion 2.1
 * @NScriptType MapReduceScript
 */
define([
    'N/file', 'N/format', 'N/record'
], (file, format, record) => {

    function getInputData() {

        let csvFile = null;

        try {
            csvFile = file.load({
                id: 'TFI Files/Lot Number Records/LotHeaderCSVUpload.csv'
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

            const csvValues = JSON.parse(reduceContext.values);

            const lotHeaderValues = {
                                             'expirationdate': parseDate(csvValues[3]),
                                                       'memo': csvValues[4]  || '',
                        'custitemnumber_pcg_tfi_catch_weight': csvValues[5]  || '',
                         'custitemnumberpcg_lot_avail_weight': csvValues[6]  || '',
                      'custitemnumber_pcg_tfi_case_box_count': csvValues[7]  || '',
                     'custitemnumber_tfi_pcg_lot_avail_cases': csvValues[8]  || '',
                  'custitemnumbertfi_pcg_initial_ratio_lb_cs': csvValues[9]  || '',
                     'custitemnumber_pcg_tfi_lot_cost_per_lb': csvValues[10] || '',
                            'custitemnumber_qssiph_pack_date': parseDate(csvValues[11]),
                    'custitemnumber_pcg_tfi_lot_age_days_old': csvValues[12] || '',
                             'custitemnumbertfi_sell_by_date': parseDate(csvValues[13]),
                      'custitemnumber_pcg_tfi_lot_avail_sell': parseDate(csvValues[14]),
                       'custitemnumber_qssiph_effective_date': parseDate(csvValues[15]),
                       'custitemnumbertfi_freeze_use_by_date': parseDate(csvValues[16]),
                'custitemnumber_pcg_tfi_chilled_lot_age_days': csvValues[17] || '',
                'custitemnumber_pcg_tfi_ever_frozen_checkbox': parseBool(csvValues[18]),
                     'custitemnumber_pcg_tfi_thawing_applied': parseBool(csvValues[19]),
                               'custitemnumber_qssiph_box_id': csvValues[20] || '',
                'custitemnumber_pcg_tfi_establishment_number': csvValues[21] || '',
                        'custitemnumber_qssiph_shipping_mark': csvValues[22] || '',
                   'custitemnumber_pcg_tfi_ecoli_cert_number': csvValues[23] || '',
                   'custitemnumber_tfi_pcg_source_trx_number': csvValues[24] || '',
                     'custitemnumber_tfi_pcg_source_trx_type': csvValues[25] || '',
                     'custitemnumber_tfi_pcg_source_location': csvValues[26] || '',
                     'custitemnumber_tfi_pcg_interface_notes': csvValues[27] || '',
                          'custitemnumber_tfi_pcg_source_tbd': csvValues[28] || ''
            };

            // Object.keys(lotHeaderValues).forEach((field) => {
            //     if (lotHeaderValues[field] === '') {
            //         delete lotHeaderValues[field];
            //     }
            // });

            const lotNumberRecordId = record.submitFields({
                type: record.Type.INVENTORY_NUMBER,
                id: csvValues[0],
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

    return {
        getInputData: getInputData,
        map: map,
        reduce: reduce,
        summarize: summarize
    };
});
