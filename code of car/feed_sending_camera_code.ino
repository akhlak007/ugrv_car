#include <WiFi.h>
#include <HTTPClient.h>
#include "esp_camera.h"
#include "esp_http_server.h"
#include "img_converters.h"
#include "esp_mac.h"

#if __has_include("esp_arduino_version.h")
#include "esp_arduino_version.h"
#endif

// ================= CAMERA =================
#define PWDN_GPIO_NUM 32
#define RESET_GPIO_NUM -1
#define XCLK_GPIO_NUM 0
#define SIOD_GPIO_NUM 26
#define SIOC_GPIO_NUM 27
#define Y9_GPIO_NUM 35
#define Y8_GPIO_NUM 34
#define Y7_GPIO_NUM 39
#define Y6_GPIO_NUM 36
#define Y5_GPIO_NUM 21
#define Y4_GPIO_NUM 19
#define Y3_GPIO_NUM 18
#define Y2_GPIO_NUM 5
#define VSYNC_GPIO_NUM 25
#define HREF_GPIO_NUM 23
#define PCLK_GPIO_NUM 22
#define FLASH_LED_PIN 4

// ================= WIFI =================
const char* HUB_SSID="UGRV CAR";
const char* HUB_PASS="12345678";
const char* AP_SSID="UGRV-Camera";
const char* AP_PASS="12345678";

IPAddress AP_IP(192,168,10,1);
IPAddress AP_GW(192,168,10,1);
IPAddress AP_MASK(255,255,255,0);

// ================= DEVICE =================
String deviceID,deviceName="Smart Field Camera";
bool registered=false,regMessageShown=false;
unsigned long tHeartbeat=0,tRegister=0,tReconnect=0;
const unsigned long HEARTBEAT_MS=5000;
const unsigned long REGISTER_MS=10000;
const unsigned long RECONNECT_MS=10000;

// ================= FLASH =================
int flashLevel=0;
#define FLASH_FREQ 5000
#define FLASH_RES 8

// ================= SERVER =================
httpd_handle_t webServer=NULL,streamServer=NULL;

#define BOUNDARY_TEXT "123456789000000000000987654321"
static const char* STREAM_TYPE="multipart/x-mixed-replace;boundary=" BOUNDARY_TEXT;
static const char* STREAM_BOUNDARY="\r\n--" BOUNDARY_TEXT "\r\n";
static const char* STREAM_PART="Content-Type: image/jpeg\r\nContent-Length: %u\r\n\r\n";

