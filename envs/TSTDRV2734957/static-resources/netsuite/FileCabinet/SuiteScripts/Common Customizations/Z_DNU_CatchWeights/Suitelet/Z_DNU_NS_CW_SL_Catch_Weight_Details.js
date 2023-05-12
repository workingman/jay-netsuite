/**
 * Copyright © 2020, Oracle and/or its affiliates. All rights reserved.
 * 2955 Campus Drive, Suite 100, San Mateo, CA, USA 94403-2511
 * All Rights Reserved.
 * 
 * This software is the confidential and proprietary information of NetSuite, Inc. ('Confidential Information').
 * You shall not disclose such Confidential Information and shall use it only in accordance with the terms of the license agreement
 * you entered into with NetSuite.
 */

/**
 * @NScriptType Suitelet
 * @NApiVersion 2.0
 */
define(['N/ui/serverWidget', 'N/runtime'], function(serverWidget, runtime) {
    var Helper = {};

    Helper.showForm = function(context) {
        var lots = JSON.parse(context.request.parameters.lots || '[]');
        var item = context.request.parameters.item;
        var quantity = context.request.parameters.quantity;

        var form = serverWidget.createForm({
            title: 'Catch Weight Detail',
            hideNavBar: true
        });

        form.addField({
            label: 'Item',
            id: 'item',
            type: serverWidget.FieldType.SELECT,
            source: 'item'
        }).updateDisplayType({
            displayType: serverWidget.FieldDisplayType.INLINE
        }).defaultValue = item;

        form.addField({
            label: 'Line Unit Quantity',
            id: 'quantity',
            type: serverWidget.FieldType.TEXT
        }).updateDisplayType({
            displayType: serverWidget.FieldDisplayType.INLINE
        }).defaultValue = quantity;

        form.addField({
            label: 'Lines Entered',
            id: 'linesentered',
            type: serverWidget.FieldType.INTEGER
        }).updateDisplayType({
            displayType: serverWidget.FieldDisplayType.INLINE
        });

        form.addField({
            label: 'Catch Weight',
            id: 'catchweight',
            type: serverWidget.FieldType.FLOAT
        }).updateDisplayType({
            displayType: serverWidget.FieldDisplayType.INLINE
        });

        form.addField({
            label: 'Weight Unit',
            id: 'weightunit',
            type: serverWidget.FieldType.TEXT
        }).updateDisplayType({
            displayType: serverWidget.FieldDisplayType.INLINE
        });

        form.addField({
            label: 'Lots',
            id: 'lots',
            type: serverWidget.FieldType.LONGTEXT
        }).updateDisplayType({
            displayType: serverWidget.FieldDisplayType.HIDDEN
        }).defaultValue = (context.request.parameters.lots || '');

        form.addField({
            label: 'Lot Internal IDs',
            id: 'lotids',
            type: serverWidget.FieldType.LONGTEXT
        }).updateDisplayType({
            displayType: serverWidget.FieldDisplayType.HIDDEN
        }).defaultValue = context.request.parameters.lotInternalIds;

        if (lots.length == 0) {
            lots.push('__none');
        } else if (lots.length == 1) {
            form.addField({
                label: 'Lot',
                id: 'lot',
                type: serverWidget.FieldType.TEXT
            }).updateDisplayType({
                displayType: serverWidget.FieldDisplayType.INLINE
            }).defaultValue = lots[0];
        }

        lots.forEach(function (lot, index) {
            var tabId = 'custtab_' + index;
            var sublistId = 'custlist_' + index;

            log.debug('sublistId', sublistId);

            form.addTab({
                label: lot,
                id: tabId
            });

            if (lots.length > 1) {
                form.addField({
                    label: 'Lot Quantity',
                    id: 'lotquantity_' + index,
                    container: tabId,
                    type: serverWidget.FieldType.INTEGER
                }).updateDisplayType({
                    displayType: serverWidget.FieldDisplayType.INLINE
                });
                form.addField({
                    label: 'Lot Weight',
                    id: 'lotweight_' + index,
                    container: tabId,
                    type: serverWidget.FieldType.FLOAT
                }).isMandatory = false;
                form.addField({
                    label: 'Lot GS1 Data',
                    id: 'lotgs1data_'+ index,
                    container: tabId,
                    type: serverWidget.FieldType.TEXTAREA
                });
            }
            var sublist = form.addSublist({
                label: lot,
                id: sublistId,
                tab: tabId,
                type: serverWidget.SublistType.INLINEEDITOR
            });

            sublist.addField({
                label: 'Weight',
                id: 'weight',
                type: serverWidget.FieldType.FLOAT
            }).isMandatory = true;

            sublist.addField({
                label: 'Other GS1 Data',
                id: 'gs1',
                type: serverWidget.FieldType.TEXTAREA
            }).isMandatory = false;
        });

        form.addButton({
            label: 'Submit',
            id: 'custpage_submit',
            functionName: 'submit'
        });

        form.addButton({
            label: 'Clear Details',
            id: 'custpage_clear_details',
            functionName: 'clearDetails'
        });

        form.clientScriptModulePath = '../Client/NS_CW_CS_Catch_Weight_Details.js';

        context.response.writePage(form);
    }

    var Suitelet = {};

    Suitelet.onRequest = function(context) {
        if (context.request.method == 'GET') {
            Helper.showForm(context);
        }
    }

    return Suitelet;
})