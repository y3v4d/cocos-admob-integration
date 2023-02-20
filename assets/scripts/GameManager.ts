import { _decorator, Component, Node, native, log, Label, Button } from 'cc';
import { NATIVE } from 'cc/env';
const { ccclass, property } = _decorator;

enum AdStatus {
    NONE = 0,
    LOADING = 1,
    LOADED = 2,
    SHOWED = 3,
    ERROR = 4
}

@ccclass('GameManager')
export class GameManager extends Component {
    @property(Label)
    private interstitialStatusLabel: Label = null;

    @property(Button)
    private interstitialLoadButton: Button = null;

    @property(Button)
    private interstitialShowButton: Button = null;

    private status: AdStatus;
    
    onLoad() {
        this.setAdStatus(AdStatus.NONE);
        if(!NATIVE) return;
        
        native.bridge.onNative = (name: string, arg?: string) => {
            if(name === "loadInterstitialCompleted") {
                this.onLoadInterstitialCompleted(arg);
            } else if(name === "interstitialClosed") {
                this.onInterstitialClosed(arg);
            } else log(`Native tried to call unkown method ${name}`);
        }
    }

    onLoadInterstitialCompleted(status: string) {
        this.setAdStatus(status === "true" ? AdStatus.LOADED : AdStatus.ERROR);
    }

    onInterstitialClosed(error?: string) {
        this.setAdStatus(error ? AdStatus.ERROR : AdStatus.SHOWED);
    }

    setAdStatus(status: AdStatus) {
        if(status === AdStatus.LOADING) {
            this.interstitialStatusLabel.string = "Loading...";
        } else if(status === AdStatus.LOADED) {
            this.interstitialStatusLabel.string = "Loaded";
        } else if(status === AdStatus.ERROR) {
            this.interstitialStatusLabel.string = "Error";
        } else if(status === AdStatus.SHOWED) {
            this.interstitialStatusLabel.string = "Showed";
        }

        this.interstitialLoadButton.node.active = status !== AdStatus.LOADED;
        this.interstitialShowButton.node.active = status === AdStatus.LOADED;

        this.interstitialLoadButton.interactable = status !== AdStatus.LOADING;

        this.status = status;
    }

    protected onInterstitialLoadButtonClicked(event, customEventData) {
        if(!NATIVE || this.status === AdStatus.LOADED) return;

        native.bridge.sendToNative('loadInterstitial');
        this.setAdStatus(AdStatus.LOADING);
    }

    protected onInterstitialShowButtonClicked(event, customEventData) {
        if(!NATIVE || this.status !== AdStatus.LOADED) return;

        native.bridge.sendToNative("showInterstitial");
    }
}