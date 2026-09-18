"""Capture the real Android app on fresh virtual phone/tablet displays in CI."""
import json, os, subprocess, time
from pathlib import Path

sdk=Path(os.environ['ANDROID_HOME'])
adb=str(sdk/'platform-tools/adb')
out=Path('store-release/android-screenshots');out.mkdir(parents=True,exist_ok=True)
def run(*args,timeout=60):
    return subprocess.check_output(args,text=True,timeout=timeout).strip()

subprocess.run(['avdmanager','create','avd','--force','--name','EksaarStore','--package','system-images;android-36;google_apis;x86_64'],input='no\n',text=True,check=True,timeout=60)
with (out/'emulator.log').open('w') as log:
    emulator=subprocess.Popen([str(sdk/'emulator/emulator'),'-avd','EksaarStore','-no-window','-no-audio','-no-boot-anim','-no-snapshot','-gpu','software','-accel','on'],stdout=log,stderr=subprocess.STDOUT)
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
            file=out/f'{label}.png'
            for attempt in range(12):
                time.sleep(5)
                file.write_bytes(subprocess.check_output([adb,'exec-out','screencap','-p'],timeout=30))
                check=json.loads(run('node','scripts/check-native-capture.mjs',str(file)))
                if check['hasAppContent']:break
            assert check['hasAppContent'],f'{label} never displayed app content.'
            evidence.append({'file':file.name,'displaySize':size,'density':density,'androidAPI':36,'source':'Actual native Android app on a fresh emulator; original pixels','contentCheck':check})
        (out/'capture-evidence.json').write_text(json.dumps(evidence,indent=2)+'\n')
    except Exception:
        log.flush()
        print((out/'emulator.log').read_text()[-16000:],flush=True)
        raise
    finally:
        subprocess.run([adb,'emu','kill'],stdout=subprocess.DEVNULL,stderr=subprocess.DEVNULL,timeout=20)
        try:emulator.wait(timeout=20)
        except subprocess.TimeoutExpired:emulator.terminate()
