#include <WiFi.h>
#include <WebServer.h>
#include <LittleFS.h>
#include <FS.h>
#include <time.h>

// ================= PINS =================
#define IN1 14
#define IN2 18
#define IN3 19
#define IN4 25
#define ENA 32
#define ENB 33
#define SERVO_PIN 13
#define L_TRIG 12
#define L_ECHO 34
#define R_TRIG 15
#define R_ECHO 35

// ================= CONFIG =================
#define MOTOR_FREQ 1000
#define MOTOR_RES 8
#define SERVO_FREQ 50
#define SERVO_RES 16

const char* AP_SSID="UGRV CAR";
const char* AP_PASS="12345678";

IPAddress AP_IP(192,168,4,1);
IPAddress AP_GW(192,168,4,1);
IPAddress AP_MASK(255,255,255,0);

const char* LOG_FILE="/sonar.csv";

const unsigned long LOG_INTERVAL=20000;   // 20 sec
const unsigned long SONAR_INTERVAL=70;
const unsigned long FAILSAFE=800;
const unsigned long CAMERA_TIMEOUT=15000;

#define MAX_RECENT 100

WebServer server(80);

// ================= CAR =================
int speedPct=70;
int servoAngle=90;
char direction='S';
unsigned long lastDrive=0;

// ================= SONAR =================
float leftCM=-1,rightCM=-1;
uint8_t leftMiss=0,rightMiss=0;
bool sonarSide=false;
unsigned long lastSonar=0;

// ================= CAMERA =================
String cameraIP="",cameraID="",cameraName="";
unsigned long cameraSeen=0;

// ================= TIME =================
bool timeSynced=false;
uint64_t baseEpoch=0;
uint32_t baseMillis=0;
long timezoneOffset=21600; // default Bangladesh UTC+6

// ================= LOGGER =================
bool fsOK=false;
bool storageFull=false;

uint32_t totalRecords=0;
size_t logBytes=0;
size_t maxLogBytes=0;

unsigned long lastLog=0;

// ================= RECENT ROW CACHE =================
struct LogRow{
  char date[11];
  char tim[12];
  float left;
  float right;
};

LogRow recent[MAX_RECENT];
uint16_t recentHead=0;
uint16_t recentCount=0;

// =================================================
// HELPERS
// =================================================
bool cameraOnline(){
  return cameraIP.length() && millis()-cameraSeen<CAMERA_TIMEOUT;
}

String jsonEscape(String s){
  s.replace("\\","\\\\");
  s.replace("\"","\\\"");
  s.replace("\r","");
  s.replace("\n","\\n");
  return s;
}

String jsonValue(const String &j,const String &key){
  String tag="\""+key+"\"";

  int p=j.indexOf(tag);
  if(p<0)return "";

  int c=j.indexOf(':',p+tag.length());
  if(c<0)return "";

  int q1=j.indexOf('"',c+1);
  if(q1<0)return "";

  int q2=j.indexOf('"',q1+1);
  if(q2<0)return "";

  return j.substring(q1+1,q2);
}

// =================================================
// MOTOR
// =================================================
void motorSpeed(){
  int pwm=map(speedPct,0,100,0,255);

  ledcWrite(ENA,pwm);
  ledcWrite(ENB,pwm);
}

void drive(char c){
  direction=c;
  lastDrive=millis();

  switch(c){
    case 'F':
      digitalWrite(IN1,HIGH);digitalWrite(IN2,LOW);
      digitalWrite(IN3,HIGH);digitalWrite(IN4,LOW);
      break;

    case 'B':
      digitalWrite(IN1,LOW);digitalWrite(IN2,HIGH);
      digitalWrite(IN3,LOW);digitalWrite(IN4,HIGH);
      break;

    case 'L':
      digitalWrite(IN1,LOW);digitalWrite(IN2,HIGH);
      digitalWrite(IN3,HIGH);digitalWrite(IN4,LOW);
      break;

    case 'R':
      digitalWrite(IN1,HIGH);digitalWrite(IN2,LOW);
      digitalWrite(IN3,LOW);digitalWrite(IN4,HIGH);
      break;

    default:
      direction='S';

      digitalWrite(IN1,LOW);digitalWrite(IN2,LOW);
      digitalWrite(IN3,LOW);digitalWrite(IN4,LOW);
  }
}

