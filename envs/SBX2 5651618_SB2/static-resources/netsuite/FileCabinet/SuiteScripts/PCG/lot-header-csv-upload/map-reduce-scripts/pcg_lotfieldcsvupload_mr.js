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
                id: 'TFI Files/Lot Number Records/LotFieldCSVUpload.csv'
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

            let lotFieldLabel = '';

            const csvFile = file.load({
                id: 'TFI Files/Lot Number Records/LotFieldCSVUpload.csv'
            });

            csvFile.lines.iterator().each((line) => {

                const lotFieldLabels = line.value.split(',');

                lotFieldLabel = lotFieldLabels[2];

                return false;
            });

            const inventoryNumber = record.load({
                type: record.Type.INVENTORY_NUMBER,
                id: inventoryNumberSearchResults[0].id
            });

            const lotFieldIds = inventoryNumber.getFields();

            for (let i = 0; i < lotFieldIds.length; i++) {

                const lotField = inventoryNumber.getField({
                    fieldId: lotFieldIds[i]
                });

                if (lotField && lotField.label.trim().toLowerCase() == lotFieldLabel.trim().toLowerCase()) {

                    let lotFieldValue = csvFileValues[2];

                    if (lotField.type === format.Type.CHECKBOX) {
                        lotFieldValue = parseBool(lotFieldValue);
                    }

                    if (lotField.type === format.Type.DATE) {
                        lotFieldValue = parseDate(lotFieldValue);
                    }

                    if (lotField.type === format.Type.DATETIME || lotField.type === format.Type.DATETIMETZ) {
                        lotFieldValue = parseDatetime(lotFieldValue);
                    }

                    inventoryNumber.setValue({
                        fieldId: lotField.id,
                        value: lotFieldValue
                    });

                    const inventoryNumberId = inventoryNumber.save({
                        ignoreMandatoryFields: true
                    });

                    log.audit({
                        title: 'Inventory Number Record ID',
                        details: inventoryNumberId
                    });

                    break;
                }
            }
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
