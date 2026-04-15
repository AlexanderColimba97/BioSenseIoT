#include <WiFi.h>
#include <HTTPClient.h>
#include <BLEDevice.h>
#include <BLEServer.h>
#include <BLEUtils.h>
#include <BLE2902.h>
#include <Preferences.h>

#define SERVICE_UUID           "4fafc201-1fb5-459e-8fcc-c5c9c331914b"
#define CHARACTERISTIC_UUID    "beb5483e-36e1-4688-b7f5-ea07361b26a8"

Preferences preferences;
bool bleActive = false;
String macAddress = "";
String apiSecret = "sk_prod_biosense123xyz";

class MyCallbacks: public BLECharacteristicCallbacks {
    void onWrite(BLECharacteristic *pCharacteristic) {
      std::string value = pCharacteristic->getValue();
      if (value.length() > 0) {
        String payload = String(value.c_str());
        Serial.println("Received BLE Data: " + payload);
        
        int separatorIdx = payload.indexOf(',');
        if (separatorIdx > 0) {
           String ssid = payload.substring(0, separatorIdx);
           String pass = payload.substring(separatorIdx + 1);
           
           preferences.begin("wifi_creds", false);
           preferences.putString("ssid", ssid);
           preferences.putString("pass", pass);
           preferences.end();
           
           Serial.println("Credentials saved. Rebooting...");
           delay(1000);
           ESP.restart();
        }
      }
    }
};

void startBLE() {
  bleActive = true;
  BLEDevice::init("BioSense-" + macAddress.substring(12, 17));
  BLEServer *pServer = BLEDevice::createServer();
  BLEService *pService = pServer->createService(SERVICE_UUID);
  
  BLECharacteristic *pCharacteristic = pService->createCharacteristic(
                                         CHARACTERISTIC_UUID,
                                         BLECharacteristic::PROPERTY_READ |
                                         BLECharacteristic::PROPERTY_WRITE
                                       );

  pCharacteristic->setCallbacks(new MyCallbacks());
  pCharacteristic->setValue(macAddress.c_str());
  
  pService->start();
  BLEAdvertising *pAdvertising = BLEDevice::getAdvertising();
  pAdvertising->addServiceUUID(SERVICE_UUID);
  pAdvertising->setScanResponse(true);
  pAdvertising->setMinPreferred(0x06);  
  BLEDevice::startAdvertising();
  Serial.println("BLE Started. Awaiting credentials.");
}

void setup() {
  Serial.begin(115200);
  macAddress = WiFi.macAddress();
  Serial.println("MAC Address: " + macAddress);
  
  preferences.begin("wifi_creds", true);
  String ssid = preferences.getString("ssid", "");
  String pass = preferences.getString("pass", "");
  preferences.end();
  
  if(ssid == "") {
     startBLE();
     return;
  }
  
  WiFi.begin(ssid.c_str(), pass.c_str());
  int retries = 0;
  while(WiFi.status() != WL_CONNECTED && retries < 30) {
     delay(500);
     Serial.print(".");
     retries++;
  }
  
  if(WiFi.status() != WL_CONNECTED) {
     Serial.println("WiFi failed. Starting BLE.");
     startBLE();
  } else {
     Serial.println("\nWiFi Connected!");
  }
}

void loop() {
  if (bleActive) {
      delay(1000);
      return; 
  }
  
  if(WiFi.status() == WL_CONNECTED) {
      HTTPClient http;
      http.begin("https://biosenseiot-production-e061.up.railway.app/api/v2/sensors/reading");
      http.addHeader("Content-Type", "application/json");
      http.addHeader("X-BioSense-Key", apiSecret);
      
      String payload = "{\"macAddress\":\"" + macAddress + "\",\"mq4\":20.5,\"mq7\":15.2,\"mq135\":10.1}";
      
      int httpResponseCode = http.POST(payload);
      Serial.print("HTTP Response code: ");
      Serial.println(httpResponseCode);
      if(httpResponseCode == 403) {
          Serial.println("Error 403: Device rejected. Needs binding in the App.");
      }
      http.end();
  }
  delay(30000); // Send data every 30s
}
