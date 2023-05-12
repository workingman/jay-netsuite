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
define(['N/file', 'N/search', 'N/ui/serverWidget', 'N/url', 'N/task', '../Library/NS_CW_Constants'], function(file, search, serverWidget, url, task, constants) {
    var Helper = {};

    Helper.addSublistFields = function(sublist) {
        sublist.addField({
            id: 'item',
            label: 'Item',
            type: serverWidget.FieldType.SELECT,
            source: 'item'
        });

        sublist.addField({
            id: 'location',
            label: 'Location',
            type: serverWidget.FieldType.SELECT,
            source: 'location'
        }).updateDisplayType({
            displayType: serverWidget.FieldDisplayType.DISABLED
        });

        sublist.addField({
            id: 'lot',
            label: 'Lot',
            type: serverWidget.FieldType.SELECT,
            source: 'inventorynumber'
        }).updateDisplayType({
            displayType: serverWidget.FieldDisplayType.DISABLED
        });

        sublist.addField({
            id: 'weightonhand',
            label: 'Weight On Hand',
            type: serverWidget.FieldType.FLOAT
        }).updateDisplayType({
            displayType: serverWidget.FieldDisplayType.DISABLED
        });

        sublist.addField({
            id: 'cogs_adjustment',
            label: 'COGS Adjustment',
            type: serverWidget.FieldType.CURRENCY
        }).updateDisplayType({
            displayType: serverWidget.FieldDisplayType.DISABLED
        });
    }

    Helper.checkProcessingStatus = function(assistant){
        var logTitle = 'CheckProcessingStatus';
        log.debug(logTitle, 'Checking Processing Status');
        var processingStep = assistant.getStep({id: 'pretrueupprocessing'});
        var skipProcessingValue = processingStep.getValue({id: 'custpage_skip_processing'});
        if(skipProcessingValue){
            return true;
        } else {
            var processingTaskId = processingStep.getValue({id: 'custpage_current_task_field_id'});
            if(!processingTaskId){
                return true;
            } else {
                var processingId = processingStep.getValue({id: processingTaskId});
                log.debug(logTitle, 'Processing Task ID: ' + processingId)
                var taskStatus = task.checkStatus({taskId: processingId});
                var processingStatus = taskStatus.status;
                log.debug(logTitle, 'Processing Status' + processingStatus);
                if(processingStatus === task.TaskStatus.COMPLETE){
                    return true;
                } else return false;
            } 
        }
    }

    Helper.createSummarySublist = function(assistant) {
        var reviewStep = assistant.getStep({id: 'reviewandapprove'});
        var summarySublistId = 'custpage_summary_sublist';
        var reviewSublistId = reviewStep.getValue({id: 'custpage_new_sublist_id'});


        var lines = reviewStep.getLineCount({group: reviewSublistId});
        log.debug('lines', lines);

        var sublist = assistant.addSublist({
            id: summarySublistId,
            label: 'Summary of Adjustments',
            type: serverWidget.SublistType.INLINEEDITOR
        });

        Helper.addSublistFields(sublist);

        var processData = [];

        for (var i = 0; i < lines; i++) {
            var process = reviewStep.getSublistValue({
                group: reviewSublistId,
                line: i,
                id: 'process'
            });

            if (process === 'T' || process === true) {
                processData.push({
                    item: reviewStep.getSublistValue({
                        group: reviewSublistId,
                        line: i,
                        id: 'item'
                    }),
                    location: reviewStep.getSublistValue({
                        group: reviewSublistId,
                        line: i,
                        id: 'location'
                    }),
                    lot: reviewStep.getSublistValue({
                        group: reviewSublistId,
                        line: i,
                        id: 'lot'
                    }),
                    weightOnHand: reviewStep.getSublistValue({
                        group: reviewSublistId,
                        line: i,
                        id: 'weightonhand'
                    }),
                    cogsAdjustment: reviewStep.getSublistValue({
                        group: reviewSublistId,
                        line: i,
                        id: 'cogs_adjustment'
                    })
                });
            }
        }

        processData.forEach(function (data, index) {
            sublist.setSublistValue({
                id: 'item',
                line: index,
                value: data.item
            });

            sublist.setSublistValue({
                id: 'location',
                line: index,
                value: data.location
            });

            if (data.lot) {
                sublist.setSublistValue({
                    id: 'lot',
                    line: index,
                    value: data.lot
                });
            }

            if (data.weightOnHand) {
                sublist.setSublistValue({
                    id: 'weightonhand',
                    line: index,
                    value: data.weightOnHand
                });
            }

            if (data.cogsAdjustment) {
                sublist.setSublistValue({
                    id: 'cogs_adjustment',
                    line: index,
                    value: data.cogsAdjustment
                });
            }
        });

        return processData;
    }

    Helper.assistant = {
        title: 'Catch Weight True Up',
        defaultStep: 'introduction',
        steps: {
            introduction: {
                label: 'Introduction',
                helpText: [
                    'This tool allows you to:',
                    '<ul>',
                    '<li>Analyze current differentials in catch weight vs. standard weight on transactions.</li>',
                    '<li>Approve transactions for processing.</li>',
                    '<li>Process COGS differentials and adjust inventory valuations for approved transactions.</li>',
                    '</ul>'
                ].join(''),
                populateStep: function(assistant) {
                    // Do nothing
                }
            },
            pretrueup: {
                label: 'Pre True Up',
                helpText: [
                    'In order to calculate a proper COGS adjustment value, all previous transactions should be processed. ',
                    '<u1>',
                    'Press "Next" to process existing transactions for COGS adjustments.'
                ].join(''),
                populateStep: function(assistant){
                    //insert function where needed
                }

            },
            pretrueupprocessing: {
                label: 'Pre True Up Processing',
                helpText: [ 'COGS Adjustment is now processing. If attempting to continue you will be redirected to this page. Check "Skip Processing" to continue without completing processing. Choosing "Skip Processing" may result in COGS miscalculations.'

                ].join(''),
                populateStep: function(assistant){
                    var currentStep = assistant.getStep({id: 'pretrueupprocessing'});
                    var taskFieldId = currentStep.getValue({id: 'custpage_new_task_field_id'});
                    var currentTaskFieldId = currentStep.getValue({id: 'custpage_current_task_field_id'});
                    var processTaskFieldId = Helper.checkProcessingStatus(assistant) ? taskFieldId : currentTaskFieldId;
                    if(!processTaskFieldId){
                        var processTaskField = assistant.addField({
                            id: 'custpage_process_task',
                            label: 'Processing Task ID',
                            type: serverWidget.FieldType.TEXT
                        });
                    } else {
                        var processTaskField = assistant.addField({
                            id: processTaskFieldId,
                            label: 'Processing Task ID',
                            type: serverWidget.FieldType.TEXT
                        }).updateDisplayType({
                            displayType: serverWidget.FieldDisplayType.DISABLED
                        });
                    }
                    var processTaskId = currentStep.getValue(processTaskField);
                    if(!processTaskId){
                        var processTask = task.create({
                            taskType: task.TaskType.MAP_REDUCE,
                            scriptId: 'customscript_ns_cw_mr_true_up_totals',
                        });
                        processTaskId = processTask.submit();
                        processTaskField.defaultValue = processTaskId;
                    }
                    var taskStatus = task.checkStatus({ taskId: processTaskId });
                    var taskStatusValue = taskStatus.status;
                    assistant.addField({
                        id: 'custpage_processtask_status',
                        label: 'Processing Task Status',
                        type: serverWidget.FieldType.TEXTAREA
                    }).updateDisplayType({
                        displayType: serverWidget.FieldDisplayType.DISABLED
                    }).defaultValue = taskStatusValue;
                    assistant.addField({
                        id: 'custpage_skip_processing',
                        label: 'Skip Processing *** - Not Recommended',
                        type: serverWidget.FieldType.CHECKBOX,
                    });
                    var max = 9999999999;
                    var min = 0;
                    var randomNumber = Math.floor(Math.random() * (max - min + 1)) + min;
                    var newTaskFieldId = taskFieldId + '_' + randomNumber;
                    assistant.addField({
                        id: 'custpage_new_task_field_id',
                        label: ' New Task Field ID',
                        type: serverWidget.FieldType.TEXT
                    }).updateDisplayType({
                        displayType: serverWidget.FieldDisplayType.HIDDEN
                    }).defaultValue = newTaskFieldId;
                    assistant.addField({
                        id: 'custpage_current_task_field_id',
                        label: 'Current Task Field ID',
                        type: serverWidget.FieldType.TEXT
                    }).updateDisplayType({
                        displayType: serverWidget.FieldDisplayType.HIDDEN
                    }).defaultValue = processTaskField.id;
                }
            },

            addfilters: {
                label: 'Add Filters',
                helpText: 'Optionally add a Location to filter results in the next step.',
                precheck: function(assistant){
                    if(!Helper.checkProcessingStatus(assistant)){
                        return 'Please Complete Processing prior to proceeding.'
                    }
                },
                populateStep: function(assistant) {
                    assistant.addField({
                        id: 'custpage_location',
                        label: 'Location',
                        type: serverWidget.FieldType.SELECT,
                        source: 'location'
                    });
                    assistant.updateDefaultValues({'custpage_processing_task_id': ''});
                }
            },

            reviewandapprove: {
                label: 'Review/Approve',
                helpText: 'Review the list of items and indicate those you wish to process.',
                populateStep: function(assistant) {
                    var reviewStep = assistant.getStep({id: 'reviewandapprove'});
                    var reviewSublistId = reviewStep.getValue({id: 'custpage_new_sublist_id'});
                    var processData = {};

                    if (reviewSublistId) {
                        var lines = reviewStep.getLineCount({group: reviewSublistId});
                        if (lines > 0) {
                            // Get the values set before so we can set ones that were previously set to process again
                            for (var i = lines - 1; i > -1; i--) {
                                var process = reviewStep.getSublistValue({
                                    group: reviewSublistId,
                                    line: i,
                                    id: 'process'
                                });
    
                                if (process === 'T' || process === true) {
                                    var data = {
                                        item: reviewStep.getSublistValue({
                                            group: reviewSublistId,
                                            line: i,
                                            id: 'item'
                                        }),
                                        location: reviewStep.getSublistValue({
                                            group: reviewSublistId,
                                            line: i,
                                            id: 'location'
                                        }),
                                        lot: reviewStep.getSublistValue({
                                            group: reviewSublistId,
                                            line: i,
                                            id: 'lot'
                                        })
                                    };
    
                                    // Construct a unique id
                                    var id = [
                                        data.item,
                                        data.location,
                                        data.lot
                                    ].join('-');
    
                                    processData[id] = true;
                                }
    
                                reviewStep.remove
                            }
                        }
                    }

                    var max = 9999999999;
                    var min = 0;
                    var rando = Math.floor(Math.random() * (max - min + 1)) + min;

                    var newSublistId = reviewSublistId + '_' + rando;

                    assistant.addField({
                        id: 'custpage_new_sublist_id',
                        label: 'Sublist ID',
                        type: serverWidget.FieldType.TEXT
                    }).updateDisplayType({
                        displayType: serverWidget.FieldDisplayType.HIDDEN
                    }).defaultValue = newSublistId;

                    var sublist = assistant.addSublist({
                        id: newSublistId,
                        label: 'Items For Review',
                        type: serverWidget.SublistType.INLINEEDITOR
                    });

                    sublist.addButton({
                        id: 'markall',
                        label: 'Mark All',
                        functionName: 'markAll'
                    });

                    sublist.addButton({
                        id: 'unmarkall',
                        label: 'Un-Mark All',
                        functionName: 'unmarkAll'
                    });

                    sublist.addField({
                        id: 'process',
                        label: 'Process',
                        type: serverWidget.FieldType.CHECKBOX
                    });

                    Helper.addSublistFields(sublist);

                    var locationId = assistant.getStep({id: 'addfilters'}).getValue({id: 'custpage_location'});

                    // Populate the sublist with data from search
                    Helper.getReviewData({
                        locationId: locationId
                    }).forEach(function (data, index) {
                        var id = [
                            data.item.id,
                            data.location.id,
                            data.lot
                        ].join('-');

                        if (processData[id]) {
                            // Process was previously set before
                            sublist.setSublistValue({
                                id: 'process',
                                line: index,
                                value: 'T'
                            });
                        }

                        sublist.setSublistValue({
                            id: 'item',
                            line: index,
                            value: data.item.id
                        });

                        sublist.setSublistValue({
                            id: 'location',
                            line: index,
                            value: data.location.id
                        });

                        if (data.lot) {
                            sublist.setSublistValue({
                                id: 'lot',
                                line: index,
                                value: data.lot
                            });
                        }

                        sublist.setSublistValue({
                            id: 'weightonhand',
                            line: index,
                            value: data.weightOnHand
                        });

                        if (data.cogsAdjustment != undefined && data.cogsAdjustment != null) {
                            sublist.setSublistValue({
                                id: 'cogs_adjustment',
                                line: index,
                                value: data.cogsAdjustment
                            });
                        }
                    });
                }
            },

            final: {
                label: 'Summary',
                helpText: '<b>Press the Next button to submit the selected catch weight items for true up.</b>',
                populateStep: function(assistant) {
                    assistant.addField({
                        id: 'custpage_create_journal',
                        label: 'Create Journal Entry',
                        type: serverWidget.FieldType.CHECKBOX
                    });

                    var processData = Helper.createSummarySublist(assistant);

                    log.debug('processData', JSON.stringify(processData));
                    assistant.addField({
                        id: 'custpage_process_data',
                        type: serverWidget.FieldType.LONGTEXT,
                        label: 'Process Data'
                    }).updateDisplayType({
                        displayType: serverWidget.FieldDisplayType.HIDDEN
                    }).defaultValue = JSON.stringify(processData);
                }
            }
        },
        finish: {
            label: 'Applying',
            helpText: '<b>COGS Adjustments are being applied in the background.</b>',
            getForm: function(options) {
                var context = options.context;
                var assistant = options.assistant;
                var createJournalEntry = context.request.parameters.custpage_create_journal;

                var form = serverWidget.createForm({
                    title: 'Applying'
                });

                if (createJournalEntry) {
                    form.addField({
                        id: 'custpage_journal_entry',
                        label: 'Journal Entry Creation',
                        type: serverWidget.FieldType.TEXT
                    }).updateDisplayType({
                        displayType: serverWidget.FieldDisplayType.INLINE
                    }).defaultValue = 'A Journal Entry will be created during processing. Approval may be required depending on Accounting Preferences.';
                }

                var processData = Helper.createSummarySublist(assistant);

                log.debug('applying processData', JSON.stringify({
                    createJournalEntry: createJournalEntry,
                    processData: processData
                }));

                var mapReduceTask = task.create({
                    taskType: task.TaskType.MAP_REDUCE,
                    scriptId: 'customscript_ns_cw_mr_true_up_apply',
                    params: {
                        custscript_nsts_cw_true_up_data: JSON.stringify(processData),
                        custscript_nsts_cw_true_up_jrnl: createJournalEntry
                    }
                });

                var taskId = mapReduceTask.submit();

                form.addField({
                    id: 'custpage_taskid',
                    label: 'Background Task ID',
                    type: serverWidget.FieldType.TEXT
                }).defaultValue = taskId;

                return form;
            }
        }
    }

    Helper.getAssistant = function(context) {
        log.debug('context.request.parameters', JSON.stringify(context.request.parameters));

        var assistant = serverWidget.createAssistant({
            title: 'Catch Weight True Up'
        });

        assistant.clientScriptModulePath = '../Client/NS_CW_CS_True_Up.js';

        var stepIds = Object.keys(Helper.assistant.steps);

        // Add all the steps from the Assistant Object
        stepIds.forEach(function (stepId) {
            var step = Helper.assistant.steps[stepId];
            step.stepObject = assistant.addStep({
                id: stepId,
                label: step.label
            });
            step.stepObject.helpText = step.helpText;
        });

        // Determine current step
        var currentStep = context.request.parameters.curstep;

        if (context.request.parameters.next === "Finish") {
            assistant.currentStep = Helper.assistant.steps['final'].stepObject;
            return Helper.assistant.finish.getForm({
                context: context,
                assistant: assistant
            });
        } else if (context.request.parameters.cancel) {
            assistant.currentStep = Helper.assistant.steps[Helper.assistant.defaultStep].stepObject;
        } else if (currentStep) {
            // Determine if user pressed back button
            if (!context.request.parameters.submitted) {
                currentStep -= 2;
            }
            
            var precheckResult = Helper.assistant.steps[stepIds[currentStep]].precheck ? Helper.assistant.steps[stepIds[currentStep]].precheck(assistant) : undefined;
            var failedPrecheck = !!precheckResult; // coerce to boolean where any non-empty string is considered fail
            if(failedPrecheck){
                currentStep -= 1;
            }
            // One-based step id
            assistant.currentStep = Helper.assistant.steps[stepIds[currentStep]].stepObject;

            if (precheckResult) {
                // We have a precheck message we want to show
                assistant.addField({
                    id: 'custpage_precheck_fail_message',
                    label: 'Precheck Failed',
                    type: serverWidget.FieldType.INLINEHTML
                }).defaultValue = '<h1 style="color:red;">' + precheckResult + '</h1>';
            }
        } else {
            assistant.currentStep = Helper.assistant.steps[Helper.assistant.defaultStep].stepObject;
        }

        Helper.assistant.steps[assistant.currentStep.id].populateStep(assistant);

        return assistant;
    }

    Helper.processReviewList = function(assistant) {
        var summaryStep = assistant.getStep({id: 'final'});
        var sublistId = 'custpage_summary_sublist';
        var lines = summaryStep.getLineCount({
            group: sublistId
        });
        var processData = [];
        for (var i = 0; i < lines; i++) {
            processData.push({
                item: summaryStep.getSublistValue({
                    group: sublistId,
                    line: i,
                    id: 'item'
                }),
                location: summaryStep.getSublistValue({
                    group: sublistId,
                    line: i,
                    id: 'location'
                }),
                lot: summaryStep.getSublistValue({
                    group: sublistId,
                    line: i,
                    id: 'lot'
                }),
                weightOnHand: summaryStep.getSublistValue({
                    group: sublistId,
                    line: i,
                    id: 'weightonhand'
                }),
                cogsAdjustment: summaryStep.getSublistValue({
                    group: sublistId,
                    line: i,
                    id: 'cogs_adjustment'
                })
            });
        }
        log.debug('processData final', JSON.stringify(processData));
    }

    Helper.processGet = function(context) {
        context.response.writePage(Helper.getAssistant(context));
    }

    Helper.processPost = function(context) {
        var assistant = Helper.getAssistant(context);
        context.response.writePage(assistant);
    }

    Helper.getReviewDataObjectFromResult = function (result) {
        return {
            id: result.id,
            item: {
                id: result.getValue({
                    name: constants.RecordType.WeightLedger.Fields.ITEM,
                    summary: search.Summary.GROUP
                }),
                text: result.getText({
                    name: constants.RecordType.WeightLedger.Fields.ITEM,
                    summary: search.Summary.GROUP
                })
            },
            baseUnitQtyOnHand: result.getValue({
                name: constants.RecordType.WeightLedger.Fields.QUANTITY_IN_BASE_UNITS,
                summary: search.Summary.SUM
            }),
            weightOnHand: result.getValue({
                name: constants.RecordType.WeightLedger.Fields.ACTUAL_WEIGHT,
                summary: search.Summary.SUM
            }),
            lot: result.getValue({
                name: constants.RecordType.WeightLedger.Fields.LOT,
                summary: search.Summary.GROUP
            }),
            location: {
                id: result.getValue({
                    name: constants.RecordType.WeightLedger.Fields.LOCATION,
                    summary: search.Summary.GROUP
                }),
                text: result.getText({
                    name: constants.RecordType.WeightLedger.Fields.LOCATION,
                    summary: search.Summary.GROUP
                })
            },
            result: result
        }
    }

    Helper.getReviewData = function(options) {
        var locationId = (options || {}).locationId;

        var reviewDataSearch = search.load({id: constants.SavedSearch.TRUE_UP_REVIEW});
        if (locationId) {
            reviewDataSearch.filters.push(search.createFilter({
                name: constants.RecordType.WeightLedger.Fields.LOCATION,
                operator: search.Operator.ANYOF,
                values: [locationId]
            }));
        }

        var columns = reviewDataSearch.columns;

        var trueCogsColumn, cogsAdjustmentColumn;

        columns.forEach(function (column) {
            if (column.label == 'True COGS') {
                trueCogsColumn = column;
            } else if (column.label == 'COGS Adjustment') {
                cogsAdjustmentColumn = column;
            }
        });

        return reviewDataSearch.run().getRange(0,1000).map(Helper.getReviewDataObjectFromResult).map(function (result) {
            result.trueCogs = result.result.getValue(trueCogsColumn) || 0;
            result.cogsAdjustment = result.result.getValue(cogsAdjustmentColumn) || 0;

            return result;
        });
    }

    Helper.submitMapReduce = function(context) {
        log.debug('submitMapReduce with context parameters', JSON.stringify(context.request.parameters));
    }

    var Suitelet = {};

    Suitelet.onRequest = function(context) {
        if (context.request.method == 'GET') {
            Helper.processGet(context);
        }
        if (context.request.method == 'POST') {
            Helper.processPost(context);
        }
    }

    return Suitelet;
});