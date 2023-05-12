/**
 * @NApiVersion 2.0
 */
define(['N/ui/serverWidget', './suitelet_form_builder_constants'], function(serverWidget, SUITELET_FORM_BUILDER_CONSTANTS) {

    const FORM_BUILDER_CONTROL_TO_SERVER_WIDGET = {};

    function addButtons(dataIn) {

        const FORM_CONSTANTS = dataIn.formConstants;

        var form = dataIn.form;

        if (FORM_CONSTANTS.BUTTON) {
            Object.keys(FORM_CONSTANTS.BUTTON).forEach(function (button) {
                if (FORM_CONSTANTS.BUTTON[button]) {
                    form.addButton({
                        id: FORM_CONSTANTS.BUTTON[button].id,
                        label: FORM_CONSTANTS.BUTTON[button].label,
                        functionName: FORM_CONSTANTS.BUTTON[button].functionName
                    });
                }
            });
        }

        if (FORM_CONSTANTS.ADD_DEFAULT_SUBMIT_BUTTON) {
            if (FORM_CONSTANTS.ADD_DEFAULT_SUBMIT_BUTTON.label) {
                form.addSubmitButton({
                    label: FORM_CONSTANTS.ADD_DEFAULT_SUBMIT_BUTTON.label
                });
            } else {
                form.addSubmitButton();
            }
        }
    }

    function addHeaderFields(dataIn) {

        const FORM_CONSTANTS = dataIn.formConstants;

        var form = dataIn.form;

        if (FORM_CONSTANTS.HEADER && FORM_CONSTANTS.HEADER.FIELD) {
            Object.keys(FORM_CONSTANTS.HEADER.FIELD).forEach(function (field) {
                if (FORM_CONSTANTS.HEADER.FIELD[field]) {
                    if (FORM_CONSTANTS.HEADER.FIELD[field][SUITELET_FORM_BUILDER_CONSTANTS.SHOULD_SKIP_ADDING_DURING_FORM_CREATION]) {
                        return;
                    }

                    var currentField = form.addField({
                        id: FORM_CONSTANTS.HEADER.FIELD[field].id,
                        type: FORM_CONSTANTS.HEADER.FIELD[field].type,
                        label: FORM_CONSTANTS.HEADER.FIELD[field].label,
                        container: FORM_CONSTANTS.HEADER.FIELD[field].container,
                        source: FORM_CONSTANTS.HEADER.FIELD[field].source
                    }).updateDisplayType({
                        displayType: FORM_CONSTANTS.HEADER.FIELD[field].displayType
                    });

                    currentField.isMandatory = FORM_CONSTANTS.HEADER.FIELD[field].isMandatory || false;
                }
            });
        }
    }

    function addHeaderFieldGroups(dataIn) {

        const FORM_CONSTANTS = dataIn.formConstants;

        var form = dataIn.form;

        if (FORM_CONSTANTS.HEADER && FORM_CONSTANTS.HEADER.FIELD_GROUP) {
            Object.keys(FORM_CONSTANTS.HEADER.FIELD_GROUP).forEach(function (fieldGroup) {
                if (FORM_CONSTANTS.HEADER.FIELD_GROUP[fieldGroup]) {
                    var currentFieldGroup = form.addFieldGroup({
                        id: FORM_CONSTANTS.HEADER.FIELD_GROUP[fieldGroup].id,
                        label: FORM_CONSTANTS.HEADER.FIELD_GROUP[fieldGroup].label
                    });

                    if (FORM_CONSTANTS.HEADER.FIELD_GROUP[fieldGroup] && FORM_CONSTANTS.HEADER.FIELD_GROUP[fieldGroup].hasOwnProperty('isSingleColumn')) {
                        currentFieldGroup.isSingleColumn = FORM_CONSTANTS.HEADER.FIELD_GROUP[fieldGroup].isSingleColumn || false;
                    }

                    if (FORM_CONSTANTS.HEADER.FIELD_GROUP[fieldGroup] && FORM_CONSTANTS.HEADER.FIELD_GROUP[fieldGroup].hasOwnProperty('isBorderHidden')) {
                        currentFieldGroup.isBorderHidden = FORM_CONSTANTS.HEADER.FIELD_GROUP[fieldGroup].isBorderHidden || false;
                    }
                }
            });
        }
    }

    function addSublistFields(dataIn) {

        const FORM_CONSTANTS = dataIn.formConstants;

        var form = dataIn.form;

        if (FORM_CONSTANTS.SUBLIST) {
            Object.keys(FORM_CONSTANTS.SUBLIST).forEach(function (sublist) {
                if (FORM_CONSTANTS.SUBLIST[sublist]) {
                    var formSublist = form.addSublist({
                        id: FORM_CONSTANTS.SUBLIST[sublist].ID,
                        type: FORM_CONSTANTS.SUBLIST[sublist].TYPE,
                        label: FORM_CONSTANTS.SUBLIST[sublist].LABEL,
                        tab: FORM_CONSTANTS.SUBLIST[sublist].TAB
                    });

                    if (FORM_CONSTANTS.SUBLIST[sublist].FIELD) {
                        Object.keys(FORM_CONSTANTS.SUBLIST[sublist].FIELD).forEach(function (field) {
                            formSublist.addField({
                                id: FORM_CONSTANTS.SUBLIST[sublist].FIELD[field].id,
                                label: FORM_CONSTANTS.SUBLIST[sublist].FIELD[field].label,
                                type: FORM_CONSTANTS.SUBLIST[sublist].FIELD[field].type,
                                container: FORM_CONSTANTS.SUBLIST[sublist].FIELD[field].container
                            }).updateDisplayType({
                                displayType: FORM_CONSTANTS.SUBLIST[sublist].FIELD[field].displayType
                            });
                        });
                    }
                }
            });
        }
    }

    function createInitialForm(dataIn) {

        const FORM_CONSTANTS = dataIn.formConstants;

        return serverWidget.createForm({
            title: FORM_CONSTANTS.TITLE,
            hideNavBar: FORM_CONSTANTS.HIDE_NAVIGATION_BAR
        });
    }

    function createSuiteletForm(dataIn) {

        const FORM_CONSTANTS = dataIn.formConstants;

        var form = null;

        try {
            form = createInitialForm({
                formConstants: FORM_CONSTANTS
            });
        } catch (ex) {
            log.error({
                title: 'Error Creating Initial Suitelet Form',
                details: ex
            });
            throw new Error('Error Creating Initial Suitelet Form: ' + String(ex));
        }

        try {
            setClientScriptModulePath({
                formConstants: FORM_CONSTANTS,
                form: form
            });
        } catch (ex) {
            log.error({
                title: 'Error Setting Client Script Module Path On Suitelet Form',
                details: ex
            });
            throw new Error('Error Setting Client Script Module Path On Suitelet Form: ' + String(ex));
        }

        try {
            addButtons({
                formConstants: FORM_CONSTANTS,
                form: form
            });
        } catch (ex) {
            log.error({
                title: 'Error Adding Buttons To Suitelet Form',
                details: ex
            });
            throw new Error('Error Adding Buttons To Suitelet Form: ' + String(ex));
        }

        try {
            addHeaderFieldGroups({
                formConstants: FORM_CONSTANTS,
                form: form
            });
        } catch (ex) {
            log.error({
                title: 'Error Adding Header Field Groups To Suitelet Form',
                details: ex
            });
            throw new Error('Error Adding Header Field Groups To Suitelet Form: ' + String(ex));
        }

        try {
            addHeaderFields({
                formConstants: FORM_CONSTANTS,
                form: form
            });
        } catch (ex) {
            log.error({
                title: 'Error Adding Header Fields To Suitelet Form',
                details: ex
            });
            throw new Error('Error Adding Header Fields To Suitelet Form: ' + String(ex));
        }

        try {
            addSublistFields({
                formConstants: FORM_CONSTANTS,
                form: form
            });
        } catch (ex) {
            log.error({
                title: 'Error Adding Sublist Fields To Suitelet Form',
                details: ex
            });
            throw new Error('Error Adding Sublist Fields To Suitelet Form: ' + String(ex));
        }

        return form;
    }

    function setClientScriptModulePath(dataIn) {

        const FORM_CONSTANTS = dataIn.formConstants;

        var form = dataIn.form;

        if (FORM_CONSTANTS.CLIENT_SCRIPT_MODULE_PATH) {
            form.clientScriptModulePath = FORM_CONSTANTS.CLIENT_SCRIPT_MODULE_PATH;
        }
    }

    return {
        createSuiteletForm: createSuiteletForm
    };
});
