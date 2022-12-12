/*
 * Class Name : AccountTrigger
 * Description : Trigger for Account 
 * CreatedBy : Rakhi Modi on 01/10/2022
 */
trigger AccountTrigger on Account (before update) {
    System.debug(System.now());
    if(Trigger.isBefore) {
        if(Trigger.isUpdate) {
            AccountTriggerHandler.beforeUpdate(Trigger.old, Trigger.newMap);
        }
    }
    System.debug(System.now());
}