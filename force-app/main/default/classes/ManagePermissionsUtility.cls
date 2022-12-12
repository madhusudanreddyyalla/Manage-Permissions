/**
 * @description       : Helper class for Manage Permissions
 * @author            : CEPTES
 * @last modified on  : 12-02-2022
 * @last modified by  : CEPTES
 **/
public with sharing class ManagePermissionsUtility{
    /**
     * @description      : To convert list to string format
     * @author           : CEPTES | 12-02-2022
     * @param            : selectedValues, type
     * @return           : String
     **/
    public static String getStringFormated(List<String> selectedValues, string type){
        String valueStr = '';
        for (String value : selectedValues){
            valueStr += type + '=\'' + value + '\'' + '+OR+';
        }
        return valueStr.removeEnd('+OR+');
    }

    /**
     * @description      : To make rest call and get response
     * @author           : CEPTES
     * @param            : jsonDataStr
     * @return           : String
     **/
    @AuraEnabled
    public static String getRestResponse(String jsonDataStr){
        RestInputWrapper wrapper = (RestInputWrapper) JSON.deserialize(jsonDataStr, RestInputWrapper.class);        
        Http http = new Http();
        HttpRequest request = new HttpRequest();
        system.debug('@@wrapper.baseUrl-='+wrapper.baseUrl);
        request.setEndpoint(wrapper.baseUrl + '/services/data/v55.0/' + wrapper.queryString);
        request.setHeader('Authorization', 'Bearer ' + wrapper.accessToken);
        request.setHeader('Content-Type', 'application/json');
        request.setMethod(wrapper.method);
        if (String.isNotBlank(wrapper.body)){
            request.setBody(wrapper.body);
        }
        HttpResponse response = http.send(request);

        return response.getBody();
    }
    //Wrapper class to hold input details for making rest api call
    public class RestInputWrapper{
        public string accessToken;
        public string baseUrl;
        public string queryString;
        public string method;
        public string body;

    }

}