// =================================================
// SERVO
// =================================================
void servoWrite(int angle){
  servoAngle=constrain(angle,0,180);

  uint32_t pulse=map(servoAngle,0,180,500,2400);
  uint32_t duty=(pulse*65535UL)/20000UL;

  ledcWrite(SERVO_PIN,duty);
}

// =================================================
// SONAR
// =================================================
float sonarRead(uint8_t trig,uint8_t echo){
  digitalWrite(trig,LOW);
  delayMicroseconds(2);

  digitalWrite(trig,HIGH);
  delayMicroseconds(10);

  digitalWrite(trig,LOW);

  unsigned long t=pulseIn(echo,HIGH,18000UL);

  if(!t)return -1;

  float cm=t*0.0343f/2.0f;

  return (cm>=2 && cm<=300)?cm:-1;
}

void sonarFilter(float value,float &filtered,uint8_t &miss){
  if(value<0){
    if(++miss>=3){
      miss=3;
      filtered=-1;
    }
    return;
  }

  miss=0;

  filtered=filtered<0?
           value:
           filtered*0.65f+value*0.35f;
}

void updateSonar(){
  if(millis()-lastSonar<SONAR_INTERVAL)return;

  lastSonar=millis();

  if(!sonarSide)
    sonarFilter(sonarRead(L_TRIG,L_ECHO),leftCM,leftMiss);
  else
    sonarFilter(sonarRead(R_TRIG,R_ECHO),rightCM,rightMiss);

  sonarSide=!sonarSide;
}

// =================================================
// TIME
// =================================================
void syncClock(uint64_t epoch,long offset){
  baseEpoch=epoch;
  baseMillis=millis();
  timezoneOffset=offset;
  timeSynced=true;

  Serial.println("\n========== TIME SYNC ==========");
  Serial.print("Epoch : ");
  Serial.println((unsigned long)epoch);

  Serial.print("TZ    : ");
  Serial.println(offset);

  Serial.println("Status: SYNCED");
  Serial.println("===============================");
}

bool getDateTime(String &date,String &tim){
  if(!timeSynced)return false;

  uint32_t elapsed=(millis()-baseMillis)/1000;

  time_t localTime=
    (time_t)(baseEpoch+elapsed+timezoneOffset);

  struct tm tmData;

  gmtime_r(&localTime,&tmData);

  char d[11];
  char t[12];

  strftime(d,sizeof(d),"%d-%m-%Y",&tmData);
  strftime(t,sizeof(t),"%I:%M:%S %p",&tmData);

  date=d;
  tim=t;

  return true;
}

// =================================================
// RECENT CACHE
// =================================================
void addRecent(
  const String &date,
  const String &tim,
  float left,
  float right
){
  LogRow &r=recent[recentHead];

  snprintf(r.date,sizeof(r.date),"%s",date.c_str());
  snprintf(r.tim,sizeof(r.tim),"%s",tim.c_str());

  r.left=left;
  r.right=right;

  recentHead=(recentHead+1)%MAX_RECENT;

  if(recentCount<MAX_RECENT)
    recentCount++;
}

// =================================================
// CSV PARSER
// =================================================
bool parseCSVRow(const String &line){
  int a=line.indexOf(',');
  int b=line.indexOf(',',a+1);
  int c=line.indexOf(',',b+1);

  if(a<0 || b<0 || c<0)return false;

  String date=line.substring(0,a);
  String tim=line.substring(a+1,b);

  float left=line.substring(b+1,c).toFloat();
  float right=line.substring(c+1).toFloat();

  date.trim();
  tim.trim();

  addRecent(date,tim,left,right);

  return true;
}

