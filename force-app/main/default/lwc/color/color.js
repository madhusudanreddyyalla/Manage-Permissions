import { LightningElement } from 'lwc';

export default class Color extends LightningElement {

    colr(){
    document.getElementById("p1").style.background = "blue";
    }
}