
/**
 *@NApiVersion 2.x
 *@NScriptType ClientScript
 */
define(['N/currentRecord', 'N/search'],
    function (currentRecord, search) {

        function pageInit(context) {
            try {
                var poRec = currentRecord.get();
                var poId = poRec.id;
                log.debug("poId", poId);

                var poNumber = poRec.getValue("tranid"); 
                var lineUniqueNumber = "";

                log.debug("poNumber" , poNumber);

                // get the line count
                var poLineCount = poRec.getLineCount({
                    sublistId: "item"
                });

                log.debug("poLineCount", poLineCount);
                for (var i = 0; i < poLineCount; i++) {
                    poRec.selectLine({
                        sublistId: 'item',
                        line: i
                    });

                    lineUniqueNumber =  poRec.getCurrentSublistValue({
                        sublistId: 'item',
                        fieldId: 'lineuniquekey'
                    });

                    log.debug("lineUniqueNumber" , lineUniqueNumber);

                   var quantity =  poRec.getCurrentSublistValue({
                        sublistId: 'item',
                        fieldId: 'quantity'
                    });
                   
                    var subRecord = poRec.getCurrentSublistSubrecord({
                        sublistId: "item",
                        fieldId: 'inventorydetail',
                    });
                    log.debug('subRecord', JSON.stringify(subRecord));

                    var inventoryLineCount = subRecord.getLineCount('inventoryassignment');
                    log.debug("inventoryLineCount", inventoryLineCount);
                    // for (var j = inventoryLineCount - 1; j >= 0; j--) {

                    //     subRecord.selectLine({
                    //         sublistId: 'inventoryassignment',
                    //         line: j
                    //     });
                    //     var item = subRecord.getCurrentSublistValue({
                    //         sublistId: 'inventoryassignment',
                    //         fieldId: 'inventorynumber'
                    //     });
                    //     log.debug("item-in subrecord", item);



                    //     // log.debug("j", j);
                    //     // subRecord.removeLine({
                    //     //     sublistId: 'inventoryassignment',
                    //     //     line: j
                    //     // })
                    // }
                    subRecord.selectNewLine({
                        "sublistId": 'inventoryassignment'
                    });

                    subRecord.setCurrentSublistValue({
                        sublistId: 'inventoryassignment',
                        fieldId: 'inventorynumber',
                        value: poNumber +'-'+lineUniqueNumber,
                      
                    });
                    subRecord.setCurrentSublistValue({
                        sublistId: 'inventoryassignment',
                        fieldId: 'quantity',
                        value: quantity,
                    });

                }

            } catch (error) {
                alert("ERROR: " + error);
            }
        }

        return {
            pageInit: pageInit,
        };
    });