// =================================================
// FILE SYSTEM
// =================================================
void initStorage(){
  Serial.println("\n========== STORAGE ==========");

  if(!LittleFS.begin(true)){
    Serial.println("LittleFS mount FAILED");
    fsOK=false;
    return;
  }

  fsOK=true;

  size_t total=LittleFS.totalBytes();

  // Use maximum ~90% to leave filesystem safety space
  maxLogBytes=(total*90UL)/100UL;

  if(!LittleFS.exists(LOG_FILE)){
    File f=LittleFS.open(LOG_FILE,FILE_WRITE);

    if(f){
      f.println("Date,Time,Left Distance (cm),Right Distance (cm)");
      f.close();
    }
  }

  File f=LittleFS.open(LOG_FILE,FILE_READ);

  if(!f){
    Serial.println("Log file open FAILED");
    return;
  }

  logBytes=f.size();
  totalRecords=0;
  recentHead=0;
  recentCount=0;

  bool first=true;

  while(f.available()){
    String line=f.readStringUntil('\n');
    line.trim();

    if(!line.length())continue;

    if(first){
      first=false;
      continue;
    }

    if(parseCSVRow(line))
      totalRecords++;
  }

  f.close();

  storageFull=(logBytes>=maxLogBytes);

  Serial.print("FS Total : ");
  Serial.print(total);
  Serial.println(" bytes");

  Serial.print("Log Limit: ");
  Serial.print(maxLogBytes);
  Serial.println(" bytes");

  Serial.print("Log Used : ");
  Serial.print(logBytes);
  Serial.println(" bytes");

  Serial.print("Records  : ");
  Serial.println(totalRecords);

  Serial.print("Status   : ");
  Serial.println(storageFull?"FULL":"READY");

  Serial.println("=============================");
}

// =================================================
// LOGGER
// =================================================
void saveLog(){
  if(!fsOK || storageFull)return;
  if(!timeSynced)return;
  if(leftCM<0 || rightCM<0)return;

  String date,tim;

  if(!getDateTime(date,tim))
    return;

  String row=
    date+","+
    tim+","+
    String(leftCM,1)+","+
    String(rightCM,1)+"\n";

  if(logBytes+row.length()>=maxLogBytes){
    storageFull=true;

    Serial.println("LOGGER: STORAGE FULL");
    return;
  }

  File f=LittleFS.open(LOG_FILE,FILE_APPEND);

  if(!f){
    Serial.println("LOGGER: FILE OPEN ERROR");
    return;
  }

  size_t written=f.print(row);

  f.flush();
  f.close();

  if(written==row.length()){
    logBytes+=written;
    totalRecords++;

    addRecent(date,tim,leftCM,rightCM);

    Serial.print("LOG #");
    Serial.print(totalRecords);

    Serial.print(" | ");
    Serial.print(date);

    Serial.print(" ");
    Serial.print(tim);

    Serial.print(" | L:");
    Serial.print(leftCM,1);

    Serial.print(" | R:");
    Serial.println(rightCM,1);
  }
}

void updateLogger(){
  if(!timeSynced)return;

  if(lastLog==0){
    lastLog=millis()-LOG_INTERVAL;
  }

  if(millis()-lastLog<LOG_INTERVAL)return;

  lastLog=millis();

  saveLog();
}

// =================================================
// LOG JSON
// =================================================
String logsJSON(){
  String j="{\"total\":";
  j+=String(totalRecords);

  j+=",\"rows\":[";

  for(uint16_t i=0;i<recentCount;i++){
    int index=
      (recentHead+MAX_RECENT-1-i)%
      MAX_RECENT;

    LogRow &r=recent[index];

    if(i)j+=",";

    uint32_t no=
      totalRecords-i;

    j+="{\"no\":";
    j+=String(no);

    j+=",\"date\":\"";
    j+=r.date;
    j+="\"";

    j+=",\"time\":\"";
    j+=r.tim;
    j+="\"";

    j+=",\"left\":";
    j+=String(r.left,1);

    j+=",\"right\":";
    j+=String(r.right,1);

    j+="}";
  }

  j+="]}";

  return j;
}

// =================================================
// STATUS JSON
// =================================================
String stateJSON(){
  String j="{";

  j+="\"speed\":";
  j+=String(speedPct);

  j+=",\"servo\":";
  j+=String(servoAngle);

  j+=",\"dir\":\"";
  j+=direction;
  j+="\"";

  j+=",\"left\":";
  j+=String(leftCM,1);

  j+=",\"right\":";
  j+=String(rightCM,1);

  j+=",\"timeSynced\":";
  j+=timeSynced?"true":"false";

  j+=",\"records\":";
  j+=String(totalRecords);

  j+=",\"used\":";
  j+=String(logBytes);

  j+=",\"max\":";
  j+=String(maxLogBytes);

  j+=",\"full\":";
  j+=storageFull?"true":"false";

  j+=",\"fs\":";
  j+=fsOK?"true":"false";

  j+=",\"camera\":";
  j+=cameraOnline()?"true":"false";

  j+=",\"cameraIP\":\"";
  j+=jsonEscape(cameraIP);
  j+="\"";

  j+=",\"cameraName\":\"";
  j+=jsonEscape(cameraName);
  j+="\"";

  j+="}";

  return j;
}

