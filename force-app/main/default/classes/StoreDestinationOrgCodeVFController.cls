/**
 * @description       : Controller class for StoreDestinationOrgCodeVF page
 * @author            : CEPTES
 **/
public with sharing class StoreDestinationOrgCodeVFController{
    //private static final String MYORG_URL = URL.getSalesforceBaseUrl().toExternalForm();
    private static final String MYORG_URL = URL.getOrgDomainUrl().toExternalForm();    
    private static final ManagePermissions__mdt MANAGE_PERMISSIONS_MDT_RECS = ManagePermissions__mdt.getInstance('ManagePermissions');
    private static final String LOGIN_URI = 'https://login.salesforce.com';
    private static final String TEST_URI = 'https://test.salesforce.com';
    private static String token;
    private static String companyId;
    private static String orgUrl;
    private static String orgType = '';
    private static String orgName = '';
    /**
     * @description  : Method to validate destination org session
     * @param        : none
     * @return       : PageReference
     **/
    public static PageReference onLoadValidator(){        
        PageReference communityUri = new PageReference(MANAGE_PERMISSIONS_MDT_RECS.Community_URL__c);
        String code = System.currentPageReference().getParameters().get('code');        
        if (String.isBlank(code)){
            ApexPages.addmessage(new ApexPages.message(ApexPages.severity.WARNING, 'Login Failed! Please Login again.'));
        } else{
            getTokenFromCode(code);
            //system.debug('@@getTokenFromCode-=+' + getTokenFromCode(code));
        }
        communityUri.setRedirect(false);        
        return communityUri;
    }

    /**
     * @description  : Method to get Token from code
     * @param        : code
     * @return       : none
     **/
    public static void getTokenFromCode(String code){

        HttpResponse response = getToken(LOGIN_URI, code);
        if (response.getStatusCode() != 200){
            response = getToken(TEST_URI, code);
        }

        Map<String, Object> results = (Map<String, Object>)JSON.deserializeUntyped(response.getBody());
        token = (String) results.get('access_token');       
        String[] splitToken = token.split('!');        
        companyId = splitToken[0];
        orgUrl = (String) results.get('instance_url');
        String temp = (String) results.get('id');
        String[] splitUrl = temp.split('id');

        Id userId = UserInfo.getUserId();
        User user = [SELECT Id, contactId
                     FROM User
                     WHERE Id = :userId
                     WITH SECURITY_ENFORCED];
        Id contactId = user?.contactId;
        createDestinationOrgRecord(contactId);
    }

    /**
     * @description  : to create record for logged in destination org
     * @param        : contactId
     * @return       : none
     **/
    @TestVisible
    private static void createDestinationOrgRecord(Id contactId){

        DateTime expiryTime = Datetime.now().addMinutes(60);
        List<DestinationOrg__c> destOrgList = new List<DestinationOrg__c>();
        //Update/Create destination org details
        destOrgList = [SELECT Name, Contact__c, OrgUrl__c, OrgType__c, TokenExpiryTime__c, Access_Token__c
                       FROM DestinationOrg__c
                       WHERE Contact__c = :contactId
                       WITH SECURITY_ENFORCED];
        List<DestinationOrg__c> destOrgNewList = new List<DestinationOrg__c>();
        Integer flag = 0;

        if (!destOrgList.isEmpty()){
            for (DestinationOrg__c dest : destOrgList){
                if (dest.Name.equalsIgnoreCase(companyId)){
                    if (dest.TokenExpiryTime__c < Datetime.now()){
                        dest.Access_Token__c = token;
                        dest.Active__c = true;
                        dest.TokenExpiryTime__c = Datetime.now().addMinutes(60);
                    }
                    dest.Active__c = true;
                    destOrgNewList.add(dest);
                    flag = 1;
                }
            }
        }
        if (flag == 0 || destOrgList.isEmpty()){
            getNewOrgDetails();
            //create remote
            //MetadataAPIUtility.createRemoteSiteSettings(getUserSessionId());
            DestinationOrg__c destOrg = new DestinationOrg__c(Name = companyId, OrgUrl__c = orgUrl, OrgType__c = orgType, Access_Token__c = token, Contact__c = contactId, TokenExpiryTime__c = expiryTime, Active__c = true, Org_Name__c = orgName);
            destOrgNewList.add(destOrg);
        }
        if (!destOrgNewList.isEmpty()){
            //Check if the current user has create permission
            //commenting access check as the qa user do not have access to the object/fields.
            SObjectAccessDecision securityDecision = Security.stripInaccessible(AccessType.UPSERTABLE, destOrgNewList);
            UPSERT securityDecision.getRecords();
            //Database.upsert (destOrgNewList, false);
        }
    }
    /**
    * @description 
    * @author CEPTES | 11-30-2022 
    **/
	@TestVisible
    private static void getNewOrgDetails(){

        Map<String, String> inputMap = new Map<String, String>{
            'accessToken' => token,
                'baseUrl' => orgUrl,
                'queryString' => 'query?q=SELECT+Name,IsSandbox+FROM+Organization',
                'method' => 'GET',
                'body' => ''};
        //String accessToken, String baseUrl, String baseOrgType, String endPointUrl, String method
        String response = ManagePermissionsUtility.getRestResponse(JSON.serialize(inputMap));
        //Parse the JSON String into a Map
        Map<String, Object> jsonParse = (Map<String, Object>)Json.deserializeUntyped(response);
        //Get the records - array of list
        List<Object> listObject = (List<Object>)jsonParse.get('records');
        if(listObject!=null && !listObject.isEmpty()) {
            for (Object o : listObject){
                Map<String, Object> orgDataMap = (Map<String, Object>)o;
                orgName = (String) orgDataMap.get('Name');
                orgType = orgDataMap.get('IsSandbox') == 'true' ? 'Sandbox' : 'Production';
            }
        }
    }

    /**
    * @description  :  
    * @author       : CEPTES | 11-30-2022 
    * @param baseUrl 
    * @param code 
    * @return HttpResponse 
    **/
    private static HttpResponse getToken(String baseUrl, String code){
        Http http = new Http();
        HttpRequest req = new HttpRequest();
        String messageBody = 'code=' + code + '&client_id=' + MANAGE_PERMISSIONS_MDT_RECS.Client_Id__c + '&client_secret=' + MANAGE_PERMISSIONS_MDT_RECS.Client_Secret__c + 
                         '&redirect_uri=' + MYORG_URL + '/apex/StoreDestinationOrgCodeVF' + '&grant_type=authorization_code'; //changes
        system.debug('@@messageBody -='+ messageBody);
        req.setHeader('content-type', 'application/x-www-form-urlencoded');
        req.setHeader('Content-length', String.valueOf(messageBody.length()));
        req.setMethod('POST');
        req.setEndpoint(baseUrl + '/services/oauth2/token');
        system.debug('@@response-=' + baseUrl + '/services/oauth2/token');
        req.setBody(messageBody);
        HttpResponse response = http.send(req);        
        return response;
    }

    

}