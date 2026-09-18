"""Capture the real Android app on fresh virtual phone/tablet displays in CI."""
import json, os, re, subprocess, time
from pathlib import Path

sdk=Path(os.environ['ANDROID_HOME'])
adb=str(sdk/'platform-tools/adb')
out=Path('store-release/android-screenshots');out.mkdir(parents=True,exist_ok=True)
avd_home=Path('android/.store-avd').resolve();avd_home.mkdir(parents=True,exist_ok=True)
emulator_env={**os.environ,'ANDROID_AVD_HOME':str(avd_home)}
def run(*args,timeout=60):
    return subprocess.check_output(args,text=True,timeout=timeout).strip()

subprocess.run(['avdmanager','create','avd','--force','--name','EksaarStore','--path',str(avd_home/'EksaarStore.avd'),'--package','system-images;android-36;google_apis;x86_64'],input='no\n',text=True,check=True,timeout=60,env=emulator_env)
with (out/'emulator.log').open('w') as log:
    emulator=subprocess.Popen([str(sdk/'emulator/emulator'),'-avd','EksaarStore','-no-window','-no-audio','-no-boot-anim','-no-snapshot','-gpu','software','-accel','on'],stdout=log,stderr=subprocess.STDOUT,env=emulator_env)
    try:
        for _ in range(90):
            if emulator.poll() is not None:raise RuntimeError('Emulator exited before connecting.')
            if '\tdevice' in run(adb,'devices'):break
            time.sleep(2)
        else:raise RuntimeError('Android did not connect within 180 seconds.')
        for _ in range(90):
            if run(adb,'shell','getprop','sys.boot_completed')=='1':break
            if emulator.poll() is not None:raise RuntimeError('Emulator exited before boot completed.')
            time.sleep(2)
        else:raise RuntimeError('Android did not boot within 180 seconds.')
        run(adb,'shell','input','keyevent','82')
        run(adb,'install','-r','android/app/build/outputs/apk/debug/app-debug.apk',timeout=120)
        evidence=[]
        for label,size,density in [('phone-portrait','1080x1920','420'),('phone-landscape','1920x1080','420'),('tablet-portrait','1600x2560','240')]:
            run(adb,'shell','wm','size',size)
            run(adb,'shell','wm','density',density)
            run(adb,'shell','am','force-stop','com.eksaar.panchang')
            run(adb,'shell','am','start','-W','-n','com.eksaar.panchang/.MainActivity')
            width,height=map(int,size.split('x'))
            # Scroll the real app to its calendar content; a landscape screen at
            # the page top otherwise shows only the tall introductory header.
            time.sleep(10)
            run(adb,'shell','input','swipe',str(width//2),str(int(height*.85)),str(width//2),str(int(height*.22)),'550')
            for frame in range(1,4 if label=='phone-portrait' else 2):
                file=out/f'{label}-{frame}.png'
                for attempt in range(12):
                    time.sleep(5)
                    file.write_bytes(subprocess.check_output([adb,'exec-out','screencap','-p'],timeout=30))
                    check=json.loads(run('node','scripts/check-native-capture.mjs',str(file)))
                    if not check['hasAppContent']:
                        # Light content panels have no large green card. Confirm
                        # actual app text in Android's accessibility hierarchy.
                        run(adb,'shell','uiautomator','dump','/sdcard/eksaar-capture.xml')
                        hierarchy=run(adb,'shell','cat','/sdcard/eksaar-capture.xml')
                        (out/f'{label}-{frame}-accessibility.xml').write_text(hierarchy)
                        check['hasAccessibleAppText']=bool(re.search(r'Panchang|Paksha|Muhurta|NAKSHATRA|Sunrise',hierarchy))
                        check['hasAppContent']=check['hasAccessibleAppText']
                    if check['hasAppContent']:break
                    # A loaded header can still occupy a short landscape view.
                    if attempt==2:
                        run(adb,'shell','input','swipe',str(width//2),str(int(height*.85)),str(width//2),str(int(height*.22)),'550')
                assert check['hasAppContent'],f'{label} frame {frame} never displayed app content.'
                evidence.append({'file':file.name,'displaySize':size,'density':density,'androidAPI':36,'source':'Actual native Android app, scrolled in a fresh emulator; original pixels','contentCheck':check})
                run(adb,'shell','input','swipe',str(width//2),str(int(height*.78)),str(width//2),str(int(height*.48)),'500')
        (out/'capture-evidence.json').write_text(json.dumps(evidence,indent=2)+'\n')
    except Exception:
        log.flush()
        print((out/'emulator.log').read_text()[-16000:],flush=True)
        raise
    finally:
        subprocess.run([adb,'emu','kill'],stdout=subprocess.DEVNULL,stderr=subprocess.DEVNULL,timeout=20)
        try:emulator.wait(timeout=20)
        except subprocess.TimeoutExpired:emulator.terminate()
