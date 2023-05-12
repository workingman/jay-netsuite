/**
 * @NApiVersion 2.1
 * @NScriptType UserEventScript
 */
define([
    'N/record', 'N/search'
], (record, search) => {

    function afterSubmit(context) {
        try {
            if (context.type === context.UserEventType.CREATE || context.type === context.UserEventType.EDIT) {

                const workOrderType = context.newRecord.getValue({
                    fieldId: 'custbody_pcg_woic_linked_trx_type'
                });

                const lineCount = context.newRecord.getLineCount({
                    sublistId: 'line'
                });

                if (workOrderType === '54') { // Work Order Completion
                    setLotHeaderStaticValues({
                        woxWoExtension: context.newRecord,
                        lineCount: lineCount
                    });
                }
                
                if (workOrderType === '53' || workOrderType === '54') { // Work Order Issue, Work Order Completion
                    setLotHeaderDynamicValues({
                        woxWoExtension: context.newRecord,
                        lineCount: lineCount
                    });
                }
            }
        } catch (e) {
            log.error({title: 'After Submit', details: e});
        }
    }

    function getTransactionActualCases(dataIn) {

        const lotNumbers = dataIn.lotNumbers;

        const transactionActualCases = {};

        const transactionSearch = search.create({
            type: search.Type.TRANSACTION,
            filters: [[
                'type', search.Operator.ANYOF, 'InvAdjst', 'ItemRcpt', 'ItemShip'
            ], 'AND', [
                'itemnumber.internalid', search.Operator.ANYOF, lotNumbers
            ]],
            columns: [
                search.createColumn({
                    name: 'internalid',
                    join: 'itemNumber',
                    summary: search.Summary.GROUP
                }),
                search.createColumn({
                    name: 'inventorynumber',
                    join: 'itemNumber',
                    summary: search.Summary.GROUP
                }),
                search.createColumn({
                    name: 'formulanumeric',
                    summary: search.Summary.SUM,
                    formula: "CASE WHEN {type}='Item Fulfillment' THEN {custcol_pcg_tfi_actual_case_count}*-1 ELSE {custcol_pcg_tfi_actual_case_count} END"
                }),
            ]
        });

        const transactionSearchResults = transactionSearch.runPaged({
            pageSize: 1000
        });

        transactionSearchResults.pageRanges.forEach((pageRange) => {

            const page = transactionSearchResults.fetch({
                index: pageRange.index
            });

            page.data.forEach((result) => {

                const lotNumberId = result.getValue({
                    name: 'internalid',
                    join: 'itemNumber',
                    summary: search.Summary.GROUP
                });

                const actualCaseCount = result.getValue({
                    name: 'formulanumeric',
                    summary: search.Summary.SUM,
                    formula: "CASE WHEN {type}='Item Fulfillment' THEN {custcol_pcg_tfi_actual_case_count}*-1 ELSE {custcol_pcg_tfi_actual_case_count} END"
                });

                transactionActualCases[lotNumberId] = parseFloat(actualCaseCount);
            });
        });

        return transactionActualCases;
    }

    function getWoxWoExtensionActualCases(dataIn) {

        const lotNumbers = dataIn.lotNumbers;

        const woxWoExtensionActualCaseCounts = {};

        const woxWoExtensionSearch = search.create({
            type: search.Type.TRANSACTION,
            filters: [[
                'type', search.Operator.IS, 'Custom112'
            ], 'AND', [
                'custcol_pcg_woic_line_lot_number.internalid', search.Operator.ANYOF, lotNumbers
            ]],
            columns: [
                search.createColumn({
                    name: 'internalid',
                    join: 'custcol_pcg_woic_line_lot_number',
                    summary: search.Summary.GROUP
                }),
                search.createColumn({
                    name: 'custcol_pcg_tfi_actual_case_count',
                    summary: search.Summary.SUM
                })
            ]
        });

        const woxWoExtensionSearchResults = woxWoExtensionSearch.runPaged({
            pageSize: 1000
        });

        woxWoExtensionSearchResults.pageRanges.forEach((pageRange) => {

            const page = woxWoExtensionSearchResults.fetch({
                index: pageRange.index
            });

            page.data.forEach((result) => {

                const lotNumberId = result.getValue({
                    name: 'internalid',
                    join: 'custcol_pcg_woic_line_lot_number',
                    summary: search.Summary.GROUP
                });

                const actualCaseCount = result.getValue({
                    name: 'custcol_pcg_tfi_actual_case_count',
                    summary: search.Summary.SUM
                });

                woxWoExtensionActualCaseCounts[lotNumberId] = parseFloat(actualCaseCount);
            });
        });

        return woxWoExtensionActualCaseCounts;
    }

    function setLotHeaderStaticValues(dataIn) {

        const woxWoExtension = dataIn.woxWoExtension;
        const lineCount = dataIn.lineCount;

        for (let i = 0; i < lineCount; i++) {

            const inventoryNumberId = woxWoExtension.getSublistValue({
                sublistId: 'line',
                fieldId: 'custcol_pcg_woic_line_lot_number',
                line: i
            });

            const inventoryNumberLookup = search.lookupFields({
                type: search.Type.INVENTORY_NUMBER,
                id: inventoryNumberId,
                columns: [
                    'custitemnumber_pcg_tfi_static_data_first'
                ]
            });

            if (!inventoryNumberLookup['custitemnumber_pcg_tfi_static_data_first']) {
                const initialLotRatio = woxWoExtension.getSublistValue({
                    sublistId: 'line',
                    fieldId: 'custcol_pcg_initial_ratio_lb_cs',
                    line: i
                });

                const lotInventoryCost = woxWoExtension.getSublistValue({
                    sublistId: 'line',
                    fieldId: 'custcol_pcg_tfi_lot_cost_per_lb',
                    line: i
                });

                const packDate = woxWoExtension.getSublistValue({
                    sublistId: 'line',
                    fieldId: 'custcol_qssiph_pack_date',
                    line: i
                });

                const sellByDate = woxWoExtension.getSublistValue({
                    sublistId: 'line',
                    fieldId: 'custcol_pcg_tfi_sell_by_date',
                    line: i
                });

                const availableToSellDate = woxWoExtension.getSublistValue({
                    sublistId: 'line',
                    fieldId: 'custcol_pcg_tfi_lot_avail_sell',
                    line: i
                });

                const effectiveDate = woxWoExtension.getSublistValue({
                    sublistId: 'line',
                    fieldId: 'custcol_qssiph_effective_date',
                    line: i
                });

                const freezeOrUseByDate = woxWoExtension.getSublistValue({
                    sublistId: 'line',
                    fieldId: 'custcol_tfi_freeze_use_by_date',
                    line: i
                });

                const everFrozen = woxWoExtension.getSublistValue({
                    sublistId: 'line',
                    fieldId: 'custcol_pcg_tfi_ever_frozen_checkbox',
                    line: i
                });

                const boxId = woxWoExtension.getSublistValue({
                    sublistId: 'line',
                    fieldId: 'custcol_qssiph_box_id',
                    line: i
                });

                const establishmentNumber = woxWoExtension.getSublistValue({
                    sublistId: 'line',
                    fieldId: 'custcol_pcg_tfi_establishment_number',
                    line: i
                });

                const shippingMark = woxWoExtension.getSublistValue({
                    sublistId: 'line',
                    fieldId: 'custcol_qssiph_shipping_mark',
                    line: i
                });

                const eColiCertificate = woxWoExtension.getSublistValue({
                    sublistId: 'line',
                    fieldId: 'custcol_pcg_tfi_ecoli_cert_number',
                    line: i
                });

                const inventoryNumberValues = {
                    'custitemnumbertfi_pcg_initial_ratio_lb_cs': initialLotRatio,
                    'custitemnumber_pcg_tfi_lot_cost_per_lb': lotInventoryCost,
                    'custitemnumber_qssiph_pack_date': packDate,
                    'custitemnumbertfi_sell_by_date': sellByDate,
                    'custitemnumber_pcg_tfi_lot_avail_sell': availableToSellDate,
                    'custitemnumber_qssiph_effective_date': effectiveDate,
                    'custitemnumbertfi_freeze_use_by_date': freezeOrUseByDate,
                    'custitemnumber_pcg_tfi_ever_frozen_checkbox': everFrozen,
                    'custitemnumber_qssiph_box_id': boxId,
                    'custitemnumber_pcg_tfi_establishment_number': establishmentNumber,
                    'custitemnumber_qssiph_shipping_mark': shippingMark,
                    'custitemnumber_pcg_tfi_ecoli_cert_number': eColiCertificate,
                    'custitemnumber_pcg_tfi_static_data_first': new Date(),
                    'custitemnumber_pcg_tfi_static_data_last': new Date()
                };

                record.submitFields({
                    type: record.Type.INVENTORY_NUMBER,
                    id: inventoryNumberId,
                    values: inventoryNumberValues,
                    options: {
                        ignoreMandatoryFields: true
                    }
                });
            }
        }
    }

    function setLotHeaderDynamicValues(dataIn) {

        const woxWoExtension = dataIn.woxWoExtension;
        const lineCount = dataIn.lineCount;

        const lotNumbers = [];

        for (let i = 0; i < lineCount; i++) {
            lotNumbers.push(woxWoExtension.getSublistValue({
                sublistId: 'line',
                fieldId: 'custcol_pcg_woic_line_lot_number',
                line: i
            }));
        }

        const transactionActualCases = getTransactionActualCases({
            lotNumbers: lotNumbers
        });

        log.debug({title: 'transactionActualCases', details: transactionActualCases});

        const woxWoExtensionActualCases = getWoxWoExtensionActualCases({
            lotNumbers: lotNumbers
        });

        log.debug({title: 'woxWoExtensionActualCases', details: woxWoExtensionActualCases});

        for (let i = 0; i < lineCount; i++) {

            const inventoryNumberId = woxWoExtension.getSublistValue({
                sublistId: 'line',
                fieldId: 'custcol_pcg_woic_line_lot_number',
                line: i
            });

            const inventoryNumber = record.load({
                type: record.Type.INVENTORY_NUMBER,
                id: inventoryNumberId
            });

            const doNotUpdate = inventoryNumber.getValue({
                fieldId: 'custitemnumber_pcg_lot_hdr_noupdate_at_all'
            });

            if (doNotUpdate) {
                continue;
            }

            const initialLotRatio = inventoryNumber.getValue({
                fieldId: 'custitemnumbertfi_pcg_initial_ratio_lb_cs'
            });

            const firstDynamicDataUpdate = inventoryNumber.getValue({
                fieldId: 'custitemnumber_pcg_tfi_dynamic_data_first'
            });

            let actualWeight = 0;
            let availableWeight = 0;
            let actualCases = 0;

            const locationCount = inventoryNumber.getLineCount({
                sublistId: 'locations'
            });

            for (let j = 0; j < locationCount; j++) {

                actualWeight += parseFloat(inventoryNumber.getSublistValue({
                    sublistId: 'locations',
                    fieldId: 'quantityonhandbase',
                    line: j
                }));

                availableWeight += parseFloat(inventoryNumber.getSublistValue({
                    sublistId: 'locations',
                    fieldId: 'quantityavailablebase',
                    line: j
                }));
            }

            if (!firstDynamicDataUpdate || (new Date(firstDynamicDataUpdate).getTime() > new Date('2023-04-22T00:00:00.000Z').getTime())) {
                actualCases = Math.ceil((transactionActualCases[inventoryNumberId] || 0) + (woxWoExtensionActualCases[inventoryNumberId] || 0));
            } else {
                actualCases = Math.ceil(actualWeight / initialLotRatio);
            }

            const availableCases = Math.ceil((availableWeight / actualWeight) * actualCases) || 0;

            inventoryNumber.setValue({
                fieldId: 'custitemnumber_pcg_tfi_catch_weight',
                value: actualWeight
            });

            inventoryNumber.setValue({
                fieldId: 'custitemnumberpcg_lot_avail_weight',
                value: availableWeight
            });

            inventoryNumber.setValue({
                fieldId: 'custitemnumber_pcg_tfi_case_box_count',
                value: actualCases
            });

            inventoryNumber.setValue({
                fieldId: 'custitemnumber_tfi_pcg_lot_avail_cases',
                value: availableCases
            });

            if (!firstDynamicDataUpdate) {
                inventoryNumber.setValue({
                    fieldId: 'custitemnumber_pcg_tfi_dynamic_data_first',
                    value: new Date()
                });
            }

            inventoryNumber.setValue({
                fieldId: 'custitemnumber_pcg_tfi_dynamic_data_last',
                value: new Date()
            });

            inventoryNumber.save({
                ignoreMandatoryFields: true
            });
        }
    }

    return {
        afterSubmit: afterSubmit
    };
});
