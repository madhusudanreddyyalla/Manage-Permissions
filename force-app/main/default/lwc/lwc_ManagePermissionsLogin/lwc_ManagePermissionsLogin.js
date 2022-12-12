import { LightningElement, track } from 'lwc';
import { NavigationMixin } from 'lightning/navigation';
import Id from '@salesforce/user/Id';
import authorize from '@salesforce/apex/ManagePermissionsLoginController.authorize';
import validateAccessToken from '@salesforce/apex/ManagePermissionsLoginController.validateAccessToken';
import handleLogout from '@salesforce/apex/ManagePermissionsLoginController.handleLogout';
import Login from '@salesforce/label/c.Login';
import Logintodestination from '@salesforce/label/c.Logintodestination';
import LogoutSuccess from '@salesforce/label/c.LogoutSuccess';
import ObjectAccesslabel from '@salesforce/label/c.ObjectAccesslabel';
import FieldAccessLabel from '@salesforce/label/c.FieldAccessLabel';


export default class Lwc_ManagePermissionsLogin extends NavigationMixin(LightningElement) {
    labels = {Login, Logintodestination, LogoutSuccess, ObjectAccesslabel, FieldAccessLabel}

    selectedOrgOption;
    userId = Id;
    destLoginShow = true;
    accessToken;
    baseUrl;
    //baseOrgType;
    cardTitle;
    newOrgLogin = false;
    selectedOrgType;
    @track orgDisplayOptions;
    @track destOrgDetails;

    connectedCallback() {
        this.validateAndGetOrgDetails();
    }

    //Org Types for new login
    get OrgTypeOptions() {
        return [
            { label: 'Production', value: 'Production' },
            { label: 'Sandbox', value: 'Sandbox' },
        ];
    }

    handleOrgTypeSelection(event) {
        this.selectedOrgOption = event.target.value;
    }

    //On component load -> If if the last org accesstoken is still active
    //If not active, display login options
    validateAndGetOrgDetails() {
        validateAccessToken({ userId: this.userId })
            .then(result => {
                if (result.isActiveOrg) {
                    this.accessToken = result.activeOrg.Access_Token__c;
                    this.baseUrl = result.activeOrg.OrgUrl__c;
                    this.cardTitle = 'You are logged in to - ' + result.activeOrg.Org_Name__c + ' (' + this.baseUrl + ')';
                    //this.baseOrgType = result.activeOrg.OrgType__c;
                    this.destLoginShow = false;
                } else {
                    let orgDisplayOptionsTemp = [];
                    orgDisplayOptionsTemp.push({ label: 'Connect to New Org', value: 'neworg' });
                    if(result.destOrgWrapperList){
                        result.destOrgWrapperList.forEach(element => {
                            let mapElement = { label: element.orgName +' ('+element.orgUrl+')', value: element.orgUrl };
                            orgDisplayOptionsTemp.push(mapElement);
                        });
                    }
                    this.orgDisplayOptions = orgDisplayOptionsTemp;
                }
            })
            .catch(error => {
                this.showToast('error',JSON.stringify(error));
            });
    }

    //capture the org selected by user 
    handleOrgSelection(event) {
        this.selectedOrgType = event.target.value;
        this.newOrgLogin = this.selectedOrgType == 'neworg' ? true : false;
    }

    //Login if the access token is active else redirect to the OAuth login page
    handleLogin() {
        authorize({
            orgType: this.selectedOrgOption, orgUrl: this.selectedOrgType,
            newLogin: this.newOrgLogin
        })
            .then(result => {
                if (result.isActiveOrg) {
                    this.accessToken = result.activeOrg.Access_Token__c;
                    this.baseUrl = result.activeOrg.OrgUrl__c;
                    this.cardTitle = 'You are logged in to - ' + this.baseUrl;
                    //this.baseOrgType = 'Production';
                    this.destLoginShow = false;
                } else {
                    this[NavigationMixin.Navigate]({
                        type: 'standard__webPage',
                        attributes: {
                            url: result.redirectUrl
                        }
                    })
                }

            })
            .catch(error => {
                this.showToast('error',JSON.stringify(error));
            })
    }

    handleLogout() {
        handleLogout({ userId: this.userId, orgUrl: this.baseUrl })
            .then(result => {
                this.showToast('success', this.labels.LogoutSuccess);
                this.validateAndGetOrgDetails();
                this.accessToken = false;
                this.destLoginShow = true;
            })
            .catch(error => {
                this.showToast('error',JSON.stringify(error));
            });
    }

    //display message on uis
    showToast(type, message) {
        this.template.querySelector('c-custom-toast').showToast(type, message);
    }
}