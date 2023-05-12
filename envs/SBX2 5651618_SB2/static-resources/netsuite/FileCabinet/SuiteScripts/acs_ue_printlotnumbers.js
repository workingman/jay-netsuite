/**
 * @NApiVersion 2.1
 * @NScriptType UserEventScript
 */
define(['N/search', 'N/record', 'N/ui/serverWidget'],
    /**
     * @param{search} search
     */
    (s, r, sWidget) => {
    /**
     * Defines the function definition that is executed before record is loaded.
     * @param {Object} scriptContext
     * @param {Record} scriptContext.newRecord - New record
     * @param {string} scriptContext.type - Trigger type; use values from the context.UserEventType enum
     * @param {Form} scriptContext.form - Current form
     * @param {ServletRequest} scriptContext.request - HTTP request information sent from the browser for a client action only.
     * @since 2015.2
     */
    const beforeLoad = (context) => {

        log.debug("context.type", context.type);

        //Retrieves the internal ID of the po when user selects print
        if (context.type == context.UserEventType.PRINT && context.newRecord.id) {
            var po = r.load({
                type: context.newRecord.type,
                id: context.newRecord.id
            })
                var poId = po.id;

            if (poId) {

                var lineCount = po.getLineCount({
                    sublistId: 'item'
                });

                var lotNumberInfo = new Array();

                //Loop through searchResults
                for (var i = 0; i < lineCount; i++) {

                    var lineno = po.getSublistValue({
                        sublistId: 'item',
                        fieldId: 'line',
                        line: i
                    })

                        var inventoryDetail = po.getSublistSubrecord({
                            sublistId: 'item',
                            fieldId: 'inventorydetail',
                            line: i
                        });

                    var lotnum = inventoryDetail.getSublistValue({
                        sublistId: 'inventoryassignment',
                        fieldId: 'numberedrecordid',
                        line: 0
                    });

                    log.debug('lotnum', lotnum);

                    /* log.debug('numberedrecordid', inventoryDetail.getSublistValue({
                    sublistId: 'inventoryassignment',
                    fieldId: 'numberedrecordid',
                    line: i
                    })); */

                    if (isEmpty(lotnum))
                        continue;

                    //log.debug('inventoryassignmentfields: '  , inventoryDetail.getSublistFields({sublistId: 'inventoryassignment'}).join(','))
                    log.debug(' r.Type.INVENTORY_NUMBER', r.Type.INVENTORY_NUMBER)
                    var lotNumRec = r.load({
                        type: r.Type.INVENTORY_NUMBER,
                        id: lotnum
                    });

                    var boxid = lotNumRec.getValue({
                        fieldId: 'custitemnumber_qssiph_shipping_mark'
                    });
                    var shippingmark = lotNumRec.getValue({
                        fieldId: 'custitemnumber_qssiph_shipping_mark'
                    });
                    var est = lotNumRec.getValue({
                        fieldId: 'custitemnumber_pcg_tfi_establishment_number'
                    });

                    //Push Lot Number data
                    var infoToBePushed = {
                        'lineno': lineno,
                        'boxid': boxid,
                        'shippingmark': shippingmark,
                        'est': est
                    };
                    lotNumberInfo.push(infoToBePushed);
                }

                //Creates a new form on the record to store the Objs
                var currentForm = context.form;
                var printField = currentForm.addField({
                    id: 'custpage_po_data',
                    type: sWidget.FieldType.LONGTEXT,
                    label: 'po Data'
                });

                log.debug('lotNumberInfo: ', lotNumberInfo.join(","));

                printField.defaultValue = JSON.stringify(lotNumberInfo);

                log.debug("po ID: ", poId);
                log.debug("Print Field", printField.defaultValue);
                log.debug("context.type", context.type);

            }

        }
    }

    function isEmpty(value) {
        if (value === '' || value === null || value === undefined)
            return true;

        value = new String(value).trim();
        return (value.length == 0)
    }

    return {
        beforeLoad
    }
});