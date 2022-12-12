import { LightningElement, track, api, wire } from 'lwc';
import getFieldPermissions from '@salesforce/apex/ManageFieldPermissionsController.getFieldPermissions';
import updateFieldPermissions from '@salesforce/apex/ManageFieldPermissionsController.updateFieldPermissions';
import getAllFieldsFromObj from '@salesforce/apex/ManageFieldPermissionsController.getAllFieldsFromObj';
import getmanagePermissionsMdt from '@salesforce/apex/ManageFieldPermissionsController.managePermissionsMdt';
import getRestResponse from '@salesforce/apex/ManagePermissionsUtility.getRestResponse';
import FieldPermissionRetrieveSuccess from '@salesforce/label/c.FieldPermissionRetrieveSuccess';
import FieldPermissionSaveFailed from '@salesforce/label/c.FieldPermissionSaveFailed';
import FieldPermissionSaveSuccess from '@salesforce/label/c.FieldPermissionSaveSuccess';
import SelectObjectLabel from '@salesforce/label/c.SelectObjectLabel';
import SelectObjectWarning from '@salesforce/label/c.SelectObjectWarning';
import SelectProfileandPermissionSetLabel from '@salesforce/label/c.SelectProfileandPermissionSetLabel';
import SelectProfileandPermissionSetwarning from '@salesforce/label/c.SelectProfileandPermissionSetwarning';
import ManageFieldChunk from '@salesforce/label/c.ManageField';
import MassFieldSaveChunk from '@salesforce/label/c.MassFieldSaveChunk';
import fetchData from '@salesforce/label/c.Fetch_Mass_Permission_Data';
import saveData from '@salesforce/label/c.MassPermissionsSaveButton';



export default class Lwc_ManageFieldPermissions extends LightningElement {
    labels = {FieldPermissionRetrieveSuccess,FieldPermissionSaveFailed,FieldPermissionSaveSuccess,SelectProfileandPermissionSetLabel,SelectObjectLabel,SelectObjectWarning,SelectProfileandPermissionSetwarning,ManageFieldChunk,MassFieldSaveChunk,fetchData,saveData}

    @api accessToken;
    @api baseUrl;
    @api baseOrgType = 'Production';
    @track autoCloseTime = 3000;
    @track selectedObject;
    @track testoptions = '';
    @track permissionList;
    @track sObject = [];
    @track permission = [];
    @track searchActivity;
    @track allObjects = {};
    @track allProfilesandPermissionset = [];
    @track getAllObjects;
    @track getSelectedObjFields;
    @track getobj = [];
    @track isProfile = false;
    @track isObject = false;
    @track isfieldsvisible = false;
    @track allFields = [];
    @track allStandardFields = [];
    @track objectselected;
    @track fieldPermissionsList = [];   
    @track columns = [];
    @track updatedFiledPermission = [];
    @track selectedProfilesandPS;
    @track updatedFieldPermissionJsonString;
    @track managePermissionMDT;
    // Source of truth to revert back to on `edit all` and `read all` change.
    fieldPermissionsListSource = []; 
    isFieldPermissionVisible = false;
    isdataFetched;
    isSpinner = false;
    isFetch = true;
    @track hideObjects;
    @track allPermissionsResponseData=[];
    //@track hidePermissions;


