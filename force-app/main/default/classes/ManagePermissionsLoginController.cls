/**
 * @description       : Controller class for ManagePermissions related LWC components
 * @author            : CEPTES
**/
public with sharing class ManagePermissionsLoginController{

    private static final ManagePermissions__mdt MANAGE_PERMISSIONS_MDT_RECS = 
        ManagePermissions__mdt.getInstance('ManagePermissions');
    private static final String MYORG_URL = URL.getSalesforceBaseUrl().toExternalForm();    
    private static final String LOGIN_URI = 'https://login.salesforce.com';
    private static final String SANDBOX_URI = 'https://test.salesforce.com';
    
    /**
    * @description  : Method to check whether access token is valid
    * @param        : activeOrg 
    * @return       : Boolean 
    **/
    
    private static Boolean accessTokenValidCheck(DestinationOrg__c activeOrg){
        Boolean returnValue = false;

        Http http = new Http();
        HttpRequest request = new HttpRequest();
        request.setEndpoint(activeOrg.OrgUrl__c + '/services/data/v55.0/query?q=SELECT+Name,IsSandbox+FROM+Organization');
        request.setHeader('Authorization', 'Bearer ' + activeOrg.Access_Token__c);
        request.setHeader('Content-Type', 'application/json');
        request.setMethod('GET');
        HttpResponse response = http.send(request);

        return response.getStatusCode() == 200 ? true : false;
    }

    /**
    * @description  : Method to return destination org details  
    * @param        : userId 
    * @return       : ResponseWrapper 
    **/
    @AuraEnabled
    public static ResponseWrapper validateAccessToken(Id userId){       
        List<DestinationOrgWrapper> destOrgWrapperList = new List<DestinationOrgWrapper>();
        DestinationOrgWrapper destOrgWrapper = new DestinationOrgWrapper();
        DestinationOrg__c activeOrg;
        DestinationOrg__c sessionIdRecord;
        ResponseWrapper responseWrapper = new ResponseWrapper();
        List<DestinationOrg__c> destRecordList = new List<DestinationOrg__c>();

        List<DestinationOrg__c> destOrgList = [SELECT Name, Contact__c, OrgUrl__c, OrgType__c, TokenExpiryTime__c, Active__c, CreatedDate, Org_Name__c, Access_Token__c
                                               FROM DestinationOrg__c
                                               WHERE Contact__c = :[
                                                SELECT Id, ContactId
                                                FROM User
                                                WHERE Id = :userId].ContactId
                                                WITH SECURITY_ENFORCED
                                                ORDER BY Active__c DESC
                                               LIMIT 49999];

        if (destOrgList != null && !destOrgList.isEmpty()){
            if (destOrgList[0].Active__c && accessTokenValidCheck(destOrgList[0])){
                responseWrapper.isActiveOrg = true;
                responseWrapper.destOrgWrapperList = null;
                responseWrapper.activeOrg = destOrgList[0];
            } else{
                for (DestinationOrg__c dest : destOrgList){
                    destOrgWrapper = new DestinationOrgWrapper();
                    destOrgWrapper.token = dest.Access_Token__c;
                    destOrgWrapper.orgUrl = dest.OrgUrl__c;
                    destOrgWrapper.orgType = dest.OrgType__c;
                    destOrgWrapper.orgName = dest.Org_Name__c;
                    destOrgWrapper.expiryDateTime = dest.TokenExpiryTime__c;
                    destOrgWrapperList.add(destOrgWrapper);
                }
                responseWrapper.isActiveOrg = false;
                responseWrapper.destOrgWrapperList = destOrgWrapperList;
                responseWrapper.activeOrg = null;
                if (destOrgList[0].Active__c){
                    destOrgList[0].Active__c = false;
                    //update destOrgList[0];
                    destRecordList.add(destOrgList[0]);
                }
            }
        } else{
            responseWrapper.isActiveOrg = false;
            responseWrapper.destOrgWrapperList = null;
            responseWrapper.activeOrg = null;
        }

        if(!destRecordList.isEmpty()){
            //Check if the current user has create permission
            //commenting access check as the qa user do not have access to the object/fields.
            SObjectAccessDecision securityDecision = Security.stripInaccessible(
            AccessType.UPDATABLE, destRecordList);
            UPDATE securityDecision.getRecords();
        }
        return responseWrapper;
    }

    /**
    * @description  : Method to handle Login button click 
    * @param        : orgType 
    * @param        : orgUrl 
    * @param        : newLogin 
    * @return       : ResponseWrapper 
    **/
    @AuraEnabled
    public static ResponseWrapper authorize(String orgType, String orgUrl, Boolean newLogin){
        ResponseWrapper responseWrapper = new ResponseWrapper();
        DestinationOrg__c destinationRec;

        if (!newLogin){
            destinationRec = [SELECT Id, OrgUrl__c, TokenExpiryTime__c, Active__c, OrgType__c, Access_Token__c
                    FROM DestinationOrg__c
                    WHERE OrgUrl__c = :orgUrl 
                    WITH SECURITY_ENFORCED
                    LIMIT 1];
        }
        if (destinationRec != null && accessTokenValidCheck(destinationRec)){
            destinationRec.Active__c = true;
            //update destinationRec;
            responseWrapper.isActiveOrg = true;
            responseWrapper.activeOrg = destinationRec;
        } else{
            String codeGenerateUrl = getRedirectUrl(destinationRec != null ? destinationRec.OrgType__c : orgType);
            responseWrapper.isActiveOrg = false;
            responseWrapper.redirectUrl = codeGenerateUrl;
        }

        if(destinationRec != null){
            //Check if the current user has create permission
            //commenting access check as the qa user do not have access to the object/fields.
            SObjectAccessDecision securityDecision = Security.stripInaccessible(
            AccessType.UPDATABLE, new List<DestinationOrg__c>{destinationRec});
            UPDATE securityDecision.getRecords();
        }
        return responseWrapper;
    }

    /**
    * @description  : To get redirect url for OAuth Login
    * @author       : CEPTES
    * @param        : orgType 
    * @return       : String 
    **/
    @Testvisible
    private static String getRedirectUrl(String orgType){
        Http http = new Http();
        HttpRequest req = new HttpRequest();
        system.debug('@@LOGIN_URI-='+LOGIN_URI);
        req.setMethod('GET');
        if (orgType.equalsIgnoreCase('Production')){
            req.setEndpoint(LOGIN_URI + '/services/oauth2/authorize');
        } else{
            req.setEndpoint(SANDBOX_URI + '/services/oauth2/authorize');
        }
        req.setBody('response_type=code' + 
                                 '&client_id=' + MANAGE_PERMISSIONS_MDT_RECS.Client_Id__c +                                 
                                 '&redirect_uri=' + MYORG_URL + '/apex/StoreDestinationOrgCodeVF');//changes
        HttpResponse response = http.send(req);
        system.debug('@@response-=//'+ response.getHeader('Location'));
        return response.getHeader('Location');
    }

    /**
    * @description  : To handle logout functionality
    * @author       : CEPTES 
    * @param        : userId 
    **/
    @AuraEnabled
    public static void handleLogout(Id userId){
        List<DestinationOrg__c> recsForUpdateList = new List<DestinationOrg__c>();
        for (DestinationOrg__c rec : [SELECT Active__c
                                      FROM DestinationOrg__c
                                      WHERE Contact__c = :[
                                      SELECT Id, ContactId
                                      FROM User
                                      WHERE Id = :userId].ContactId AND Active__c = true
                                      WITH SECURITY_ENFORCED]){
            rec.Active__c = false;
            recsForUpdateList.add(rec);
        }
        if (!recsForUpdateList.isEmpty()){
            //Check if the current user has create permission
            //commenting access check as the qa user do not have access to the object/fields.
            SObjectAccessDecision securityDecision = Security.stripInaccessible(
            AccessType.UPDATABLE, recsForUpdateList);
            UPDATE securityDecision.getRecords();
            //update recsForUpdateList;
        }
    }
    @Testvisible
    private class DestinationOrgWrapper{
        @AuraEnabled
        public String name{ get; set; }

        @AuraEnabled
        public String token{ get; set; }

        @AuraEnabled
        public String contact{ get; set; }

        @AuraEnabled
        public String orgUrl{ get; set; }

        @AuraEnabled
        public String orgType{ get; set; }

        @AuraEnabled
        public String orgName{ get; set; }

        @AuraEnabled
        public Datetime expiryDateTime{ get; set; }

    }

    
    public class ResponseWrapper{
        @AuraEnabled
        public List<DestinationOrgWrapper> destOrgWrapperList{ get; set; }

        @AuraEnabled
        public Boolean isActiveOrg{ get; set; }

        @AuraEnabled
        public DestinationOrg__c activeOrg{ get; set; }

        @AuraEnabled
        public String redirectUrl{ get; set; }

    }

}