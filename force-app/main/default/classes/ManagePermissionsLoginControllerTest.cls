/*
*Author      : CEPTES
*Description : This is the test class for ManagePermissionsLoginControllerTest class
*CreatedDate : 30/11/2022
*/
@isTest
private class ManagePermissionsLoginControllerTest {
    
    /*
    * Method Name  : createData
    * Author       : CEPTES
    * Description  : method to create test data
    */ 
    @testSetup
    static void createData(){
        TestDataFactory.createDestinationOrgs(1);
    }

    /*
    * Method Name  : checkValidation
    * Author       : CEPTES
    * Description  : method to test validateAccessToken functionality
    */ 
    @isTest
    static void checkValidation(){
        String baseUrl = System.URL.getSalesforceBaseUrl().toExternalForm();
        test.startTest();
        DestinationOrg__c destorg1 = [Select id,OrgUrl__c from DestinationOrg__c limit 1];
        Test.setMock(HttpCalloutMock.class, new MockHttpResponseGenerator());
        try{
       ManagePermissionsLoginController.validateAccessToken(userinfo.getuserId());
        }Catch(Exception ex){}
       
        test.stopTest();
  
    }

    /*
    * Method Name  : checkValidationAcc
    * Author       : CEPTES
    * Description  : method to test validateAccessToken functionality
    */ 
    @isTest
    static void checkValidationAcc(){
        String baseUrl = System.URL.getSalesforceBaseUrl().toExternalForm();
        test.startTest();
        DestinationOrg__c destorg1 = [Select id,OrgUrl__c,Active__c from DestinationOrg__c limit 1];
        destorg1.Active__c = false;
        update destorg1;
        try{
        ManagePermissionsLoginController.validateAccessToken(userinfo.getuserId());
        }Catch(Exception ex){}
        
        test.stopTest();

    }

    /*
    * Method Name  : checkValidation1
    * Author       : CEPTES
    * Description  : method to test getRedirectUrl functionality
    */ 
    @isTest
    static void checkValidation1(){
        String baseUrl = System.URL.getSalesforceBaseUrl().toExternalForm();
        test.startTest();
        DestinationOrg__c destorg1 = [Select id,OrgUrl__c from DestinationOrg__c limit 1];
       
        try{
        ManagePermissionsLoginController.getRedirectUrl('Production');
        }catch(Exception ex){}
        test.stopTest();
  
    }

    /*
    * Method Name  : checkValidation2
    * Author       : CEPTES
    * Description  : method to test authorize functionality
    */ 
    @isTest
    static void checkValidation2(){
        String baseUrl = System.URL.getSalesforceBaseUrl().toExternalForm();
        test.startTest();
          
        Test.setMock(HttpCalloutMock.class, new MockHttpResponseGenerator());
        try{
        ManagePermissionsLoginController.authorize('Production',baseUrl,false);
        }Catch(Exception ex){
          system.debug('ex===1==='+ex);
        }
        try{
        ManagePermissionsLoginController.authorize('Production',baseUrl,true);
        }Catch(Exception ex){}
        
        test.stopTest();

    }

    /*
    * Method Name  : checkValidation3
    * Author       : CEPTES
    * Description  : method to test handleLogout functionality
    */
    @isTest
    static void checkValidation3(){
        String baseUrl = System.URL.getSalesforceBaseUrl().toExternalForm();
        test.startTest();
        DestinationOrg__c destorg1 = [Select id,OrgUrl__c from DestinationOrg__c limit 1];
        
        
        ManagePermissionsLoginController.handleLogout(userinfo.getuserId());
        ManagePermissionsLoginController.DestinationOrgWrapper destOrg= new ManagePermissionsLoginController.DestinationOrgWrapper();
        destOrg.name='';
        destOrg.token='Access_Token__c';
        destOrg.contact='';
        destOrg.orgUrl='URL.getSalesforceBaseUrl().toExternalForm();';
        destOrg.orgName='Org_Name__c';
        destOrg.orgType ='Production';
        destOrg.expiryDateTime=Date.today();
        List<ManagePermissionsLoginController.DestinationOrgWrapper> wrpLst = new List<ManagePermissionsLoginController.DestinationOrgWrapper>();
        wrpLst.add(destOrg);
        ManagePermissionsLoginController.ResponseWrapper respWrp= new ManagePermissionsLoginController.ResponseWrapper();
        respWrp.isActiveOrg=true;
        respWrp.activeOrg=destorg1;       
        respWrp.redirectUrl='';
        respWrp.destOrgWrapperList = wrpLst;
        test.stopTest();

  }
}