    async connectedCallback() {
        this.isSpinner =true;
        await getmanagePermissionsMdt().then((result) => {
                this.managePermissionMDT = result;
                 this.hideObjects =this.managePermissionMDT.Hide_Objects__c.replaceAll(/\s/g,'').split(',');
            }).catch((err) => {
                this.showToast('error', JSON.stringify(err));
            });
            let getAllObjectsjson = {
                accessToken : this.accessToken,
                baseUrl: this.baseUrl,
                queryString : 'sobjects/',
                method: 'GET',
            }
        getRestResponse({ jsonDataStr: JSON.stringify(getAllObjectsjson) })
            .then((result) => {
                let objrecords = JSON.parse(result).sobjects;
                for (let i = 0; i < objrecords.length; i++) {
                    if (objrecords[i].createable == true && objrecords[i].searchable == true &&
                        (objrecords[i].label != null || objrecords[i].label != undefined)) {
                                objrecords = objrecords.filter(e => !this.hideObjects.includes(e.name))
                        
                        this.getobj.push({
                            label: objrecords[i].label +' ('+objrecords[i].name+')',
                            value: objrecords[i].name
                        });
                    }
                }
                this.isObject = true;
            }).catch((err) => {
                this.autoCloseTime = 4000;
                this.showToast('error', JSON.stringify(err));
            });

            let getAllProfilePermissionSetjson = {
                accessToken : this.accessToken,
                baseUrl: this.baseUrl,
                queryString : 'query/?q=SELECT+Id,name,label,PermissionSet.Profile.Name,ProfileId+FROM+PermissionSet',
                method: 'GET',
            }

        getRestResponse({ jsonDataStr: JSON.stringify(getAllProfilePermissionSetjson) })
            .then((result) => {
               let records = JSON.parse(result).records;
                try {
                    let hidePermissions = this.managePermissionMDT.Hide_Permissions__c.replaceAll(/\s/g,'').split(',');

                    for (let i = 0; i < records.length; i++) {
                        if (records[i].ProfileId != null || records[i].ProfileId != undefined) {
                            records = records.filter(record => !hidePermissions.includes(record.name))

                            this.allProfilesandPermissionset.push({
                                label: records[i].Profile.Name + '(Profile)',
                                value: records[i].Id
                            });
                        } else {
                            this.allProfilesandPermissionset.push({
                                label: records[i].Label + '(Permission Set)',
                                value: records[i].Id
                            });
                        }
                    }
                    this.isProfile = true;
                } catch (ex) {
                    this.autoCloseTime = 4000;
                     this.showToast('error', JSON.stringify(ex));
                }

            }).catch((err) => {
                this.autoCloseTime = 4000;
                this.showToast('error', JSON.stringify(err));
            });
            this.isSpinner =false;
    }
        
    getSObjectFields(selectedOBJ) {

         let getSObjectFields = {
                accessToken : this.accessToken,
                baseUrl: this.baseUrl,
                queryString : 'sobjects/' + selectedOBJ + '/describe',
                method: 'GET',
            }
             getRestResponse({ jsonDataStr: JSON.stringify(getSObjectFields)})
            .then((result) => {
                let fieldsRecord = JSON.parse(result).fields;
                fieldsRecord = fieldsRecord.filter((e) => !(this.managePermissionMDT.Hide_Fields__c.includes(e.name)) && !(e.custom == true));
                try {
                    for (let i = 0; i < fieldsRecord.length; i++) {
                        if ((fieldsRecord[i].label != null || fieldsRecord[i].name != undefined) && fieldsRecord[i].custom != true) {
                            let fieldlabel = fieldsRecord[i].label;
                            this.allStandardFields.push({
                                label: fieldlabel + ' (' + fieldsRecord[i].name + ')',
                                value: fieldsRecord[i].name,
                                datatype: fieldsRecord[i].type
                            });
                        }
                    }
                } catch (ex) {
                    this.autoCloseTime = 4000;
                    this.showToast('error', JSON.stringify(ex));
                }

            }).catch((err) => {
                this.autoCloseTime = 4000;
                this.showToast('error', JSON.stringify(err));
            });
    }

    buttonSelectObject(event) {
        let selectedvalues = event.detail.payload;
        this.objectselected = selectedvalues.value;
        this.allObjects['objectName'] = selectedvalues.value;
        if(this.allObjects['objectName'].length){
        this.getSObjectFields(this.allObjects['objectName']);

        getAllFieldsFromObj({
            accessToken: this.accessToken,
            baseUrl: this.baseUrl,
            objectName: this.allObjects['objectName']
        }).then((result) => {
            let allFieldsofObject = JSON.parse(JSON.stringify(result));
            let hideFields = this.managePermissionMDT.Hide_Fields__c.replaceAll(/\s/g,'').split(',');
            this.allFields = allFieldsofObject.filter(element=> !(hideFields.includes(element.apiName)));
            
        }).catch((err) => {
            this.autoCloseTime = 4000;
            this.showToast('error', JSON.stringify(err));
        });
        
        }
    }
    buttonSelect(event) {
        let selectedvalues = event.detail.payload;
        let multiselect = event.detail.payloadType;
        if (multiselect == 'multi-select') {
            this.allObjects['selectedIdList'] = selectedvalues.values;
        } 

    }

