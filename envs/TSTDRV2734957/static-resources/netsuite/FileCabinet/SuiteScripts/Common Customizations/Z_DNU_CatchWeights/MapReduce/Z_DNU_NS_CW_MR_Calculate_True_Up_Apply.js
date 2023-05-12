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
 * @NApiVersion 2.0
 * @NScriptType MapReduceScript
 */
define(['N/search', 'N/record', 'N/runtime', '../Library/NS_CW_Constants'], function(search, record, runtime, constants) {
    var Helper = {};

    Helper.getLocationSubsidiaries = function(locations) {
        var subsidiarySearch = search.create({
            type: search.Type.SUBSIDIARY,
            columns: [
                'namenohierarchy'
            ]
        });

        var subsidiaries = {};
        subsidiarySearch.run().getRange(0,1000).forEach(function (result) {
            var name = result.getValue('namenohierarchy');
            subsidiaries[name] = result.id
        });

        var locationSearch = search.create({
            type: search.Type.LOCATION,
            filters: [
                search.createFilter({
                    name: 'internalid',
                    operator: search.Operator.ANYOF,
                    values: locations
                })
            ],
            columns: [
                search.createColumn({
                    name: 'subsidiary'
                })
            ]
        });

        var subsidiaryByLocation = {};
        
        locationSearch.run().getRange(0,1000).forEach(function (result) {
            var location = result.id;
            var subsidiaryName = result.getValue('subsidiary');
            var subsidiary = subsidiaries[subsidiaryName];
            subsidiaryByLocation[location] = subsidiary;
        });

        return subsidiaryByLocation;
    }

    Helper.getItemCogsAccounts = function(items) {
        var accountField = 'expenseaccount';

        // Get COGS accounts
        var cogsSearch = search.create({
            type: search.Type.ITEM,
            filters: [
                search.createFilter({
                    name: 'internalid',
                    operator: search.Operator.ANYOF,
                    values: items
                })
            ],
            columns: [
                search.createColumn({
                    name: accountField
                })
            ]
        });

        var itemCogs = {};

        cogsSearch.run().getRange(0,1000).forEach(function (result) {
            itemCogs[result.id] = result.getValue(accountField);
        });

        return itemCogs;
    }

    Helper.createJournalEntry = function(data) {
        var location = data.location;
        var sublistId = 'line';
        var scriptObj = runtime.getCurrentScript();
        var expenseAccount = scriptObj.getParameter('custscript_nsts_cw_true_up_exp_acct');
        
        // Create Journal Entry
        // We need to loop over the Item and Lot combinations to add lines to the Journal Entry
        var journalEntry = record.create({
            type: record.Type.JOURNAL_ENTRY,
            isDynamic: true
        });

        journalEntry.setValue({
            fieldId: 'subsidiary',
            value: data.subsidiary
        });

        journalEntry.setValue({
            fieldId: 'approval',
            value: 1
        });

        data.dataToProcess.forEach(function (part, index) {
            var cogsAccount = part.cogsAccount;
            var cogsAdjustment = parseFloat(part.cogsAdjustment);
            var debitAccount, creditAccount;
            var lineAmount = Math.abs(cogsAdjustment).toFixed(2);;

            if (cogsAdjustment < 0) {
                creditAccount = cogsAccount;
                debitAccount = expenseAccount;
            } else {
                creditAccount = expenseAccount;
                debitAccount = cogsAccount;
            }

            journalEntry.selectNewLine({
                sublistId: sublistId
            });

            journalEntry.setCurrentSublistValue({
                sublistId: sublistId,
                fieldId: 'account',
                value: creditAccount
            });

            journalEntry.setCurrentSublistValue({
                sublistId: sublistId,
                fieldId: 'location',
                value: location
            });

            journalEntry.setCurrentSublistValue({
                sublistId: sublistId,
                fieldId: 'credit',
                value: lineAmount
            });
            
            journalEntry.commitLine({
                sublistId: sublistId
            });

            journalEntry.selectNewLine({
                sublistId: sublistId
            });

            journalEntry.setCurrentSublistValue({
                sublistId: sublistId,
                fieldId: 'account',
                value: debitAccount
            });

            journalEntry.setCurrentSublistValue({
                sublistId: sublistId,
                fieldId: 'location',
                value: location
            });

            journalEntry.setCurrentSublistValue({
                sublistId: sublistId,
                fieldId: 'debit',
                value: lineAmount
            });
            
            journalEntry.commitLine({
                sublistId: sublistId
            });

            part.transLineId = index;
        });

        var journalEntryId = journalEntry.save();
        return journalEntryId;
    }

    Helper.createTrueUpLedgers = function(options) {
        var data = options.data;
        var journalEntryId = options.journalEntryId;
        var location = data.location;
        var context = options.context;

        // Create True Up Ledgers referencing Journal Entry
        // For each Item and Lot combination we need to make the Ledger
        data.dataToProcess.forEach(function (data) {
            var item = data.item;
            var lot = data.lot;
            var weightOnHand = parseFloat(data.weightOnHand);
            var transLineId = data.transLineId;

            var ledgerRecord = record.create({
                type: constants.RecordType.WeightLedger.ID
            });

            ledgerRecord.setValue({
                fieldId: constants.RecordType.WeightLedger.Fields.LOCATION,
                value: location
            });

            ledgerRecord.setValue({
                fieldId: constants.RecordType.WeightLedger.Fields.ITEM,
                value: item
            });

            if (lot) {
                ledgerRecord.setValue({
                    fieldId: constants.RecordType.WeightLedger.Fields.LOT,
                    value: lot
                });
            }

            ledgerRecord.setValue({
                fieldId: constants.RecordType.WeightLedger.Fields.QUANTITY_IN_BASE_UNITS,
                value: 0
            });

            ledgerRecord.setValue({
                fieldId: constants.RecordType.WeightLedger.Fields.ACTUAL_WEIGHT,
                value: -weightOnHand
            });

            if (journalEntryId) {
                ledgerRecord.setValue({
                    fieldId: constants.RecordType.WeightLedger.Fields.DOCUMENT_NUMBER,
                    value: journalEntryId
                });
            }

            if (transLineId != undefined) {
                ledgerRecord.setValue({
                    fieldId: constants.RecordType.WeightLedger.Fields.LINE_KEY,
                    value: transLineId
                });
            }

            ledgerRecord.setValue({
                fieldId: constants.RecordType.WeightLedger.Fields.ON_HAND_WEIGHT,
                value: 0
            });

            ledgerRecord.setValue({
                fieldId: constants.RecordType.WeightLedger.Fields.WEIGHT_VALUE,
                value: 0
            });

            ledgerRecord.setValue({
                fieldId: constants.RecordType.WeightLedger.Fields.IS_TRUE_UP,
                value: true
            });

            data.ledgerRecordId = ledgerRecord.save();

            // Pass this info into reduce step to update other ledgers related to this True Up Ledger entry
            context.write(data.ledgerRecordId, data);
        });
    }

    var MapReduce = {};

    MapReduce.getInputData = function() {
        // Get the data to process passed in as a parameter
        var scriptObj = runtime.getCurrentScript();
        var dataToProcess = scriptObj.getParameter('custscript_nsts_cw_true_up_data');
        var data = JSON.parse(dataToProcess);

        // Get all the locations so we can get the Subsidiary
        var locations = data.map(function (element) {
            return element.location;
        });

        var subsidiaryByLocation = Helper.getLocationSubsidiaries(locations);

        // Get all the items so we can get the COGS accounts
        var items = data.map(function (element) {
            return element.item;
        });

        var itemCogs = Helper.getItemCogsAccounts(items);

        var dataByLocation = {};
        data.forEach(function (element) {
            var location = element.location;
            if (!dataByLocation[location]) {
                dataByLocation[location] = {
                    subsidiary: subsidiaryByLocation[location],
                    location: location,
                    dataToProcess: []
                };
            }
            element.cogsAccount = itemCogs[element.item];
            dataByLocation[location].dataToProcess.push(element);
        });

        return Object.keys(dataByLocation).map(function (location) {
            return dataByLocation[location];
        });
    }

    MapReduce.map = function(context) {
        try {
            var data = JSON.parse(context.value);
            log.debug('data', context.value);

            // Get expense account parameter from script
            var scriptObj = runtime.getCurrentScript();
            var createJournalEntry = scriptObj.getParameter('custscript_nsts_cw_true_up_jrnl') == 'T';

            log.debug('createJournalEntry', createJournalEntry);

            var journalEntryId;

            if (createJournalEntry) {
                journalEntryId = Helper.createJournalEntry(data);
            } else {
                log.debug('not making journal');
            }

            log.debug('journalEntryId', journalEntryId);

            Helper.createTrueUpLedgers({
                data: data,
                journalEntryId: journalEntryId,
                context: context
            });
        } catch (e) {
            log.error('e', JSON.stringify(e));
        }
    }

    MapReduce.reduce = function(context) {
        log.debug('context', JSON.stringify(context));
    }

    return MapReduce;
});