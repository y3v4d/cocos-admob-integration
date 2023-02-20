# Cocos AdMob Integration

This example program showcases how to integrate AdMob for the Android platform in the newest version of Cocos Creator (3.7.1).

## Notes
For current version of AdMob to work the project needs to be built with **minimum Android SDK version of 31**. Trying to compile the project with lower SDK will result in AdMob dependency error.

## Typescript

There are two functions registered in the `GameManager.ts` script that can be invoked by Java: 
- `loadInterstitialCompleted` - takes argument that will be equal to **true** if ad was loaded successfully or **false** if it wasn't. Invokes `onLoadInterstitialCompleted`.
- `interstitialClosed` - takes optional argument that will contain error message on failure. Invokes `onInterstitialClosed`.

```ts
/* scripts/GameManager.ts */

@ccclass('GameManager')
export class GameManager extends Component {
    /* ... */
    private status: AdStatus;
    
    onLoad() {
        /* ... */
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
        /* ... */

        // show proper button depending on current status
        this.interstitialLoadButton.node.active = status !== AdStatus.LOADED;
        this.interstitialShowButton.node.active = status === AdStatus.LOADED;

        // when loading only load button can be visible, and it needs to be turned off to prevent multiple loadings
        this.interstitialLoadButton.interactable = status !== AdStatus.LOADING;

        this.status = status;
    }

    /* callback for load button */
    onInterstitialLoadButtonClicked(event, customEventData) {
        if(!NATIVE || this.status === AdStatus.LOADED) return;

        native.bridge.sendToNative('loadInterstitial');
        this.setAdStatus(AdStatus.LOADING);
    }

    /* callback for show button */
    onInterstitialShowButtonClicked(event, customEventData) {
        if(!NATIVE || this.status !== AdStatus.LOADED) return;

        native.bridge.sendToNative("showInterstitial");
    }
}
```

## Java

All modifications were performed inside the `native/engine/android` directory, since it's the only way for now to modify the Android build without needing to rewrite the changes every build.
For the purpose of the showcase, test application id and ad id is used. In the real project, these values should be replaced with real ids.

There are two functions registered in the `AppActivity.java` that can be invoked by Typescript:
- `loadInterstitial` - function that will load the interstitial ad and inform the Typescript of the status by using `loadInterstitialCompleted` bridge function. Invokes `loadInterstitial` function.
- `showInterstitial` - function that will show the interstitial ad and inform the Typescript of the status by using `interstitialClosed` bridge function. Invokes `showInterstitial` function.

### build.gradle

```
...
dependencies {
    implementation 'com.google.android.gms:play-services-ads:21.5.0'
    ...
}
```

### AndroidManifest.xml

```xml
<meta-data
    android:name="com.google.android.gms.ads.APPLICATION_ID"
    android:value="ca-app-pub-3940256099942544~3347511713"/>
```

### AppActivity.java

```java
public class AppActivity extends CocosActivity {
    private InterstitialAd mInterstitialAd;

    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);

        // AdMob initialization
        MobileAds.initialize(this, new OnInitializationCompleteListener() {
            @Override
            public void onInitializationComplete(@NonNull InitializationStatus initializationStatus) {
                Log.d("AdMob", "Initialized successfully");
            }
        });

        // Initialize bridge function that Typescript can call
        JsbBridge.setCallback(new JsbBridge.ICallback() {
            @Override
            public void onScript(String arg0, String arg1) {
                if(Objects.equals(arg0, "showInterstitial")) {
                    showInterstitial();
                } else if(Objects.equals(arg0, "loadInterstitial")) {
                    loadInterstitial();
                } else {
                    Log.d("JsbBridge", "Invalid method name: " + arg0);
                }
            }
        });

        SDKWrapper.shared().init(this);
    }

    protected void showInterstitial() {
        if(mInterstitialAd != null) {
            this.runOnUiThread(() -> {
                mInterstitialAd.setFullScreenContentCallback(new FullScreenContentCallback() {
                    @Override
                    public void onAdDismissedFullScreenContent() {
                        Log.d("AdMob", "Dismissed fullscreen content callback");

                        mInterstitialAd = null;
                        JsbBridge.sendToScript("interstitialClosed");
                    }

                    @Override
                    public void onAdFailedToShowFullScreenContent(@NonNull AdError adError) {
                        Log.d("AdMob", "Failed to show fullscreen content, error: " + adError);

                        mInterstitialAd = null;
                        JsbBridge.sendToScript("interstitialClosed", adError.toString());
                    }
                });

                mInterstitialAd.show(this);
            });
        } else {
            Log.d("AdMob", "Interstitial not loaded");

            JsbBridge.sendToScript("interstitialClosed", "Interstitial not loaded");
        }
    }

    protected void loadInterstitial() {
        this.runOnUiThread(() -> {
            AdRequest adRequest = new AdRequest.Builder().build();
            InterstitialAd.load(this, "ca-app-pub-3940256099942544/1033173712", adRequest, new InterstitialAdLoadCallback() {
                @Override
                public void onAdLoaded(@NonNull InterstitialAd interstitialAd) {
                    Log.d("AdMob", "Loaded interstitial ad");

                    mInterstitialAd = interstitialAd;
                    JsbBridge.sendToScript("loadInterstitialCompleted", "true");
                }
                @Override
                public void onAdFailedToLoad(@NonNull LoadAdError loadAdError) {
                    Log.d("AdMob", loadAdError.toString());

                    mInterstitialAd = null;
                    JsbBridge.sendToScript("loadInterstitialCompleted", "false");
                }
            });
        });
    }
    
    /* ... */
}
```

## Sources

- https://docs.cocos.com/creator/manual/en/editor/publish/setup-native-development.html
- https://docs.cocos.com/creator/manual/en/advanced-topics/js-java-bridge.html
- https://developers.google.com/admob/android/quick-start
- https://developers.google.com/admob/android/interstitial