    async fetchFieldPermissions() {
        
        if (this.allObjects.objectName == undefined && this.allObjects.objectName == null) {
            this.isSpinner = false;
            this.showToast('error', this.labels.SelectObjectWarning);
           
        } else if ((this.allObjects.selectedIdList == undefined && this.allObjects.selectedIdList == null) || this.allObjects.selectedIdList.length == 0) {
            this.isSpinner = false;
            this.showToast('error', this.labels.SelectProfileandPermissionSetwarning);
        } else {
            this.isSpinner = true;
            this.selectedProfilesandPS = this.allProfilesandPermissionset.filter(u => this.allObjects.selectedIdList.includes(u.value))
            
            let allObjectSelectedList = JSON.parse(JSON.stringify(this.allObjects.selectedIdList));
            let chunks = new Array(Math.ceil(allObjectSelectedList.length / this.labels.ManageFieldChunk)).fill().map(_ => { return { objectName: this.allObjects.objectName, selectedIdList: allObjectSelectedList.splice(0, this.labels.ManageFieldChunk) } });
            this.recursivePromiseChainHandler(chunks, this);
        }
    }
    fieldUpdate(event) {
        var fieldLabel = event.target.dataset.fieldlabel;
        var permissionName = event.target.dataset.permissionname;
        var isChecked = event.target.checked;
        var trasactionType = event.target.value;
        //var trasactionId = event.target.dataset.fieldval;
        var parentId = event.target.dataset.permissionid;

        for (let i = 0; i < this.fieldPermissionsList.length; i++) {
            if (this.fieldPermissionsList[i].fieldlabel == fieldLabel) {
                this.fieldPermissionsList[i].isModified = true;
                for (let j = 0; j < this.fieldPermissionsList[i].permissionList.length; j++) {
                    if (this.fieldPermissionsList[i].permissionList[j].name == permissionName) {
                        
                        if (trasactionType == 'permissionsRead') {
                            this.fieldPermissionsList[i].permissionList[j].read = isChecked;
                            if (isChecked == false) {
                                this.fieldPermissionsList[i].permissionList[j].edit = false;
                            }
                        } else if (trasactionType == 'permissionsEdit') {
                            this.fieldPermissionsList[i].permissionList[j].edit = isChecked;
                            if (isChecked == true) {
                                this.fieldPermissionsList[i].permissionList[j].read = isChecked;
                            }
                        }
                        let isUpdated = this.fieldPermissionsList[i].permissionList[j].isModified;
                        this.fieldPermissionsList[i].permissionList[j].isModified = isUpdated ? false : true;
                        break;
                    }
                }

            }
        }
    }


    selectOrDeselectAllPermissions(event) {
        if (event.target.dataset.scope == 'REVERT') {
            this.fieldPermissionsList = JSON.parse(JSON.stringify(this.fieldPermissionsListSource));
            this.template.querySelector('[data-scope="READ_ALL"]').checked = false;
            this.template.querySelector('[data-scope="EDIT_ALL"]').checked = false;
            this.template.querySelectorAll(`[data-scope="READ_ALL_C"]`).forEach(eachElement => {
                eachElement.checked = false;
            })

            this.template.querySelectorAll(`[data-scope="EDIT_ALL_C"]`).forEach(eachElement => {
                eachElement.checked = false;
            })
        }
        let accessType = event.target.dataset.scope;
        let isChecked = event.target.checked;

        let isCategory = false;
        let value = '';
        if (accessType.indexOf('_C') != -1) {
            isCategory = true;
            value = event.target.dataset.id;
        }
        this.fieldPermissionsList.forEach(eachFieldPermission => {
            eachFieldPermission.permissionList.forEach(eachPermission => {
                if (isCategory & eachPermission.parentId == value) {
                    eachFieldPermission.isModified = true;
                    switch (accessType) {
                        case 'EDIT_ALL_C':
                            eachPermission.read = isChecked;
                            eachPermission.edit = isChecked;
                            eachPermission.isModified = true;
                            
                            this.template.querySelectorAll(`[data-id="${value}"]`).forEach(queriedNode => {
                                if (queriedNode.attributes.getNamedItem('data-scope').value == 'READ_ALL_C') {
                                    queriedNode.checked = isChecked;
                                }
                            })
                            break;

                        case 'READ_ALL_C':
                            eachPermission.read = isChecked;
                            eachPermission.isModified = true;
                            if (isChecked == false) {
                                eachPermission.edit = false;
                                this.template.querySelectorAll(`[data-id="${value}"]`).forEach(queriedNode => {
                                    if (queriedNode.attributes.getNamedItem('data-scope').value == 'EDIT_ALL_C') {
                                        queriedNode.checked = false;
                                    }
                                })
                            }
                            break;
                    }
                }

                switch (accessType) {
                    case 'EDIT_ALL':
                        eachFieldPermission.isModified = true;
                        eachPermission.edit = isChecked;
                        eachPermission.read = isChecked;
                        eachPermission.isModified = true;
                        this.template.querySelector('[data-scope="READ_ALL"]').checked = isChecked;
                        this.template.querySelectorAll(`[data-scope="EDIT_ALL_C"]`).forEach(eachElement => {
                            eachElement.checked = isChecked;
                        })
                        this.template.querySelectorAll(`[data-scope="READ_ALL_C"]`).forEach(eachElement => {
                            eachElement.checked = isChecked;
                        })
                        break;

                    case 'READ_ALL':
                        eachFieldPermission.isModified = true;
                        eachPermission.read = isChecked;
                        eachPermission.isModified = true;
                        this.template.querySelectorAll(`[data-scope="READ_ALL_C"]`).forEach(eachElement => {
                            eachElement.checked = isChecked;
                        })
                        if (!isChecked) {
                            eachPermission.edit = isChecked;
                            this.template.querySelector('[data-scope="EDIT_ALL"]').checked = isChecked;
                            this.template.querySelectorAll(`[data-scope="EDIT_ALL_C"]`).forEach(eachElement => {
                                eachElement.checked = isChecked;
                            })
                        }
                        break;
                }
            })
        })
    }

