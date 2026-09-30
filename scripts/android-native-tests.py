"""Run instrumented native tests and capture real emulator phone/tablet screens in CI."""
import json, os, subprocess, time
from pathlib import Path
sdk=Path(os.environ['ANDROID_HOME']);api=os.environ.get('TEST_ANDROID_API','36');adb=str(sdk/'platform-tools/adb')
out=Path('test-results/android-native');out.mkdir(parents=True,exist_ok=True)
root=Path('android/.native-avd').resolve();root.mkdir(parents=True,exist_ok=True)
env={**os.environ,'ANDROID_AVD_HOME':str(root)}
def run(*args,timeout=60):return subprocess.check_output(args,text=True,timeout=timeout).strip()
subprocess.run(['avdmanager','create','avd','--force','--name','EksaarNative','--path',str(root/'EksaarNative.avd'),'--package',f'system-images;android-{api};google_apis;x86_64'],input='no\n',text=True,check=True,env=env)
with (out/'emulator.log').open('w') as log:
 process=subprocess.Popen([str(sdk/'emulator/emulator'),'-avd','EksaarNative','-no-window','-no-audio','-no-boot-anim','-no-snapshot','-gpu','software','-accel','on'],env=env,stdout=log,stderr=subprocess.STDOUT)
 try:
  for _ in range(120):
   if process.poll() is not None:raise RuntimeError('Emulator stopped during startup')
   if '\tdevice' in run(adb,'devices') and run(adb,'shell','getprop','sys.boot_completed')=='1':break
   time.sleep(2)
  else:raise RuntimeError('Emulator boot timed out')
  # These are disposable Google APIs debug emulators. Root allows radio control on API 24.
  run(adb,'root');run(adb,'wait-for-device')
  run(adb,'shell','input','keyevent','82')
  for apk in ['android/app/build/outputs/apk/debug/app-debug.apk','android/app/build/outputs/apk/androidTest/debug/app-debug-androidTest.apk']:run(adb,'install','-r',apk,timeout=120)
  # Disable networking: every calculation, city search and saved-date test must still work.
  run(adb,'shell','svc','wifi','disable');run(adb,'shell','svc','data','disable')
  result=run(adb,'shell','am','instrument','-w','-r','-e','class','com.eksaar.panchang.NativeExperienceTest','com.eksaar.panchang.test/androidx.test.runner.AndroidJUnitRunner',timeout=600)
  (out/'instrumentation.txt').write_text(result)
  assert 'OK (4 tests)' in result,result
  import xml.etree.ElementTree as ET
  def hierarchy():
   run(adb,'shell','uiautomator','dump','/sdcard/native-screen.xml');return run(adb,'shell','cat','/sdcard/native-screen.xml')
  def click_tab(name):
   tree=ET.fromstring(hierarchy());matches=[x for x in tree.iter('node') if x.get('resource-id')==f'com.eksaar.panchang:id/tab_{name}'];assert matches,name
   import re
   l,t,r,b=map(int,re.findall(r'\d+',matches[0].get('bounds')));run(adb,'shell','input','tap',str((l+r)//2),str((t+b)//2))
  for label,size,density,font in [('phone','1080x1920','420','1.0'),('tablet','1600x2560','240','1.0'),('large-text','1080x1920','420','1.5'),('landscape','1920x1080','420','1.0')]:
   run(adb,'shell','wm','size',size);run(adb,'shell','wm','density',density);run(adb,'shell','settings','put','system','font_scale',font);run(adb,'shell','am','force-stop','com.eksaar.panchang');run(adb,'shell','am','start','-W','-n','com.eksaar.panchang/.MainActivity');time.sleep(4)
   for tab in ['today','month','timings','personal','settings']:
    click_tab(tab);time.sleep(3);xml=hierarchy();(out/f'{label}-{tab}.xml').write_text(xml);(out/f'{label}-{tab}.png').write_bytes(subprocess.check_output([adb,'exec-out','screencap','-p'],timeout=30));assert 'android.webkit.WebView' not in xml;assert 'EKSAAR PANCHANG' in xml
  (out/'evidence.json').write_text(json.dumps({'androidAPI':int(api),'instrumentedTests':4,'network':'disabled','screens':'Native emulator pixels; phone, tablet, landscape and large text'},indent=2))
 finally:
  try:(out/'last-screen.png').write_bytes(subprocess.check_output([adb,'exec-out','screencap','-p'],timeout=20))
  except Exception:pass
  try:(out/'logcat.txt').write_text(run(adb,'logcat','-d','-t','1500',timeout=30))
  except Exception:pass
  subprocess.run([adb,'emu','kill'],stdout=subprocess.DEVNULL,stderr=subprocess.DEVNULL,timeout=20)
  try:process.wait(timeout=20)
  except subprocess.TimeoutExpired:process.terminate()
