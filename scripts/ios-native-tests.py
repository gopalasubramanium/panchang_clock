"""Exercise real native screens on Apple's disposable iPhone/iPad simulators."""
import json,subprocess,re,shutil,os,signal,threading
from pathlib import Path

def output(*args):return subprocess.check_output(args,text=True).strip()
# Verify the native decoder, backup validation and scientific engine in JavaScriptCore.
core=Path('ios/native-core-checks');core.mkdir(parents=True,exist_ok=True)
shutil.copyfile('scripts/native-core-checks.swift',core/'main.swift')
subprocess.run(['xcrun','swiftc','ios/App/App/NativeModels.swift',str(core/'main.swift'),'-o',str(core/'check')],check=True)
subprocess.run([str(core/'check')],check=True)
version=output('xcodebuild','-version')
assert int(re.search(r'Xcode (\d+)',version).group(1))>=26
catalog=json.loads(output('xcrun','simctl','list','devices','available','--json'))['devices']
devices=[]
for runtime,items in catalog.items():
    if '.iOS-' in runtime:
        rank=tuple(map(int,re.findall(r'\d+',runtime)))
        devices.extend((rank,d) for d in items if d.get('isAvailable',True))
devices.sort(key=lambda item:(item[0],item[1]['name']),reverse=True)
out=Path('store-release/ios-native');out.mkdir(parents=True,exist_ok=True)
evidence=[];failed=False
for label,match in [('iPhone',lambda n:'iPhone' in n and 'Pro Max' in n),('iPad',lambda n:'iPad Pro' in n and '13-inch' in n),('iPadAir',lambda n:'iPad Air' in n and '11-inch' in n)]:
    device=next((d for _,d in devices if match(d['name'])),None)
    assert device,f'No {label} simulator installed'
    udid=device['udid'];folder=out/label;folder.mkdir(exist_ok=True)
    try:
        print(f"Preparing {label}: {device['name']}",flush=True)
        if device['state']!='Booted':subprocess.run(['xcrun','simctl','boot',udid],check=True,timeout=120)
        subprocess.run(['xcrun','simctl','bootstatus',udid,'-b'],check=True,timeout=600)
        subprocess.run(['xcrun','simctl','status_bar',udid,'override','--time','9:41','--batteryState','charged','--batteryLevel','100'],check=False)
        print(f'Running native UI tests on {label}',flush=True)
        with (folder/'test.log').open('w') as log:
            result=subprocess.Popen(['xcodebuild','-project','ios/App/App.xcodeproj','-scheme','App','-configuration','Debug','-destination',f'platform=iOS Simulator,id={udid}','-derivedDataPath','ios/build','-resultBundlePath',str(folder/'NativeTests.xcresult'),'-parallel-testing-enabled','NO','-test-timeouts-enabled','YES','-default-test-execution-time-allowance','240','-maximum-test-execution-time-allowance','300','CODE_SIGNING_ALLOWED=NO','test-without-building'],stdout=subprocess.PIPE,stderr=subprocess.STDOUT,text=True,start_new_session=True)
            finished=threading.Event()
            def bound_runner(result=result,finished=finished,label=label):
                if finished.wait(900):return
                print(f'{label}: Xcode exceeded 15 minutes; preserving diagnostics.',flush=True)
                try:os.killpg(result.pid,signal.SIGINT)
                except ProcessLookupError:return
                if not finished.wait(45):
                    try:os.killpg(result.pid,signal.SIGKILL)
                    except ProcessLookupError:pass
            threading.Thread(target=bound_runner,daemon=True).start()
            for line in result.stdout:
                log.write(line);log.flush()
                if any(s in line for s in ['Test Case','Test Suite','Start Test','error:','XCTAssert','notification not received','TEST SUCCEEDED','TEST FAILED']):print(line.rstrip(),flush=True)
            result.wait();finished.set()
        print(label,device['name'],'test exit',result.returncode,flush=True)
        if result.returncode:
            failed=True
            text=(folder/'test.log').read_text();print('\n'.join(line for line in text.splitlines() if any(s in line for s in ['error:','failed','Failure','XCTAssert'])),flush=True)
            try:subprocess.run(['xcrun','simctl','io',udid,'screenshot',str(folder/'failure-screen.png')],timeout=20,check=False)
            except subprocess.TimeoutExpired:pass
        try:
            data=Path(output('xcrun','simctl','get_app_container',udid,'com.eksaar.panchang.uitests.xctrunner','data'))
            source=data/'Documents/StoreScreenshots'
            if source.exists():shutil.copytree(source,folder/'screenshots',dirs_exist_ok=True)
        except subprocess.CalledProcessError:pass
        evidence.append({'device':device['name'],'source':'Actual native SwiftUI app and XCTest UI tests','xcode':version,'exitCode':result.returncode,'screenshots':sorted(p.name for p in (folder/'screenshots').glob('*.png'))})
    finally:
        subprocess.run(['xcrun','simctl','shutdown',udid],check=False)
    if failed:break
(out/'evidence.json').write_text(json.dumps(evidence,indent=2)+'\n')
assert not failed,'Native UI tests failed; see test.log and xcresult'