    /**
     * Recursively handle chained promises one after the other. Used to asynchronously handle data in multiple iterations. 
     * @param {Object[]} chunkedDataContainer Array of chunks of data to be handled asynchronously one after the other.
     * @param {this} self Context 
     */
    recursivePromiseChainHandler(chunkedDataContainer, self) {
        let currentChunk = chunkedDataContainer.shift();
        if (currentChunk) {
            // Using a flag `isFetch` to differentiate between fetch and save operations.
            if (self.isFetch) {
                self.processPermissions(currentChunk, self).then(_ => self.recursivePromiseChainHandler(chunkedDataContainer, self));
            } else {
                // Saving the chunk here
                self.processSavePermission(currentChunk, self).then(_ => self.recursivePromiseChainHandler(chunkedDataContainer, self));
            }
        } else {
            if (self.isFetch) {
                self.handlePermissionData(self);
                self.isFieldPermissionVisible = true;
            } else {
                self.isFetch = true;
            }
            self.isSpinner = false;
        }
    }

    /**
     * Fetch permissions for a given set of profiles or permission sets. Returns a promise that resolves when the explicit apex call succeeds.
     * @param {Object[]} chunk Information regarding the data to be fetched as part of the call.
     * @param {this} self Context 
     * @returns Returns a promise that resolves when the explicit apex call succeeds and is rejected when the call fails.
     */
    processPermissions(chunk, self) {
        return new Promise((resolve, reject) => {
            getFieldPermissions({
                accessToken: self.accessToken,
                baseUrl: self.baseUrl,
                jsonDataStr: JSON.stringify(chunk)
            })
                .then(response => {
                    resolve();
                   let records = JSON.parse(response).records
                    this.allPermissionsResponseData = [...this.allPermissionsResponseData,...records];
                  //  self.handlePermissionData(response, self);
                })
                .catch(error => {
                    reject();
                    this.autoCloseTime = 4000;
                    self.handleError(error);

                })
        })
    }

    /**
     * Save / Update permissions for a given set of profiles or permission sets. Returns a promise that resolves when the explicit apex call succeeds.
     * @param {Object[]} chunk Information regarding the data to be saved as part of the call.
     * @param {this} self Context 
     * @returns Returns a promise that resolves when the explicit apex call succeeds and is rejected when the call fails.
     */
    processSavePermission(chunk, self) {
        return new Promise((resolve, reject) => {
            updateFieldPermissions({
                accessToken: self.accessToken,
                baseUrl: self.baseUrl,
                jsonInputString: JSON.stringify(chunk)
            })
                .then(response => {
                    resolve();
                    this.showToast('success', this.labels.FieldPermissionSaveSuccess);
                })
                .catch(error => {
                    reject()
                    self.handleError(error);
                })
        })
    }

