"""Exercise real native screens on Apple's disposable iPhone/iPad simulators."""
import json,subprocess,re,shutil,os,signal,threading,sys
from pathlib import Path

def output(*args):return subprocess.check_output(args,text=True,timeout=60).strip()
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
requested=sys.argv[1:]
assert set(requested)<=set(['iPhone','iPad','iPadAir']),'Unknown simulator selection'
for label,match in [('iPhone',lambda n:'iPhone' in n and 'Pro Max' in n),('iPad',lambda n:'iPad Pro' in n and '13-inch' in n),('iPadAir',lambda n:'iPad Air' in n and '11-inch' in n)]:
    if requested and label not in requested:continue
    device=next((d for _,d in devices if match(d['name'])),None)
    assert device,f'No {label} simulator installed'
    udid=device['udid'];folder=out/label;folder.mkdir(exist_ok=True)
    try:
        print(f"Preparing {label}: {device['name']}",flush=True)
        if device['state']!='Booted':subprocess.run(['xcrun','simctl','boot',udid],check=True,timeout=120)
        subprocess.run(['xcrun','simctl','bootstatus',udid,'-b'],check=True,timeout=600)
        subprocess.run(['xcrun','simctl','status_bar',udid,'override','--time','9:41','--batteryState','charged','--batteryLevel','100'],check=False)
        print(f'Running native UI tests on {label}',flush=True)
        def run_tests(log_name,result_name):
            with (folder/log_name).open('w') as log:
                result=subprocess.Popen(['xcodebuild','-project','ios/App/App.xcodeproj','-scheme','App','-configuration','Debug','-destination',f'platform=iOS Simulator,id={udid}','-derivedDataPath','ios/build','-resultBundlePath',str(folder/result_name),'-parallel-testing-enabled','NO','-test-timeouts-enabled','YES','-default-test-execution-time-allowance','600','-maximum-test-execution-time-allowance','600','CODE_SIGNING_ALLOWED=NO','test-without-building'],stdout=subprocess.PIPE,stderr=subprocess.STDOUT,text=True,start_new_session=True)
                finished=threading.Event()
                def bound_runner(result=result,finished=finished,label=label,folder=folder):
                    if finished.wait(900):return
                    print(f'{label}: Xcode exceeded 15 minutes; preserving diagnostics.',flush=True)
                    # A stalled accessibility call can outlive XCTest's own timeout.
                    # Sample only this disposable test app before stopping the runner.
                    pids=subprocess.run(['pgrep','-x','App'],capture_output=True,text=True).stdout.split()
                    for pid in pids:
                        try:subprocess.run(['sample',pid,'3','-file',str(folder/f'app-hang-{pid}.txt')],timeout=15,check=False,stdout=subprocess.DEVNULL,stderr=subprocess.DEVNULL)
                        except subprocess.TimeoutExpired:pass
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
            return result.returncode
        attempts=[]
        log_name='test.log'
        exit_code=run_tests(log_name,'NativeTests.xcresult')
        attempts.append({'log':log_name,'exitCode':exit_code})
        text=(folder/log_name).read_text()
        # Retry only a simulator accessibility startup failure before any test ran.
        # Preserve both attempts; never retry or hide an app assertion failure here.
        if exit_code and 'Timed out waiting for AX loaded notification' in text and 'Test Case' not in text:
            print(f'{label}: XCTest accessibility did not initialize; retrying once on the warmed simulator.',flush=True)
            log_name='test-startup-retry.log'
            exit_code=run_tests(log_name,'NativeTests-startup-retry.xcresult')
            attempts.append({'log':log_name,'exitCode':exit_code})
        print(label,device['name'],'test exit',exit_code,flush=True)
        if exit_code:
            failed=True
            text=(folder/log_name).read_text();print('\n'.join(line for line in text.splitlines() if any(s in line for s in ['error:','failed','Failure','XCTAssert'])),flush=True)
            try:subprocess.run(['xcrun','simctl','io',udid,'screenshot',str(folder/'failure-screen.png')],timeout=20,check=False)
            except subprocess.TimeoutExpired:pass
        # Keep exact failure screenshots and logs from the moment of assertion,
        # rather than only the simulator home screen after XCTest terminates.
        if exit_code:
            reports=folder/'crash-reports';reports.mkdir(exist_ok=True)
            for crash in (Path.home()/'Library/Logs/DiagnosticReports').glob('*'):
                if crash.is_file() and crash.name.startswith(('App-','App_','NativeUITests','JetsamEvent')):
                    shutil.copy2(crash,reports/crash.name)
        for bundle in folder.glob('*.xcresult'):
            try:
                subprocess.run(['xcrun','xcresulttool','export','attachments','--path',str(bundle),'--output-path',str(folder/(bundle.stem+'-attachments'))],check=False,timeout=90,stdout=subprocess.DEVNULL)
            except subprocess.TimeoutExpired:pass
        try:
            data=Path(output('xcrun','simctl','get_app_container',udid,'com.eksaar.panchang.uitests.xctrunner','data'))
            source=data/'Documents/StoreScreenshots'
            if source.exists():shutil.copytree(source,folder/'screenshots',dirs_exist_ok=True)
        except (subprocess.CalledProcessError,subprocess.TimeoutExpired):pass
        evidence.append({'device':device['name'],'source':'Actual native SwiftUI app and XCTest UI tests','xcode':version,'exitCode':exit_code,'attempts':attempts,'screenshots':sorted(p.name for p in (folder/'screenshots').glob('*.png'))})
    except (subprocess.CalledProcessError,subprocess.TimeoutExpired) as error:
        failed=True
        evidence.append({'device':device['name'],'error':str(error),'exitCode':1})
        print(f'{label}: simulator operation failed: {error}',flush=True)
    finally:
        (out/'evidence.json').write_text(json.dumps(evidence,indent=2)+'\n')
        try:subprocess.run(['xcrun','simctl','shutdown',udid],check=False,timeout=30)
        except subprocess.TimeoutExpired:print(f'{label}: simulator shutdown timed out',flush=True)
    if failed:break
(out/'evidence.json').write_text(json.dumps(evidence,indent=2)+'\n')
assert not failed,'Native UI tests failed; see test.log and xcresult'
