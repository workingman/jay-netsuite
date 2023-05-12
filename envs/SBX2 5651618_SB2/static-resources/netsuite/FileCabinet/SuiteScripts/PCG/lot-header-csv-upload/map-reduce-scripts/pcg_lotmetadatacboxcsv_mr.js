/**
 * @NApiVersion 2.1
 * @NScriptType MapReduceScript
 */
define([
    'N/file', 'N/record', 'N/search'
], (file, record, search) => {

    function getInputData() {

        let csvFile = null;

        try {
            csvFile = file.load({
                id: 'TFI Files/Lot Number Records/LotMetaDataCheckboxCSVUpload.csv'
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

            const inventoryNumberId = record.submitFields({
                type: record.Type.INVENTORY_NUMBER,
                id: inventoryNumberSearchResults[0].id,
                values: {
                      'custitemnumber_pcg_lot_hdr_noupdate_at_all': parseBool(csvFileValues[2]),
                     'custitemnumber_pcg_lot_hdr_caseqty_noupdate': parseBool(csvFileValues[3]),
                    'custitemnumber_pcg_lot_hdr_ratiolbcs_noupdat': parseBool(csvFileValues[4]),
                     'custitemnumber_pcg_lot_hdr_cost_lb_noupdate': parseBool(csvFileValues[5]),
                      'custitemnumber_pcg_lot_hdr_trx_missing_qty': parseBool(csvFileValues[6]),
                    'custitemnumber_pcg_lot_hdr_trx_missing_lotra': parseBool(csvFileValues[7]),
                    'custitemnumber_pcg_lot_hdr_trx_missing_costl': parseBool(csvFileValues[8])
                },
                options: {
                    ignoreMandatoryFields: true
                }
            });

            log.audit({
                title: 'Inventory Number Record ID',
                details: inventoryNumberId
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

    return {
        getInputData: getInputData,
        map: map,
        reduce: reduce,
        summarize: summarize
    };
});