// ================= DASHBOARD =================
static const char PAGE[] PROGMEM=R"HTML(
<!DOCTYPE html><html><head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width,initial-scale=1,user-scalable=no">
<title>Smart Village Camera</title>
<style>
*{box-sizing:border-box;-webkit-tap-highlight-color:transparent}
body{margin:0;min-height:100vh;font-family:Arial;color:#fff;background:#041613}
body:before{content:"";position:fixed;inset:-35%;z-index:-1;background:radial-gradient(circle at 20% 20%,#00e67622,transparent 28%),radial-gradient(circle at 80% 60%,#00bcd422,transparent 30%),linear-gradient(135deg,#03110e,#06251f,#061720);animation:bg 10s ease-in-out infinite alternate}
@keyframes bg{to{transform:translate(3%,2%) rotate(3deg)}}
.wrap{max-width:720px;margin:auto;padding:13px}.head{text-align:center;padding:9px 0 16px}
h1{font-size:25px;margin:5px;background:linear-gradient(90deg,#69f0ae,#40c4ff);color:transparent;background-clip:text;-webkit-background-clip:text}
.sub{font-size:11px;color:#8ca9a3}.live{display:inline-flex;align-items:center;gap:6px;background:#ffffff0c;border:1px solid #ffffff12;padding:6px 11px;border-radius:20px;margin-top:8px;font-size:10px}
.dot{width:8px;height:8px;border-radius:50%;background:#00e676;box-shadow:0 0 12px #00e676;animation:p 1s infinite}@keyframes p{50%{opacity:.25}}
.card{background:#ffffff0b;border:1px solid #ffffff17;border-radius:18px;padding:13px;box-shadow:0 10px 35px #0005;backdrop-filter:blur(12px)}
.row{display:flex;justify-content:space-between;align-items:center;gap:8px}.badge{font-size:10px;font-weight:bold;padding:6px 10px;border-radius:20px}
.ok{background:#00e67620;color:#69f0ae}.bad{background:#ff174422;color:#ff8a95}
.camera{position:relative;margin-top:11px;width:100%;aspect-ratio:4/3;border-radius:15px;overflow:hidden;background:#010504;border:1px solid #ffffff18}
.camera img{width:100%;height:100%;display:block;object-fit:contain;background:#000}
.tag{position:absolute;top:9px;left:9px;z-index:6;background:#ff9800dd;padding:5px 9px;border-radius:15px;font-size:10px;font-weight:bold}
.tag.online{background:#00c853dd;box-shadow:0 0 15px #00e67666}.tag.error{background:#ff1744dd}
.offline{position:absolute;inset:0;z-index:5;display:flex;align-items:center;justify-content:center;text-align:center;background:#020706;color:#ff8a95}
.offline small{display:block;margin-top:6px;color:#789b94}
.grid{display:grid;grid-template-columns:1fr 1fr;gap:8px;margin-top:10px}.info{background:#ffffff08;border:1px solid #ffffff10;padding:10px;border-radius:12px}
.info span{display:block;font-size:9px;color:#779b93;margin-bottom:4px}.info b{font-size:11px;word-break:break-all}
.ctrl{margin-top:10px;background:#ffffff08;border:1px solid #ffffff10;padding:11px;border-radius:13px}
input[type=range]{width:100%;accent-color:#ffd740;margin-top:8px}.btns{display:grid;grid-template-columns:1fr 1fr;gap:8px;margin-top:10px}
button{border:0;padding:11px;border-radius:11px;color:#fff;font-weight:bold;cursor:pointer}.blue{background:linear-gradient(135deg,#2979ff,#00b8d4)}.green{background:linear-gradient(135deg,#00c853,#00bfa5)}
.proto{margin-top:10px;background:#00e6760a;border:1px solid #00e67620;border-radius:12px;padding:10px;color:#8fb5ad;font-size:10px;line-height:1.7}.footer{text-align:center;padding:15px;color:#4d6d66;font-size:9px}
</style></head><body>

<div class="wrap">
<div class="head">
<div style="font-size:31px">📹</div>
<h1>SMART FIELD CAMERA</h1>
<div class="sub">Plug & Play Smart Village IoT Camera Node</div>
<div class="live"><span class="dot"></span>CAMERA SYSTEM LIVE</div>
</div>

<div class="card">
<div class="row"><b>📷 FIELD SURVEILLANCE</b><span id="hub" class="badge bad">CHECKING</span></div>

<div class="camera">
<div id="tag" class="tag">CONNECTING...</div>
<img id="stream" alt="Camera Stream" onload="camOK()" onerror="camError()">
<div id="offline" class="offline"><div><div style="font-size:34px">📡</div><b>CONNECTING CAMERA</b><small id="cammsg">Starting stream...</small></div></div>
</div>

<div class="grid">
<div class="info"><span>DEVICE</span><b id="name">--</b></div>
<div class="info"><span>DEVICE ID</span><b id="id">--</b></div>
<div class="info"><span>CAMERA IP</span><b id="ip">--</b></div>
<div class="info"><span>HUB IP</span><b id="hubip">--</b></div>
<div class="info"><span>REGISTRATION</span><b id="reg">--</b></div>
<div class="info"><span>CONNECTION</span><b id="conn">--</b></div>
</div>

<div class="ctrl">
<div class="row"><b>🔦 CAMERA LIGHT</b><span id="fv">0</span></div>
<input id="flash" type="range" min="0" max="20" value="0">
</div>

<div class="btns">
<button class="blue" onclick="reloadStream()">↻ RELOAD STREAM</button>
<button class="green" onclick="snapshot()">📸 SNAPSHOT</button>
</div>

<div class="proto">
<b>Smart Village Protocol</b><br>
Device: /device<br>
Health: /health<br>
Snapshot: /snapshot<br>
Stream: :81/stream<br>
Flash: /flash?value=0-20
</div>
</div>
<div class="footer">ESP32 • GC2145 • SMART VILLAGE DEVICE NODE</div>
</div>

<script>
function $(x){return document.getElementById(x)}
function startStream(){
 let u="http://"+location.hostname+":81/stream?t="+Date.now();
 $("cammsg").innerText="Connecting to "+u;
 $("stream").src=u;
}
function camOK(){
 $("offline").style.display="none";
 $("tag").innerText="● LIVE";
 $("tag").className="tag online";
}
function camError(){
 $("offline").style.display="flex";
 $("cammsg").innerText="Stream unavailable";
 $("tag").innerText="STREAM ERROR";
 $("tag").className="tag error";
}
function reloadStream(){
 $("offline").style.display="flex";
 $("tag").innerText="CONNECTING...";
 $("tag").className="tag";
 $("stream").src="";
 setTimeout(startStream,300);
}
function snapshot(){window.open("/snapshot?t="+Date.now(),"_blank")}
$("flash").oninput=function(){
 $("fv").innerText=this.value;
 let x=new XMLHttpRequest();
 x.open("GET","/flash?value="+this.value,true);x.send();
}
function statusError(){
 $("hub").innerText="STATUS ERROR";
 $("hub").className="badge bad";
}
function update(){
 let x=new XMLHttpRequest();
 x.open("GET","/device?t="+Date.now(),true);x.timeout=2000;
 x.onload=function(){
  if(x.status!=200){statusError();return}
  try{
   let d=JSON.parse(x.responseText);
   $("name").innerText=d.name;
   $("id").innerText=d.id;
   $("ip").innerText=d.ip;
   $("hubip").innerText=d.hubIP||"Not connected";
   $("reg").innerText=d.registered?"REGISTERED":"WAITING";
   $("conn").innerText=d.hubConnected?"SMART VILLAGE":"FALLBACK AP";
   if(d.hubConnected){
    $("hub").innerText=d.registered?"● REGISTERED":"● HUB CONNECTED";
    $("hub").className="badge ok";
   }else{
    $("hub").innerText="STANDALONE";
    $("hub").className="badge bad";
   }
  }catch(e){statusError()}
 };
 x.onerror=statusError;x.ontimeout=statusError;x.send();
}
window.onload=function(){startStream();update();setInterval(update,2000)}
</script></body></html>
)HTML";

// ================= HELPERS =================
String makeID(){
  uint8_t mac[6]; esp_read_mac(mac,ESP_MAC_WIFI_STA);
  char id[24];
  snprintf(id,sizeof(id),"CAM-%02X%02X%02X%02X%02X%02X",mac[0],mac[1],mac[2],mac[3],mac[4],mac[5]);
  return String(id);
}
bool hubConnected(){return WiFi.status()==WL_CONNECTED;}
String getHubIP(){return hubConnected()?WiFi.gatewayIP().toString():"";}
String getCamIP(){return hubConnected()?WiFi.localIP().toString():WiFi.softAPIP().toString();}

String deviceJSON(){
  String j="{";
  j+="\"protocol\":\"smart-village-v1\",";
  j+="\"id\":\""+deviceID+"\",";
  j+="\"name\":\""+deviceName+"\",";
  j+="\"deviceType\":\"camera\",";
  j+="\"ip\":\""+getCamIP()+"\",";
  j+="\"hubIP\":\""+getHubIP()+"\",";
  j+="\"hubConnected\":";j+=hubConnected()?"true":"false";j+=",";
  j+="\"registered\":";j+=registered?"true":"false";j+=",";
  j+="\"capabilities\":{";
  j+="\"video\":{\"type\":\"mjpeg\",\"port\":81,\"path\":\"/stream\"},";
  j+="\"snapshot\":{\"type\":\"image\",\"port\":80,\"path\":\"/snapshot\"},";
  j+="\"flash\":{\"type\":\"slider\",\"min\":0,\"max\":20,\"value\":"+String(flashLevel)+",\"path\":\"/flash?value={value}\"}";
  j+="}}";
  return j;
}

// ================= CAMERA =================
bool initCamera(){
  camera_config_t c={};
  c.ledc_channel=LEDC_CHANNEL_0;c.ledc_timer=LEDC_TIMER_0;
  c.pin_d0=Y2_GPIO_NUM;c.pin_d1=Y3_GPIO_NUM;c.pin_d2=Y4_GPIO_NUM;c.pin_d3=Y5_GPIO_NUM;
  c.pin_d4=Y6_GPIO_NUM;c.pin_d5=Y7_GPIO_NUM;c.pin_d6=Y8_GPIO_NUM;c.pin_d7=Y9_GPIO_NUM;
  c.pin_xclk=XCLK_GPIO_NUM;c.pin_pclk=PCLK_GPIO_NUM;c.pin_vsync=VSYNC_GPIO_NUM;c.pin_href=HREF_GPIO_NUM;
  c.pin_sccb_sda=SIOD_GPIO_NUM;c.pin_sccb_scl=SIOC_GPIO_NUM;c.pin_pwdn=PWDN_GPIO_NUM;c.pin_reset=RESET_GPIO_NUM;
  c.xclk_freq_hz=10000000;c.pixel_format=PIXFORMAT_RGB565;c.frame_size=FRAMESIZE_QVGA;
  c.jpeg_quality=15;c.fb_count=1;c.grab_mode=CAMERA_GRAB_WHEN_EMPTY;
  c.fb_location=psramFound()?CAMERA_FB_IN_PSRAM:CAMERA_FB_IN_DRAM;

  Serial.println(psramFound()?"PSRAM detected.":"WARNING: No PSRAM.");
  Serial.println("Initializing GC2145 camera...");

  esp_err_t e=esp_camera_init(&c);
  if(e!=ESP_OK){Serial.printf("Camera init failed: 0x%X\n",e);return false;}

  sensor_t *s=esp_camera_sensor_get();
  if(s){Serial.printf("Camera PID: 0x%04X\n",s->id.PID);s->set_framesize(s,FRAMESIZE_QVGA);}
  Serial.println("Camera initialized.");
  return true;
}

// ================= HTTP =================
static esp_err_t pageHandler(httpd_req_t *r){
  httpd_resp_set_type(r,"text/html");httpd_resp_set_hdr(r,"Cache-Control","no-store");
  return httpd_resp_send(r,PAGE,HTTPD_RESP_USE_STRLEN);
}
static esp_err_t deviceHandler(httpd_req_t *r){
  String j=deviceJSON();httpd_resp_set_type(r,"application/json");
  httpd_resp_set_hdr(r,"Access-Control-Allow-Origin","*");httpd_resp_set_hdr(r,"Cache-Control","no-store");
  return httpd_resp_send(r,j.c_str(),j.length());
}
static esp_err_t healthHandler(httpd_req_t *r){
  httpd_resp_set_hdr(r,"Access-Control-Allow-Origin","*");return httpd_resp_sendstr(r,"OK");
}
static esp_err_t flashHandler(httpd_req_t *r){
  char q[32]={},v[8]={};
  if(httpd_req_get_url_query_str(r,q,sizeof(q))==ESP_OK)
    if(httpd_query_key_value(q,"value",v,sizeof(v))==ESP_OK){
      flashLevel=constrain(atoi(v),0,20);
      ledcWrite(FLASH_LED_PIN,map(flashLevel,0,20,0,255));
    }
  httpd_resp_set_hdr(r,"Access-Control-Allow-Origin","*");
  return httpd_resp_sendstr(r,"OK");
}

// ================= SNAPSHOT =================
static esp_err_t snapshotHandler(httpd_req_t *r){
  camera_fb_t *fb=esp_camera_fb_get();
  if(!fb)return httpd_resp_send_err(r,HTTPD_500_INTERNAL_SERVER_ERROR,"Capture failed");

  uint8_t *jpg=NULL;size_t len=0;
  bool ok=frame2jpg(fb,70,&jpg,&len);
  esp_camera_fb_return(fb);

  if(!ok||!jpg||!len){
    if(jpg)free(jpg);
    return httpd_resp_send_err(r,HTTPD_500_INTERNAL_SERVER_ERROR,"JPEG conversion failed");
  }

  httpd_resp_set_type(r,"image/jpeg");
  httpd_resp_set_hdr(r,"Access-Control-Allow-Origin","*");
  httpd_resp_set_hdr(r,"Cache-Control","no-store");

  esp_err_t res=httpd_resp_send(r,(const char*)jpg,len);
  free(jpg);return res;
}

// ================= STREAM =================
static esp_err_t streamHandler(httpd_req_t *r){
  esp_err_t res=httpd_resp_set_type(r,STREAM_TYPE);
  if(res!=ESP_OK)return res;

  httpd_resp_set_hdr(r,"Access-Control-Allow-Origin","*");
  httpd_resp_set_hdr(r,"Cache-Control","no-store");

  while(true){
    camera_fb_t *fb=esp_camera_fb_get();
    if(!fb){Serial.println("Camera capture failed.");break;}

    uint8_t *jpg=NULL;size_t len=0;
    bool ok=frame2jpg(fb,70,&jpg,&len);
    esp_camera_fb_return(fb);

    if(!ok||!jpg||!len){
      if(jpg)free(jpg);
      Serial.println("JPEG conversion failed.");
      break;
    }

    char header[64];
    size_t hlen=snprintf(header,sizeof(header),STREAM_PART,len);

    // Original proven GC2145 sequence: header -> JPEG -> boundary
    res=httpd_resp_send_chunk(r,header,hlen);
    if(res==ESP_OK)res=httpd_resp_send_chunk(r,(const char*)jpg,len);
    if(res==ESP_OK)res=httpd_resp_send_chunk(r,STREAM_BOUNDARY,strlen(STREAM_BOUNDARY));

    free(jpg);
    if(res!=ESP_OK)break;
    delay(10);
  }
  return res;
}

// ================= SERVERS =================
void startServers(){
  httpd_config_t c=HTTPD_DEFAULT_CONFIG();
  c.server_port=80;c.lru_purge_enable=true;

  httpd_uri_t u1={};u1.uri="/";u1.method=HTTP_GET;u1.handler=pageHandler;
  httpd_uri_t u2={};u2.uri="/device";u2.method=HTTP_GET;u2.handler=deviceHandler;
  httpd_uri_t u3={};u3.uri="/health";u3.method=HTTP_GET;u3.handler=healthHandler;
  httpd_uri_t u4={};u4.uri="/flash";u4.method=HTTP_GET;u4.handler=flashHandler;
  httpd_uri_t u5={};u5.uri="/snapshot";u5.method=HTTP_GET;u5.handler=snapshotHandler;

  if(httpd_start(&webServer,&c)==ESP_OK){
    httpd_register_uri_handler(webServer,&u1);
    httpd_register_uri_handler(webServer,&u2);
    httpd_register_uri_handler(webServer,&u3);
    httpd_register_uri_handler(webServer,&u4);
    httpd_register_uri_handler(webServer,&u5);
  }else Serial.println("Web server failed.");

  httpd_config_t sc=HTTPD_DEFAULT_CONFIG();
  sc.server_port=81;sc.ctrl_port=c.ctrl_port+1;sc.lru_purge_enable=true;

  httpd_uri_t us={};us.uri="/stream";us.method=HTTP_GET;us.handler=streamHandler;
  if(httpd_start(&streamServer,&sc)==ESP_OK)httpd_register_uri_handler(streamServer,&us);
  else Serial.println("Stream server failed.");
}

// ================= FALLBACK AP =================
void startFallback(){
  WiFi.softAPConfig(AP_IP,AP_GW,AP_MASK);
  WiFi.softAP(AP_SSID,AP_PASS);

  Serial.println();
  Serial.println("Fallback Camera AP started");
  Serial.print("WiFi: ");Serial.println(AP_SSID);
  Serial.print("Fallback IP: ");Serial.println(WiFi.softAPIP());
}

// ================= SMART VILLAGE =================
void connectHub(){
  Serial.println();
  Serial.print("Connecting to Smart Village");
  WiFi.begin(HUB_SSID,HUB_PASS);

  unsigned long start=millis();
  while(!hubConnected()&&millis()-start<10000){delay(400);Serial.print(".");}
  Serial.println();

  if(hubConnected()){
    Serial.println("Smart Village connected.");
    Serial.print("Camera DHCP IP: ");Serial.println(WiFi.localIP());
    Serial.print("Hub / Gateway: ");Serial.println(WiFi.gatewayIP());
  }else{
    Serial.println("Smart Village unavailable.");
    Serial.println("Using fallback AP.");
  }
}

// ================= REGISTER =================
void registerHub(){
  if(!hubConnected())return;

  WiFiClient client;
  HTTPClient http;
  String url="http://"+getHubIP()+"/register";
  http.setTimeout(1500);

  if(!http.begin(client,url))return;

  http.addHeader("Content-Type","application/json");
  String payload=deviceJSON();
  int code=http.POST(payload);
  String response=code>0?http.getString():"";
  response.trim();

  if(code==200&&response=="SV_REGISTERED"){
    if(!registered)Serial.println("Smart Village registration successful.");
    registered=true;regMessageShown=false;
  }else{
    registered=false;
    if(!regMessageShown){
      Serial.print("Hub connected; device registration not supported yet. HTTP: ");
      Serial.println(code);
      regMessageShown=true;
    }
  }

  http.end();
}

// ================= HEARTBEAT =================
void heartbeat(){
  if(!hubConnected()||!registered)return;

  WiFiClient client;
  HTTPClient http;

  String url="http://"+getHubIP()+"/heartbeat?id="+deviceID+"&ip="+WiFi.localIP().toString();
  http.setTimeout(1000);

  if(!http.begin(client,url))return;

  int code=http.GET();
  String response=code>0?http.getString():"";
  response.trim();
  http.end();

  if(code!=200||response!="SV_ALIVE"){
    registered=false;
    regMessageShown=false;
    Serial.println("Heartbeat lost - registration required.");
  }
}

// ================= WIFI RECOVERY =================
void manageWiFi(){
  if(hubConnected())return;

  registered=false;
  regMessageShown=false;

  if(millis()-tReconnect<RECONNECT_MS)return;
  tReconnect=millis();

  Serial.println("Trying Smart Village reconnect...");
  WiFi.disconnect(false);
  WiFi.begin(HUB_SSID,HUB_PASS);
}

// ================= SETUP =================
void setup(){
  Serial.begin(115200);
  delay(1000);

  Serial.println();
  Serial.println("========================================");
  Serial.println(" SMART VILLAGE PLUG & PLAY CAMERA NODE");
  Serial.println(" RHYX-M21-45 / GC2145");
  Serial.println("========================================");

#if defined(ESP_ARDUINO_VERSION_MAJOR)
  Serial.printf("ESP32 Core: %d.%d.%d\n",ESP_ARDUINO_VERSION_MAJOR,ESP_ARDUINO_VERSION_MINOR,ESP_ARDUINO_VERSION_PATCH);
  if(ESP_ARDUINO_VERSION_MAJOR<3){
    Serial.println("ERROR: ESP32 Arduino Core 3.x required.");
    while(true)delay(1000);
  }
#endif

  WiFi.mode(WIFI_AP_STA);
  WiFi.setSleep(false);

  deviceID=makeID();
  Serial.print("Device ID: ");Serial.println(deviceID);

  startFallback();

  if(!ledcAttach(FLASH_LED_PIN,FLASH_FREQ,FLASH_RES))
    Serial.println("Flash PWM initialization failed.");

  ledcWrite(FLASH_LED_PIN,0);

  if(!initCamera()){
    Serial.println("CAMERA INITIALIZATION FAILED.");
    while(true)delay(1000);
  }

  startServers();
  connectHub();

  Serial.println();
  Serial.println("========================================");
  Serial.println(" CAMERA READY");
  Serial.println("========================================");
  Serial.print("Fallback Dashboard: http://");Serial.println(WiFi.softAPIP());

  if(hubConnected()){
    Serial.print("Smart Village Camera: http://");Serial.println(WiFi.localIP());
    Serial.print("Live Stream: http://");Serial.print(WiFi.localIP());Serial.println(":81/stream");
    Serial.print("Device JSON: http://");Serial.print(WiFi.localIP());Serial.println("/device");
  }

  Serial.println("========================================");

  tRegister=millis()-REGISTER_MS;
}

// ================= LOOP =================
void loop(){
  manageWiFi();

  if(hubConnected()&&!registered&&millis()-tRegister>=REGISTER_MS){
    tRegister=millis();
    registerHub();
  }

  if(hubConnected()&&registered&&millis()-tHeartbeat>=HEARTBEAT_MS){
    tHeartbeat=millis();
    heartbeat();
  }

  delay(20);
}
