import { _decorator, Component, Node, native, log } from 'cc';
const { ccclass, property } = _decorator;

@ccclass('GameManager')
export class GameManager extends Component {
    onShowInterstitialClicked(event, customEventData) {
        log("Send message to native: showInterstitial");
        native.bridge.sendToNative("showInterstitial");
    }
}