// =================================================
// DASHBOARD
// =================================================
const char PAGE[] PROGMEM=R"UGRV(
<!DOCTYPE html>
<html>
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width,initial-scale=1,user-scalable=no">
<title>UGRV Smart Car</title>

<style>
*{box-sizing:border-box;-webkit-tap-highlight-color:transparent}
body{margin:0;background:#050a11;color:#eef7ff;font-family:Arial}
.app{max-width:900px;margin:auto;padding:12px}
.head,.row{display:flex;justify-content:space-between;align-items:center;gap:10px}
.head{margin:5px 2px 14px}
h2{margin:0;font-size:20px}
.sub,.title{font-size:9px;color:#7890a6}
.title{letter-spacing:1px;margin-bottom:8px}
.card{background:#101d2d;border:1px solid #ffffff12;border-radius:16px;padding:12px;margin-bottom:10px}
.badge{padding:6px 9px;border-radius:14px;font-size:9px;font-weight:bold}
.on{background:#0a392a;color:#65ffc0}
.off{background:#3c1219;color:#ff8995}
.wait{background:#42360f;color:#ffdb69}
.grid{display:grid;grid-template-columns:repeat(4,1fr);gap:7px}
.info,.sensor{background:#081522;border-radius:10px;padding:10px}
.info span,.sensor span{font-size:8px;color:#71889e;display:block}
.info b{font-size:11px;word-break:break-word}
.sonar{display:grid;grid-template-columns:1fr 1fr;gap:8px}
.sensor{text-align:center}
.sensor b{font-size:27px;color:#53deb0;display:block;margin:5px}
.sensor small{font-size:9px;color:#74899e}
.big{font-size:28px;font-weight:bold;color:#37b5ff}
input{width:100%;margin-top:10px}
input[type=range]{appearance:none;height:6px;border:0;background:#293c50}
input[type=range]::-webkit-slider-thumb{appearance:none;width:24px;height:24px;border-radius:50%;background:#31acff}
.control{display:grid;grid-template-columns:78px 78px 78px;grid-template-rows:78px 78px 78px;gap:9px;justify-content:center}
.ctrl{border:0;border-radius:20px;background:#172a3f;color:#fff;font-size:26px;font-weight:bold;touch-action:none}
.ctrl.active{transform:scale(.91);background:#087dbf}
.f{grid-column:2}.l{grid-column:1;grid-row:2}
.stop{grid-column:2;grid-row:2;background:#a32631;font-size:12px}
.r{grid-column:3;grid-row:2}.b{grid-column:2;grid-row:3}
.actions{display:flex;gap:7px;flex-wrap:wrap}
button,.download{border:0;border-radius:9px;padding:10px 14px;color:#fff;font-weight:bold;text-decoration:none;cursor:pointer;background:#1667bd}
.clear{background:#a52e38}
.refresh{background:#147a5d}
.tableWrap{overflow:auto;max-height:520px;border-radius:10px;border:1px solid #24384b}
table{width:100%;border-collapse:collapse;min-width:580px}
th{position:sticky;top:0;background:#16283b;color:#8fa7bc;font-size:9px;padding:10px}
td{background:#081522;border-top:1px solid #17293b;padding:9px;text-align:center;font-size:11px}
.storage{height:7px;background:#203549;border-radius:5px;overflow:hidden;margin-top:7px}
.storageFill{height:100%;background:#37b5ff;width:0}
.camera{position:relative;aspect-ratio:16/9;max-height:360px;background:#000;border-radius:12px;overflow:hidden}
.camera img{width:100%;height:100%;object-fit:contain}
.cover{position:absolute;inset:0;display:flex;align-items:center;justify-content:center;background:#020609;color:#758ca2;font-size:10px}
.live{position:absolute;top:7px;left:7px;display:none;background:#008b63;padding:5px 8px;border-radius:10px;font-size:8px;z-index:4}
.footer{text-align:center;color:#455a6f;font-size:8px;padding:5px}
@media(max-width:650px){.grid{grid-template-columns:1fr 1fr}}
</style>
</head>

<body>
<div class="app">

<div class="head">
 <div>
  <h2>UGRV SMART CAR</h2>
  <span class="sub">LOCAL FLASH DATA LOGGER</span>
 </div>
 <div id="status" class="badge on">ONLINE</div>
</div>

<div class="card">
 <div class="row">
  <div>
   <div class="title">DATA LOGGER</div>
   <b>Persistent LittleFS Storage</b>
  </div>
  <div id="timeStatus" class="badge wait">SYNCING TIME</div>
 </div>

 <div class="grid" style="margin-top:10px">
  <div class="info"><span>TOTAL RECORDS</span><b id="records">0</b></div>
  <div class="info"><span>LOG INTERVAL</span><b>20 SEC</b></div>
  <div class="info"><span>USED</span><b id="used">0 KB</b></div>
  <div class="info"><span>CAPACITY</span><b id="capacity">0 KB</b></div>
 </div>

 <div class="storage">
  <div id="storageFill" class="storageFill"></div>
 </div>
</div>

<div class="card">
 <div class="title">DUAL ULTRASONIC</div>

 <div class="sonar">
  <div class="sensor">
   <span>LEFT DISTANCE</span>
   <b id="left">--</b>
   <small>cm</small>
  </div>

  <div class="sensor">
   <span>RIGHT DISTANCE</span>
   <b id="right">--</b>
   <small>cm</small>
  </div>
 </div>
</div>

<div class="card">
 <div class="row">
  <div>
   <div class="title">MOTOR SPEED</div>
   <div class="big"><span id="speedValue">70</span>%</div>
  </div>

  <div>
   <span class="sub">DIRECTION</span><br>
   <b id="direction">STOP</b>
  </div>
 </div>

 <input id="speed" type="range" min="0" max="100" value="70">
</div>

<div class="card">
 <div class="row">
  <div>
   <div class="title">SERVO</div>
   <div class="big"><span id="servoValue">90</span>°</div>
  </div>
  <b>0° - 180°</b>
 </div>

 <input id="servo" type="range" min="0" max="180" value="90">
</div>

<div class="card">
 <div class="title" style="text-align:center">DRIVE CONTROL</div>

 <div class="control">
  <button class="ctrl f" data-c="F">▲</button>
  <button class="ctrl l" data-c="L">◀</button>
  <button class="ctrl stop" data-c="S">STOP</button>
  <button class="ctrl r" data-c="R">▶</button>
  <button class="ctrl b" data-c="B">▼</button>
 </div>
</div>

<div class="card">
 <div class="row">
  <div>
   <div class="title">LIVE CAMERA</div>
   <span id="camIP" class="sub">Waiting...</span>
  </div>
  <div id="camStatus" class="badge off">OFFLINE</div>
 </div>

 <div class="camera">
  <div id="live" class="live">LIVE</div>
  <img id="camera">
  <div id="cover" class="cover">WAITING FOR ESP32 CAMERA</div>
 </div>
</div>

<div class="card">
 <div class="row">
  <div>
   <div class="title">SONAR DATA TABLE</div>
   <span class="sub">Latest 100 records shown • CSV contains all records</span>
  </div>

  <div class="actions">
   <button class="refresh" onclick="loadLogs()">REFRESH</button>
   <a class="download" href="/download">DOWNLOAD CSV</a>
   <button class="clear" onclick="clearLogs()">CLEAR DATA</button>
  </div>
 </div>

 <div class="tableWrap" style="margin-top:10px">
  <table>
   <thead>
    <tr>
     <th>#</th>
     <th>DATE</th>
     <th>TIME</th>
     <th>LEFT (cm)</th>
     <th>RIGHT (cm)</th>
    </tr>
   </thead>
   <tbody id="logBody">
    <tr><td colspan="5">No data yet</td></tr>
   </tbody>
  </table>
 </div>
</div>

<div class="footer">
UGRV LOCAL DATA LOGGER • POWER LOSS PERSISTENT STORAGE
</div>

</div>

<script>
const $=id=>document.getElementById(id);
const GET=u=>fetch(u,{cache:"no-store"});
const names={F:"FORWARD",B:"BACKWARD",L:"LEFT",R:"RIGHT",S:"STOP"};

let active="S";
let driveTimer=null;
let speedTimer=null;
let servoTimer=null;
let camIP="";
let lastRecordCount=-1;

const sendDrive=c=>{
 active=c;
 GET("/cmd?m="+c).catch(()=>{});
 $("direction").innerText=names[c]||"STOP";
};

const stopDrive=b=>{
 if(b)b.classList.remove("active");

 clearInterval(driveTimer);
 driveTimer=null;

 if(active!=="S"){
  active="S";
  sendDrive("S");
 }
};

document.querySelectorAll(".ctrl").forEach(b=>{
 b.onpointerdown=e=>{
  e.preventDefault();

  b.classList.add("active");

  sendDrive(b.dataset.c);

  clearInterval(driveTimer);

  if(b.dataset.c!=="S")
   driveTimer=setInterval(()=>sendDrive(b.dataset.c),250);
 };

 b.onpointerup=()=>stopDrive(b);
 b.onpointercancel=()=>stopDrive(b);
 b.onpointerleave=()=>{if(b.dataset.c!=="S")stopDrive(b)};
});

$("speed").oninput=e=>{
 let v=e.target.value;

 $("speedValue").innerText=v;

 clearTimeout(speedTimer);

 speedTimer=setTimeout(()=>{
  GET("/speed?v="+v).catch(()=>{});
 },50);
};

$("servo").oninput=e=>{
 let v=e.target.value;

 $("servoValue").innerText=v;

 clearTimeout(servoTimer);

 servoTimer=setTimeout(()=>{
  GET("/servo?a="+v).catch(()=>{});
 },40);
};

// ================= PHONE TIME SYNC =================
const syncTime=()=>{
 let epoch=Math.floor(Date.now()/1000);
 let offset=-new Date().getTimezoneOffset()*60;

 GET("/syncTime?epoch="+epoch+"&offset="+offset)
 .then(r=>r.text())
 .then(()=>{
  $("timeStatus").innerText="TIME SYNCED";
  $("timeStatus").className="badge on";
 })
 .catch(()=>{});
};

// ================= CAMERA =================
const startCamera=()=>{
 if(!camIP)return;

 $("cover").style.display="flex";
 $("live").style.display="none";

 $("camera").src=
  "http://"+camIP+":81/stream?t="+Date.now();
};

$("camera").onload=()=>{
 $("cover").style.display="none";
 $("live").style.display="block";
};

$("camera").onerror=()=>{
 $("cover").innerText="CAMERA STREAM ERROR";
 $("cover").style.display="flex";
 $("live").style.display="none";
};

// ================= LOG TABLE =================
const loadLogs=()=>{
 GET("/logs?t="+Date.now())
 .then(r=>r.json())
 .then(d=>{
  let body=$("logBody");

  body.innerHTML="";

  if(!d.rows || !d.rows.length){
   body.innerHTML="<tr><td colspan='5'>No data yet</td></tr>";
   return;
  }

  d.rows.forEach(x=>{
   let tr=document.createElement("tr");

   tr.innerHTML=
    "<td>"+x.no+"</td>"+
    "<td>"+x.date+"</td>"+
    "<td>"+x.time+"</td>"+
    "<td>"+Number(x.left).toFixed(1)+"</td>"+
    "<td>"+Number(x.right).toFixed(1)+"</td>";

   body.appendChild(tr);
  });
 })
 .catch(()=>{});
};

const clearLogs=()=>{
 if(!confirm("Delete all saved sonar records?"))
  return;

 fetch("/clear",{method:"POST"})
 .then(r=>r.text())
 .then(()=>{
  lastRecordCount=-1;
  loadLogs();
  updateState();
 });
};

// ================= STATE =================
const updateState=()=>{
 GET("/state?t="+Date.now())
 .then(r=>r.json())
 .then(d=>{
  $("status").innerText="ONLINE";
  $("status").className="badge on";

  $("left").innerText=
   d.left<0?"--":Number(d.left).toFixed(1);

  $("right").innerText=
   d.right<0?"--":Number(d.right).toFixed(1);

  if(document.activeElement!==$("speed")){
   $("speed").value=d.speed;
   $("speedValue").innerText=d.speed;
  }

  if(document.activeElement!==$("servo")){
   $("servo").value=d.servo;
   $("servoValue").innerText=d.servo;
  }

  $("direction").innerText=
   names[d.dir]||"STOP";

  $("records").innerText=d.records;

  $("used").innerText=
   (d.used/1024).toFixed(1)+" KB";

  $("capacity").innerText=
   (d.max/1024).toFixed(1)+" KB";

  let percentage=
   d.max>0?
   Math.min(100,(d.used/d.max)*100):
   0;

  $("storageFill").style.width=
   percentage.toFixed(1)+"%";

  if(d.full){
   $("timeStatus").innerText="STORAGE FULL";
   $("timeStatus").className="badge off";
  }else if(d.timeSynced){
   $("timeStatus").innerText="TIME SYNCED";
   $("timeStatus").className="badge on";
  }else{
   $("timeStatus").innerText="SYNCING TIME";
   $("timeStatus").className="badge wait";
  }

  if(d.camera&&d.cameraIP){
   $("camStatus").innerText="ONLINE";
   $("camStatus").className="badge on";

   $("camIP").innerText=d.cameraIP;

   if(camIP!==d.cameraIP){
    camIP=d.cameraIP;
    startCamera();
   }
  }else{
   $("camStatus").innerText="OFFLINE";
   $("camStatus").className="badge off";
  }

  if(lastRecordCount!==d.records){
   lastRecordCount=d.records;
   loadLogs();
  }
 })
 .catch(()=>{
  $("status").innerText="OFFLINE";
  $("status").className="badge off";
 });
};

document.addEventListener("visibilitychange",()=>{
 if(document.hidden)stopDrive(null);
});

window.addEventListener("blur",()=>{
 stopDrive(null);
});

window.onload=()=>{
 syncTime();
 updateState();
 loadLogs();

 setInterval(updateState,1000);
 setInterval(syncTime,60000);
};
</script>

</body>
</html>
)UGRV";

// =================================================
// ROUTES
// =================================================
void webRoutes(){
  server.on("/",HTTP_GET,[](){
    server.send_P(200,"text/html",PAGE);
  });

  server.on("/state",HTTP_GET,[](){
    server.sendHeader("Cache-Control","no-store");
    server.send(200,"application/json",stateJSON());
  });

  server.on("/logs",HTTP_GET,[](){
    server.sendHeader("Cache-Control","no-store");
    server.send(200,"application/json",logsJSON());
  });

  // ================= TIME SYNC =================
  server.on("/syncTime",HTTP_GET,[](){
    if(!server.hasArg("epoch")){
      server.send(400,"text/plain","NO EPOCH");
      return;
    }

    uint64_t epoch=
      strtoull(
        server.arg("epoch").c_str(),
        nullptr,
        10
      );

    long offset=21600;

    if(server.hasArg("offset"))
      offset=server.arg("offset").toInt();

    if(epoch<1600000000ULL){
      server.send(400,"text/plain","INVALID TIME");
      return;
    }

    syncClock(epoch,offset);

    server.send(200,"text/plain","TIME_SYNCED");
  });

  // ================= DOWNLOAD CSV =================
  server.on("/download",HTTP_GET,[](){
    if(!fsOK || !LittleFS.exists(LOG_FILE)){
      server.send(404,"text/plain","No log file");
      return;
    }

    File f=LittleFS.open(LOG_FILE,FILE_READ);

    if(!f){
      server.send(500,"text/plain","File open failed");
      return;
    }

    server.sendHeader(
      "Content-Disposition",
      "attachment; filename=UGRV_Sonar_Log.csv"
    );

    server.sendHeader(
      "Cache-Control",
      "no-store"
    );

    server.streamFile(f,"text/csv");

    f.close();
  });

  // ================= CLEAR DATA =================
  server.on("/clear",HTTP_POST,[](){
    if(!fsOK){
      server.send(500,"text/plain","Storage unavailable");
      return;
    }

    if(LittleFS.exists(LOG_FILE))
      LittleFS.remove(LOG_FILE);

    File f=LittleFS.open(LOG_FILE,FILE_WRITE);

    if(f){
      f.println(
        "Date,Time,Left Distance (cm),Right Distance (cm)"
      );

      f.close();
    }

    File check=LittleFS.open(LOG_FILE,FILE_READ);

    logBytes=check?check.size():0;

    if(check)
      check.close();

    totalRecords=0;
    recentHead=0;
    recentCount=0;
    storageFull=false;
    lastLog=0;

    Serial.println("All logger data cleared");

    server.send(200,"text/plain","CLEARED");
  });

  // ================= MOTOR =================
  server.on("/cmd",HTTP_GET,[](){
    if(server.hasArg("m")&&server.arg("m").length()){
      char c=server.arg("m")[0];

      if(c=='F'||c=='B'||c=='L'||c=='R'||c=='S')
        drive(c);
    }

    server.send(200,"text/plain","OK");
  });

  server.on("/speed",HTTP_GET,[](){
    if(server.hasArg("v")){
      speedPct=constrain(
        server.arg("v").toInt(),
        0,
        100
      );

      motorSpeed();
    }

    server.send(200,"text/plain","OK");
  });

  server.on("/servo",HTTP_GET,[](){
    if(server.hasArg("a"))
      servoWrite(
        server.arg("a").toInt()
      );

    server.send(200,"text/plain","OK");
  });

  // ================= CAMERA =================
  server.on("/register",HTTP_POST,[](){
    String body=server.arg("plain");
    String ip=jsonValue(body,"ip");

    if(ip.length()){
      cameraIP=ip;
      cameraID=jsonValue(body,"id");
      cameraName=jsonValue(body,"name");
      cameraSeen=millis();

      Serial.println("\nCAMERA REGISTERED");
      Serial.print("IP: ");
      Serial.println(cameraIP);
    }

    server.sendHeader(
      "Access-Control-Allow-Origin",
      "*"
    );

    server.send(
      200,
      "text/plain",
      "SV_REGISTERED"
    );
  });

  server.on("/heartbeat",HTTP_GET,[](){
    if(server.hasArg("ip"))
      cameraIP=server.arg("ip");

    if(server.hasArg("id"))
      cameraID=server.arg("id");

    cameraSeen=millis();

    server.sendHeader(
      "Access-Control-Allow-Origin",
      "*"
    );

    server.send(
      200,
      "text/plain",
      "SV_ALIVE"
    );
  });

  server.onNotFound([](){
    server.send(404,"text/plain","Not Found");
  });
}

// =================================================
// SETUP
// =================================================
void setup(){
  Serial.begin(115200);
  delay(300);

  pinMode(IN1,OUTPUT);
  pinMode(IN2,OUTPUT);
  pinMode(IN3,OUTPUT);
  pinMode(IN4,OUTPUT);

  pinMode(L_TRIG,OUTPUT);
  pinMode(L_ECHO,INPUT);
  pinMode(R_TRIG,OUTPUT);
  pinMode(R_ECHO,INPUT);

  digitalWrite(IN1,LOW);
  digitalWrite(IN2,LOW);
  digitalWrite(IN3,LOW);
  digitalWrite(IN4,LOW);

  digitalWrite(L_TRIG,LOW);
  digitalWrite(R_TRIG,LOW);

  // ESP32 Arduino Core 3.x
  if(!ledcAttach(ENA,MOTOR_FREQ,MOTOR_RES))
    Serial.println("ENA PWM ERROR");

  if(!ledcAttach(ENB,MOTOR_FREQ,MOTOR_RES))
    Serial.println("ENB PWM ERROR");

  if(!ledcAttach(SERVO_PIN,SERVO_FREQ,SERVO_RES))
    Serial.println("SERVO PWM ERROR");

  motorSpeed();
  servoWrite(90);
  drive('S');

  // ================= STORAGE =================
  initStorage();

  // ================= AP =================
  WiFi.mode(WIFI_AP);
  WiFi.setSleep(false);

  WiFi.softAPConfig(
    AP_IP,
    AP_GW,
    AP_MASK
  );

  WiFi.softAP(
    AP_SSID,
    AP_PASS
  );

  // ================= WEB =================
  webRoutes();
  server.begin();

  Serial.println();
  Serial.println("================================");
  Serial.println("      UGRV SMART CAR READY");
  Serial.println("================================");

  Serial.print("AP        : ");
  Serial.println(AP_SSID);

  Serial.print("PASSWORD  : ");
  Serial.println(AP_PASS);

  Serial.print("DASHBOARD : http://");
  Serial.println(WiFi.softAPIP());

  Serial.print("RECORDS   : ");
  Serial.println(totalRecords);

  Serial.print("LOG USED  : ");
  Serial.print(logBytes/1024.0,1);
  Serial.println(" KB");

  Serial.print("LOG LIMIT : ");
  Serial.print(maxLogBytes/1024.0,1);
  Serial.println(" KB");

  Serial.println("LOG EVERY : 20 sec");
  Serial.println("TIME      : Open dashboard to sync");
  Serial.println("================================");
}

// =================================================
// LOOP
// =================================================
void loop(){
  server.handleClient();

  updateSonar();
  updateLogger();

  if(direction!='S'&&millis()-lastDrive>FAILSAFE)
    drive('S');

  delay(2);
}