    handlePermissionData(self) {
        this.showToast('success', this.labels.FieldPermissionRetrieveSuccess);
        //let permissions = JSON.parse(response).records;
        let permissions = this.allPermissionsResponseData;
      
        let objectName = this.allObjects.objectName;
        let fieldArray = [];
        self.isdataFetched = true;
        self.allFields.forEach(field => {
            let fieldApiNames = objectName + '.' + field.apiName;
            var permissionsRelatedToTheField = permissions.filter(eachPermission => eachPermission.Field == fieldApiNames);

            var matchedStandardField = self.allStandardFields.find(matchedField => matchedField.value == field.apiName)
            var permissionList = [];
            self.selectedProfilesandPS.forEach(eachPermission => {
                let permissionRec = [];
                permissionsRelatedToTheField.forEach(rec => {
                    if (rec.Parent.attributes.url.includes(eachPermission.value)) {

                        permissionRec.push(rec);
                    }
                });
                if (permissionRec.length != 0) {
                    permissionList.push({
                        read: permissionRec[0].PermissionsRead,
                        edit: permissionRec[0].PermissionsEdit,
                        fieldId: permissionRec[0].Id,
                        name: eachPermission.label,
                        parentId: eachPermission.value,
                        isModified: false
                    });
                } else {
                    permissionList.push({
                        read: false,
                        edit: false,
                        fieldId: '',
                        name: eachPermission.label,
                        parentId: eachPermission.value,
                        isModified: false
                    });
                }
            })
            let preventEditField = ['reference', 'Formula'];
                let dataType = field?.dataType ? field.dataType : ((matchedStandardField?.datatype) ? matchedStandardField?.datatype :'-');
                    if(dataType == 'string' || dataType == 'String'){
                        dataType ='Text';
                    }else if(dataType == 'boolean' || dataType == 'Boolean'){
                        dataType ='Checkbox';
                    }else if(dataType == 'int' || dataType == 'Integer'){
                        dataType ='Number';
                    }
                  //  else{
                    //     dataType = dataType;
                    // }
            let fieldData =
                [{
                    "fieldlabel": field?.label ? (field.label + ' (' + field.apiName + ')') : (matchedStandardField?.label ? matchedStandardField?.label : (field.apiName + ' (' + field.apiName + ')')),
                    "fieldApi": field.apiName,
                   // "datatype": field?.dataType ? field.dataType : ((matchedStandardField?.datatype) ? matchedStandardField?.datatype :'-'),
                   "datatype": dataType,
                    "restrictEdit": preventEditField.includes(field.dataType) ? true : false,
                    "permissionList": permissionList,
                    "isModified": false

                }];
            fieldArray.push(...fieldData);
        });
        self.fieldPermissionsList = fieldArray.sort((a, b) => a.fieldlabel.localeCompare(b.fieldlabel));
       
        self.fieldPermissionsListSource = JSON.parse(JSON.stringify(fieldArray));
        if (!self.isFieldPermissionVisible) {
            self.isFieldPermissionVisible = true;
        }
    }

    handleError(error) {
        this.autoCloseTime = 4000;
    }

    async savefieldPermissions() {
        this.isSpinner = true;
        var compositeRequestList = [];
        var updatedFieldPermissionList = this.fieldPermissionsList.filter(fieldElement => fieldElement.isModified == true)
        
        updatedFieldPermissionList.forEach(elementField => {
            var updatedFieldPermissionData = elementField.permissionList.filter(e => e.isModified == true)
           
            updatedFieldPermissionData.forEach(element => {
                if (element.fieldId != '' && element.fieldId != undefined) {

                    var compositeRequest = {
                        "method": "PATCH",
                        "referenceId": "UpdateFieldPermissions" + element.fieldId,
                        "url": "/services/data/v56.0/sobjects/FieldPermissions/" + element.fieldId,
                        "body": {
                            "PermissionsEdit": element.edit,
                            "PermissionsRead": element.read
                        }
                    }
                    compositeRequestList.push(compositeRequest);
                }
                else {
                    var compositeRequest = {
                        "method": "POST",
                        "referenceId": "NewFieldPermissions" + elementField.fieldApi + element.parentId,
                        "url": "/services/data/v56.0/sobjects/FieldPermissions",
                        "body": {
                            "SobjectType": this.allObjects.objectName,
                            "Field": this.allObjects.objectName + '.' + elementField.fieldApi,
                            "ParentId": element.parentId,
                            "PermissionsEdit": element.edit,
                            "PermissionsRead": element.read

                        }
                    }
                    compositeRequestList.push(compositeRequest);
                }
            })
        })

        this.updatedFieldPermissionJsonString = {
            "allOrNone": false,
            "compositeRequest": compositeRequestList
        }

        this.isFetch = false;
        this.recursivePromiseChainHandler(new Array(Math.ceil(compositeRequestList.length / this.labels.MassFieldSaveChunk)).fill().map(_ => { return { allOrNone: false, compositeRequest: compositeRequestList.splice(0, this.labels.MassFieldSaveChunk) } }), this);
    }

    passUpdateFieldPermissions() {
        
        updateFieldPermissions({ accessToken: this.accessToken, baseUrl: this.baseUrl, jsonInputString: JSON.stringify(this.updatedFieldPermissionJsonString) })
            .then((result) => {
                this.isSpinner = false;
            }).catch((err) => {
                this.isSpinner = false;
                this.autoCloseTime = 4000;
                this.showToast('error', this.labels.FieldPermissionSaveFailed);
            });
    }

    showToast(type, message) {
        this.template.querySelector('c-custom-toast').showToast(type, message);
    }

}